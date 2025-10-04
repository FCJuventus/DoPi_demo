// backend/src/handlers/jobs.ts
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import type { Job, JobStatus } from '../types/job';

export default function mountJobsEndpoints(router: Router) {
  // Создать задачу
  router.post('/', async (req, res) => {
    try {
      const { title, description, budgetPi, creatorUid } = req.body;
      if (!title || !description || !budgetPi || !creatorUid) {
        return res.status(400).json({ error: 'title, description, budgetPi, creatorUid — обязательны' });
      }

      const app = req.app;
      const jobs = app.locals.jobCollection;

      const now = new Date();
      const doc: Job = {
        title: String(title).trim(),
        description: String(description).trim(),
        budgetPi: Number(budgetPi),
        creatorUid: String(creatorUid),
        freelancerUid: null,
        status: 'open',
        createdAt: now,
        updatedAt: now
      };

      const ins = await jobs.insertOne(doc);
      const created = await jobs.findOne({ _id: ins.insertedId });
      return res.status(201).json(created);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Список открытых задач
  router.get('/', async (req, res) => {
    try {
      const app = req.app;
      const jobs = app.locals.jobCollection;
      const list: Job[] = await jobs.find({ status: 'open' }).sort({ createdAt: -1 }).limit(100).toArray();
      return res.json(list);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Назначить исполнителя (open -> awarded)
  router.patch('/:id/award', async (req, res) => {
    try {
      const app = req.app;
      const jobs = app.locals.jobCollection;

      const _id = new ObjectId(req.params.id);
      const { creatorUid, freelancerUid } = req.body;
      if (!creatorUid || !freelancerUid) {
        return res.status(400).json({ error: 'creatorUid и freelancerUid — обязательны' });
      }

      const job: Job | null = await jobs.findOne({ _id });
      if (!job) return res.status(404).json({ error: 'Задача не найдена' });
      if (job.status !== 'open') return res.status(400).json({ error: 'Задачу уже нельзя назначить' });
      if (job.creatorUid !== creatorUid) return res.status(403).json({ error: 'Только создатель может назначить' });

      await jobs.updateOne(
        { _id },
        { $set: { freelancerUid: String(freelancerUid), status: 'awarded' as JobStatus, updatedAt: new Date() } }
      );

      const updated = await jobs.findOne({ _id });
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Инициировать оплату (создать запись в orders, связать с job)
  router.post('/:id/pay', async (req, res) => {
    try {
      const app = req.app;
      const jobs = app.locals.jobCollection;
      const orders = app.locals.orderCollection;

      const _id = new ObjectId(req.params.id);
      const { employerUid, pi_payment_id } = req.body; // paymentId от Pi SDK (временный вариант)
      if (!employerUid) return res.status(400).json({ error: 'employerUid обязателен' });

      const job: Job | null = await jobs.findOne({ _id });
      if (!job) return res.status(404).json({ error: 'Задача не найдена' });
      if (job.creatorUid !== employerUid) return res.status(403).json({ error: 'Платить может только создатель' });
      if (job.status !== 'awarded') return res.status(400).json({ error: 'Оплата доступна после назначения исполнителя' });

      // создаём «черновик» заказа (orders), связываем с job
      const now = new Date();
      const orderDoc = {
        // совместимость с твоей текущей схемой orders:
        pi_payment_id: pi_payment_id ?? null,   // можно обновить позже, когда SDK вернёт id
        jobId: _id,
        employerUid: employerUid,
        freelancerUid: job.freelancerUid,
        amountPi: job.budgetPi,
        txid: null,
        paid: false,
        cancelled: false,
        created_at: now,
        updated_at: now,

        // также оставим поля из существующей demo-схемы, если ты ими пользуешься:
        status: 'created',
      };

      const ins = await orders.insertOne(orderDoc);
      const created = await orders.findOne({ _id: ins.insertedId });

      return res.status(201).json({
        order: created,
        message: 'Черновик платежа создан. Заверши оплату через Pi SDK и дерни вебхук.'
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Подтвердить выполнение (paid -> completed)
  router.patch('/:id/complete', async (req, res) => {
    try {
      const app = req.app;
      const jobs = app.locals.jobCollection;

      const _id = new ObjectId(req.params.id);
      const { creatorUid } = req.body;

      const job: Job | null = await jobs.findOne({ _id });
      if (!job) return res.status(404).json({ error: 'Задача не найдена' });
      if (job.creatorUid !== creatorUid) return res.status(403).json({ error: 'Только создатель подтверждает' });
      if (job.status !== 'paid') return res.status(400).json({ error: 'Задача ещё не оплачена' });

      await jobs.updateOne({ _id }, { $set: { status: 'completed' as JobStatus, updatedAt: new Date() } });
      const updated = await jobs.findOne({ _id });
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // Отмена (open|awarded -> cancelled), после оплаты — не даём, нужен рефанд-процесс
  router.patch('/:id/cancel', async (req, res) => {
    try {
      const app = req.app;
      const jobs = app.locals.jobCollection;

      const _id = new ObjectId(req.params.id);
      const { creatorUid } = req.body;

      const job: Job | null = await jobs.findOne({ _id });
      if (!job) return res.status(404).json({ error: 'Задача не найдена' });
      if (job.creatorUid !== creatorUid) return res.status(403).json({ error: 'Только создатель отменяет' });
      if (['completed', 'cancelled'].includes(job.status)) {
        return res.status(400).json({ error: 'Нельзя отменить завершённую или уже отменённую' });
      }
      if (job.status === 'paid') {
        return res.status(400).json({ error: 'После оплаты нужна процедура возврата (вне MVP)' });
      }

      await jobs.updateOne({ _id }, { $set: { status: 'cancelled' as JobStatus, updatedAt: new Date() } });
      const updated = await jobs.findOne({ _id });
      return res.json(updated);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}
