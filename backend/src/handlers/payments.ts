import axios from "axios";
import { Router } from "express";
import platformAPIClient from "../services/platformAPIClient";
import "../types/session";

/**
 * Эндпоинты платежей и заказов.
 * Модель (упрощённо):
 *   orders: {
 *     orderId: string,        // строковый id заказа (String(_id))
 *     amount: number,         // сумма в Test-π
 *     memo?: string,          // описание
 *     status: 'created' | 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed',
 *     paymentId?: string,     // id платежа из Pi
 *     txid?: string,          // хеш транзакции
 *     uid?: string,           // пользователь из сессии (если был)
 *     username?: string,
 *     piPayment?: any,        // сырые данные платежа от Pi
 *     createdAt: Date,
 *     updatedAt: Date
 *   }
 */

export default function mountPaymentsEndpoints(router: Router) {
  /**
   * 1) Создание заказа перед запуском оплаты в кошельке
   * Фронтенд вызывает этот эндпоинт, получает orderId
   * и кладёт его в metadata при вызове Pi.createPayment(...)
   */
  router.post('/create', async (req, res) => {
    try {
      const orders = req.app.locals.orderCollection as any;

      const { amount, memo } = req.body;
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount обязателен и должен быть > 0' });
      }

      const user = req.session?.currentUser; // может быть undefined, это не критично

      const doc = {
        amount: Number(amount),
        memo: memo || 'Order',
        status: 'created',
        uid: user?.uid,
        username: user?.username,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const ins = await orders.insertOne(doc);
      const orderId = String(ins.insertedId);
      await orders.updateOne({ _id: ins.insertedId }, { $set: { orderId } });

      return res.json({ orderId });
    } catch (e) {
      console.error('Создание заказа не удалось:', e);
      return res.status(500).json({ error: 'failed to create order' });
    }
  });

  /**
   * 2) Подтверждение платежа (кошелёк вернул paymentId)
   * Фронтенд вызывает после успешного подтверждения в приложении Pi.
   * Мы проверяем платёж у Pi, находим заказ по metadata.orderId,
   * обновляем заказ и завершаем платёж (POST /complete).
   */
  router.post('/approve', async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) {
        return res.status(400).json({ error: 'paymentId обязателен' });
      }

      // Получаем платёж с Pi Platform API — так мы убеждаемся, что paymentId настоящий.
      const { data: payment } = await platformAPIClient.get(`/v2/payments/${paymentId}`);

      // ВАЖНО: на фронте нужно положить orderId в metadata при создании платежа.
      const orderId = payment?.metadata?.orderId;
      if (!orderId) {
        // На крайний случай попробуем найти заказ по старой схеме по paymentId,
        // но правильный путь — передавать metadata.orderId из фронта.
        console.warn('В платеже нет metadata.orderId — проверь фронт.');
      }

      const orders = req.app.locals.orderCollection as any;

      // Если есть orderId — обновляем конкретный заказ, иначе (не рекомендуется) создадим запись по paymentId
      if (orderId) {
        await orders.updateOne(
          { orderId },
          {
            $set: {
              status: 'paid',
              paymentId,
              piPayment: payment,
              updatedAt: new Date()
            }
          }
        );
      } else {
        await orders.insertOne({
          orderId: null,
          amount: Number(payment?.amount ?? 0),
          memo: payment?.memo,
          status: 'paid',
          paymentId,
          piPayment: payment,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Сообщаем Pi, что наш сервер подтвердил готовность обработать платёж
      await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);

      // Сразу же завершаем платёж (можно делать и после onComplete на фронте)
      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, {});

      if (orderId) {
        await orders.updateOne(
          { orderId },
          { $set: { status: 'completed', updatedAt: new Date() } }
        );
      } else {
        await orders.updateOne(
          { paymentId },
          { $set: { status: 'completed', updatedAt: new Date() } }
        );
      }

      return res.json({ ok: true });
    } catch (e: any) {
      // Частый случай: 401/404 от Pi API (неверный/истёкший токен или неправильный ID)
      console.error('Ошибка в /payments/approve:', e?.response?.status, e?.response?.data || e);
      return res.status(401).json({ error: 'approve failed' });
    }
  });

  /**
   * 3) Отметить платёж/заказ завершённым вручную (опционально).
   * Если ты уже делаешь /complete в /approve — этот эндпоинт может не понадобиться.
   * Оставим для совместимости/отладки.
   */
  router.post('/complete', async (req, res) => {
    try {
      const { paymentId, txid } = req.body;
      if (!paymentId) return res.status(400).json({ error: 'paymentId обязателен' });

      const orders = req.app.locals.orderCollection as any;

      await orders.updateOne(
        { paymentId },
        { $set: { txid: txid || null, status: 'completed', updatedAt: new Date() } }
      );

      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      return res.json({ ok: true });
    } catch (e) {
      console.error('Ошибка в /payments/complete:', e);
      return res.status(500).json({ error: 'complete failed' });
    }
  });

  /**
   * 4) Обработка отмены
   * Лучше присылать orderId (проще найти запись), но поддержим и paymentId.
   */
  router.post('/cancelled_payment', async (req, res) => {
    try {
      const { orderId, paymentId } = req.body;
      const orders = req.app.locals.orderCollection as any;

      if (!orderId && !paymentId) {
        return res.status(400).json({ error: 'нужен orderId или paymentId' });
      }

      const filter = orderId ? { orderId } : { paymentId };
      await orders.updateOne(filter, {
        $set: { status: 'cancelled', updatedAt: new Date() }
      });

      return res.json({ ok: true });
    } catch (e) {
      console.error('Ошибка в /payments/cancelled_payment:', e);
      return res.status(500).json({ error: 'cancel failed' });
    }
  });

  /**
   * 5) (Опционально) Колбэк для "incomplete" из старых примеров.
   * Если используешь, он проверяет мемо в Horizon и завершает платёж.
   * Можно оставить для отладки, но основной поток выше уже всё делает.
   */
  router.post('/incomplete', async (req, res) => {
    try {
      const payment = req.body.payment;
      const paymentId = payment?.identifier;
      const txid = payment?.transaction?.txid;
      const txURL = payment?.transaction?._link;

      if (!paymentId || !txURL) {
        return res.status(400).json({ error: 'paymentId или txURL отсутствует' });
      }

      const orders = req.app.locals.orderCollection as any;
      const order = await orders.findOne({ paymentId });

      if (!order) {
        return res.status(400).json({ message: "Заказ не найден" });
      }

      // Простая проверка мемо в Horizon (для тестнета)
      const hRes = await axios.create({ timeout: 20000 }).get(txURL);
      const memoFromBlock = hRes?.data?.memo;
      if (memoFromBlock && memoFromBlock !== paymentId) {
        return res.status(400).json({ message: "Мемо в блоке не совпадает с paymentId" });
      }

      await orders.updateOne(
        { paymentId },
        { $set: { txid, status: 'completed', updatedAt: new Date() } }
      );

      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      return res.json({ message: `Handled incomplete payment ${paymentId}` });
    } catch (e) {
      console.error('Ошибка в /payments/incomplete:', e);
      return res.status(500).json({ error: 'incomplete failed' });
    }
  });

  /**
   * 6) Утилита для отладки — получить заказ по orderId
   */
  router.get('/orders/:orderId', async (req, res) => {
    const orders = req.app.locals.orderCollection as any;
    const order = await orders.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'not found' });
    res.json(order);
  });
}
