// backend/src/types/job.ts

export type JobStatus = 'open' | 'awarded' | 'paid' | 'completed' | 'cancelled';

export interface Job {
  _id?: any;                // ObjectId
  title: string;            // заголовок задачи
  description: string;      // описание
  budgetPi: number;         // бюджет в Pi
  creatorUid: string;       // UID заказчика (Pi)
  freelancerUid?: string|null; // UID исполнителя (Pi) — null пока не назначили
  status: JobStatus;        // статус жизненного цикла
  createdAt: Date;
  updatedAt: Date;
}
