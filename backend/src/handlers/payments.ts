import axios from "axios";
import { Router } from "express";
import platformAPIClient from "../services/platformAPIClient";
import "../types/session";

/**
 * Эндпоинты платежей для Pi Platform.
 * ВАЖНО: фронтенд должен сначала создать заказ через /payments/create,
 * потом запускать Pi.createPayment с metadata.orderId = вернувшемуся orderId.
 */
export default function mountPaymentsEndpoints(router: Router) {

  // ============================================================
  // 1) Создать заказ (делаем запись в БД ДО запуска окна оплаты)
  // ============================================================
  router.post("/create", async (req, res) => {
    try {
      // Требуем авторизацию (на сервере должна быть сессия пользователя)
      if (!req.session.currentUser) {
        return res.status(401).json({ error: "unauthorized", message: "Нужно войти" });
      }

      const { amount, productId, description } = req.body as {
        amount: number;
        productId?: string;     // твой внутренний идентификатор товара/услуги
        description?: string;   // что покупает пользователь
      };

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "bad_request", message: "Некорректная сумма" });
      }

      const app = req.app;
      const orderCollection = app.locals.orderCollection;

      // Создаём черновик заказа
      const doc = {
        user: req.session.currentUser.uid,
        amount,
        product_id: productId || "ACCESS_PRO", // подставь дефолт или требуй строго
        description: description || "Покупка доступа",
        pi_payment_id: null as string | null,   // появится после approve
        txid: null as string | null,            // появится после complete
        status: "created" as "created" | "approved" | "completed" | "cancelled",
        created_at: new Date()
      };

      const { insertedId } = await orderCollection.insertOne(doc);
      return res.status(200).json({ orderId: String(insertedId) });

    } catch (err) {
      console.error("Создание заказа: ", err);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // =================================================================
  // 2) APPROVE — кошелёк готов, сервер должен подтвердить готовность
  //    Здесь ПРОВЕРЯЕМ, что платёж от Pi соответствует нашему заказу
  // =================================================================
  router.post("/approve", async (req, res) => {
    if (!req.session.currentUser) {
      return res.status(401).json({ error: "unauthorized", message: "Нужно войти" });
    }

    try {
      const { paymentId, orderId } = req.body as { paymentId: string; orderId?: string };
      if (!paymentId) return res.status(400).json({ error: "bad_request", message: "paymentId обязателен" });

      const app = req.app;
      const orderCollection = app.locals.orderCollection;

      // 2.1 Берём данные платежа у Pi Platform
      const { data: payment } = await platformAPIClient.get(`/v2/payments/${paymentId}`);

      // 2.2 Привязываем к заказу — либо по явному orderId, либо из metadata
      const metaOrderId = orderId || payment?.metadata?.orderId;
      if (!metaOrderId) {
        return res.status(400).json({ error: "bad_request", message: "orderId не найден в запросе/metadata" });
      }

      const order = await orderCollection.findOne({ _id: orderCollection.pkFactory?.isObjectId ? metaOrderId : undefined } as any) 
                 || await orderCollection.findOne({ _id: metaOrderId as any }); // совместимость, если не ObjectId

      if (!order) {
        return res.status(404).json({ error: "not_found", message: "Заказ не найден" });
      }

      // 2.3 ВАЛИДАЦИИ (минимум):
      //   — сумма платежа совпадает с заказом
      //   — платёжный пользователь = текущий пользователь (если есть такая инфа)
      const amountMatches = Number(payment?.amount) === Number(order.amount);
      if (!amountMatches) {
        return res.status(400).json({ error: "mismatch", message: "Сумма платежа не совпадает с заказом" });
      }

      // (опционально) проверка мемо, получателя и т.п. — добавляй при необходимости

      // 2.4 Обновляем заказ и отправляем approve на Pi
      await orderCollection.updateOne(
        { _id: order._id },
        { $set: { pi_payment_id: paymentId, status: "approved" } }
      );

      await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);
      return res.status(200).json({ message: `Approved ${paymentId}` });

    } catch (err) {
      console.error("Approve error:", err);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // ======================================================================================
  // 3) COMPLETE — сервер подтверждает завершение, когда есть транзакция (txid) в блокчейне
  //    Здесь можно ДОПОЛНИТЕЛЬНО проверить транзакцию через Horizon по ссылке payment._link
  // ======================================================================================
  router.post("/complete", async (req, res) => {
    try {
      const { paymentId, txid } = req.body as { paymentId: string; txid?: string };
      if (!paymentId) return res.status(400).json({ error: "bad_request", message: "paymentId обязателен" });

      const app = req.app;
      const orderCollection = app.locals.orderCollection;

      const order = await orderCollection.findOne({ pi_payment_id: paymentId });
      if (!order) {
        return res.status(404).json({ error: "not_found", message: "Заказ не найден для этого платежа" });
      }

      // (опционально) проверим мемо на блокчейне, если есть URL:
      // const { data: payment } = await platformAPIClient.get(`/v2/payments/${paymentId}`);
      // const txURL = payment?.transaction?._link;
      // if (txURL) {
      //   const hr = await axios.get(txURL, { timeout: 20000 });
      //   // hr.data.memo должно совпадать с ожидаемой меткой/ID — добавь свою проверку
      // }

      await orderCollection.updateOne(
        { _id: order._id },
        { $set: { txid: txid || null, status: "completed" } }
      );

      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });
      return res.status(200).json({ message: `Completed ${paymentId}` });

    } catch (err) {
      console.error("Complete error:", err);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // ======================================================================================
  // 4) Обработка НЕЗАВЕРШЁННОГО платежа (SDK может прислать при авторизации пользователя)
  // ======================================================================================
  router.post("/incomplete", async (req, res) => {
    try {
      const payment = req.body.payment;
      const paymentId = payment?.identifier;
      if (!paymentId) {
        return res.status(400).json({ error: "bad_request", message: "Нет payment.identifier" });
      }

      const app = req.app;
      const orderCollection = app.locals.orderCollection;

      const order = await orderCollection.findOne({ pi_payment_id: paymentId });
      if (!order) {
        // Если заказа нет — можно создать/восстановить его по metadata (если она есть)
        return res.status(404).json({ error: "not_found", message: "Заказ для этого платежа не найден" });
      }

      // На этом шаге обычно либо повторяем approve/complete, либо только complete, если уже есть txid
      if (payment?.transaction?.txid) {
        await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid: payment.transaction.txid });
        await orderCollection.updateOne(
          { _id: order._id },
          { $set: { txid: payment.transaction.txid, status: "completed" } }
        );
      } else {
        await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);
        await orderCollection.updateOne(
          { _id: order._id },
          { $set: { status: "approved" } }
        );
      }

      return res.status(200).json({ message: `Handled incomplete ${paymentId}` });

    } catch (err) {
      console.error("Incomplete error:", err);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // =========================================
  // 5) Пользователь отменил платёж в кошельке
  // =========================================
  router.post("/cancelled_payment", async (req, res) => {
    try {
      const { orderId, paymentId } = req.body as { orderId?: string; paymentId?: string };

      const app = req.app;
      const orderCollection = app.locals.orderCollection;

      // помечаем либо по orderId, либо по pi_payment_id
      if (orderId) {
        await orderCollection.updateOne({ _id: orderId as any }, { $set: { status: "cancelled" } });
      } else if (paymentId) {
        await orderCollection.updateOne({ pi_payment_id: paymentId }, { $set: { status: "cancelled" } });
      }

      return res.status(200).json({ message: "Отменено" });
    } catch (err) {
      console.error("Cancel error:", err);
      return res.status(500).json({ error: "server_error" });
    }
  });

}
