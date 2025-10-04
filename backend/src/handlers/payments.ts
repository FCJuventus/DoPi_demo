import axios from "axios";
import { Router } from "express";
import platformAPIClient from "../services/platformAPIClient";
import "../types/session";

export default function mountPaymentsEndpoints(router: Router) {
  // ===== 1) Webhook "incomplete" от Pi =====
  // Приходит, когда транзакция в сети подтверждена, но мы ещё не сказали Pi "complete".
  router.post('/incomplete', async (req, res) => {
    const payment = req.body.payment;
    const paymentId = payment.identifier;
    const txid = payment.transaction && payment.transaction.txid;
    const txURL = payment.transaction && payment.transaction._link;

    const app = req.app;
    const payments = app.locals.orderCollection; // Переиспользуем коллекцию, но уже храним как payments

    // Ищем запись о платеже у нас
    const payDoc = await payments.findOne({ pi_payment_id: paymentId });

    if (!payDoc) {
      return res.status(400).json({ message: "Payment record not found" });
    }

    // Проверяем мемо в блокчейне — должно совпадать с нашим paymentId
    const horizonResponse = await axios.create({ timeout: 20000 }).get(txURL);
    const paymentIdOnBlock = horizonResponse.data.memo;

    if (paymentIdOnBlock !== payDoc.pi_payment_id) {
      return res.status(400).json({ message: "Payment id (memo) doesn't match" });
    }

    // Дополнительно можно проверить amount:
    // const onchainAmount = Number(horizonResponse.data.amount);
    // if (onchainAmount !== payDoc.amount) { ... }

    // Отмечаем как оплаченный
    await payments.updateOne(
      { pi_payment_id: paymentId },
      { $set: { txid, paid: true } }
    );

    // Говорим Pi Platform, что платёж завершён
    await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

    return res.status(200).json({ message: `Handled incomplete payment ${paymentId}` });
  });

  // ===== 2) Approve — наш сервер готов принять платёж =====
  router.post('/approve', async (req, res) => {
    if (!req.session.currentUser) {
      return res.status(401).json({ error: 'unauthorized', message: "Нужно войти" });
    }

    const app = req.app;
    const payments = app.locals.orderCollection;

    const paymentId: string = req.body.paymentId;

    // Забираем платёж с Pi — тут же лежит metadata (мы туда положим jobId/contractId/amount)
    const currentPayment = await platformAPIClient.get(`/v2/payments/${paymentId}`);
    const md = currentPayment.data.metadata || {};

    // Простейшая валидация метаданных
    if (!md.jobId || !md.contractId || typeof md.amount !== 'number') {
      return res.status(400).json({ message: 'Некорректные metadata: нужны jobId, contractId, amount' });
    }

    // Создаём запись о платеже (idempotent — не дублируем)
    await payments.updateOne(
      { pi_payment_id: paymentId },
      {
        $setOnInsert: {
          pi_payment_id: paymentId,
          jobId: md.jobId,
          contractId: md.contractId,
          payerUid: req.session.currentUser.uid,
          amount: md.amount,
          txid: null,
          paid: false,
          cancelled: false,
          created_at: new Date()
        }
      },
      { upsert: true }
    );

    // Говорим Pi, что мы готовы
    await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);

    return res.status(200).json({ message: `Approved payment ${paymentId}` });
  });

  // ===== 3) Complete — клиент прислал txid (обычно после success из SDK) =====
  router.post('/complete', async (req, res) => {
    const app = req.app;
    const payments = app.locals.orderCollection;

    const paymentId: string = req.body.paymentId;
    const txid: string = req.body.txid;

    // Отмечаем как оплаченный, если запись уже есть
    const result = await payments.updateOne(
      { pi_payment_id: paymentId },
      { $set: { txid, paid: true } }
    );

    if (result.matchedCount === 0) {
      // На всякий случай — если не было approve (редкий случай), создадим упрощённую запись
      await payments.insertOne({
        pi_payment_id: paymentId,
        jobId: null,
        contractId: null,
        payerUid: req.session.currentUser?.uid || null,
        amount: null,
        txid,
        paid: true,
        cancelled: false,
        created_at: new Date()
      });
    }

    // Сообщаем Pi, что завершили
    await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

    return res.status(200).json({ message: `Completed payment ${paymentId}` });
  });

  // ===== 4) Отмена =====
  router.post('/cancelled_payment', async (req, res) => {
    const app = req.app;
    const payments = app.locals.orderCollection;

    const paymentId: string = req.body.paymentId;

    await payments.updateOne(
      { pi_payment_id: paymentId },
      { $set: { cancelled: true } }
    );

    return res.status(200).json({ message: `Cancelled payment ${paymentId}` });
  });
}
