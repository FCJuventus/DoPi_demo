export interface Job {
  _id?: any;
  title: string;
  description: string;
  budgetPi: number;

  // новые поля
  feePi?: number;       // комиссия платформы (фиксируется при оплате)
  totalPi?: number;     // бюджет + комиссия

  creatorUid: string;
  freelancerUid?: string | null;
  status: "open" | "awarded" | "paid" | "completed" | "cancelled";
  createdAt: Date;
  paidAt?: Date;
  txid?: string | null;
}
