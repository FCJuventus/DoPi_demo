import axios from "axios";
import { Router } from "express";
import platformAPIClient from "../services/platformAPIClient";
import "../types/session";

// Комиссия платформы (можно переопределить через ENV в Render)
const APP_FEE_PCT = Number(process.env.APP_FEE_PCT ?? 0.05); // 5%
const APP_FEE_MIN = Number(process.env.APP_FEE_MIN ?? 0.01); // мин. 0.01 Test-Pi

function calcFee(budgetPi: number) {
  const pct = +(budgetPi * APP_FEE_PCT).toFixed(2);
  const fee = Math.max(pct, APP_FEE_MIN);
  const total = +(budgetPi + fee).toFixed(2);
  return { fee, total };
}

export default function mountPaymentsEndpoints(router: Router) {
  // 1) Входящий хук от Pi: "неполный платёж" (на чейн попал, но ещё не подтверждён нами)
  router.post("/incomplete", async (req, res) => {
    try {
      const payment = req.body.payment;
      const paymentId: string = payment.identifier;
      const txid: string | null = payment.transaction?.txid ?? null;
      const txURL: string | null = payment.transaction?._link ?? null;

      const orderCollection = req.app.locals.orderCollection;

      const order = await orderCollection.findOne({ pi_payment_id: paymentId });
      if (!order) return res.status(400).json({ message: "Order not found" });

      // Доп. верификация по Horizon (если есть ссылка)
      if (txURL) {
        const horizonResponse = await axios.create({ timeout: 20000 }).get(txURL);
        const paymentIdOnBlock = horizonResponse.data.memo;
        if (paymentIdOnBlock !== order.pi_payment_id) {
          return res.status(400).json({ message: "Payment id doesn't match." });
        }
      }

      // Помечаем как оплаченный и завершаем на Pi
      await orderCollection.updateOne(
        { pi_payment_id: paymentId },
        { $set: { txid, paid: true, paidAt: new Date() } }
      );
      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      return res.status(200).json({ message: `Handled the incomplete payment ${paymentId}` });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // 2) Наше подтверждение готовности (резервация заказа под оплату)
  router.post("/approve", async (req, res) => {
    try {
      if (!req.session || !req.session.currentUser) {
        return res.status(401).json({ error: "unauthorized", message: "User needs to sign in first" });
      }

      const paymentId: string = req.body.paymentId;
      if (!paymentId) return res.status(400).json({ message: "paymentId is required" });

      const { data: currentPayment } = await platformAPIClient.get(`/v2/payments/${paymentId}`);

      const budgetPi = Number(currentPayment?.metadata?.budgetPi ?? 0);
      const { fee, total } = calcFee(budgetPi);

      // Сверка суммы: то, что летит в платёж, должно совпасть с нашим расчётом
      if (Number(currentPayment.amount) !== total) {
        return res.status(400).json({ message: "Invalid payment amount" });
      }

      const jobId =
        currentPayment?.metadata?.jobId ?? currentPayment?.metadata?.productId ?? null;

      const orderCollection = req.app.locals.orderCollection;

      await orderCollection.insertOne({
        pi_payment_id: paymentId,
        product_id: jobId,
        user: req.session.currentUser.uid,
        txid: null,
        paid: false,
        cancelled: false,
        feePi: fee,
        totalPi: total,
        created_at: new Date(),
      });

      await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);
      return res.status(200).json({ message: `Approved the payment ${paymentId}` });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // 3) Завершение (мы проверили и подтверждаем)
  router.post("/complete", async (req, res) => {
    try {
      const paymentId: string = req.body.paymentId;
      const txid: string = req.body.txid;

      const orderCollection = req.app.locals.orderCollection;
      const order = await orderCollection.findOne({ pi_payment_id: paymentId });
      if (!order) return res.status(404).json({ message: "Order not found" });

      await orderCollection.updateOne(
        { pi_payment_id: paymentId },
        { $set: { txid, paid: true, paidAt: new Date() } }
      );
      await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

      return res.status(200).json({ message: `Completed the payment ${paymentId}` });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  // 4) Отмена
  router.post("/cancelled_payment", async (req, res) => {
    try {
      const paymentId: string = req.body.paymentId;
      const orderCollection = req.app.locals.orderCollection;

      await orderCollection.updateOne(
        { pi_payment_id: paymentId },
        { $set: { cancelled: true } }
      );
      return res.status(200).json({ message: `Cancelled the payment ${paymentId}` });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "internal_error" });
    }
  });
}
