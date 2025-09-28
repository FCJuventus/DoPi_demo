export type OrderStatus =
  | 'created'    // заказ создан, оплаты ещё нет
  | 'pending'    // ждём подтверждения сети/кошелька
  | 'paid'       // платёж подтверждён кошельком
  | 'completed'  // платёж завершён (мы дернули /complete)
  | 'cancelled'  // отменён
  | 'failed';    // ошибка

export interface Order {
  _id?: any;               // ObjectId
  orderId: string;         // удобная строка = String(_id)
  uid?: string;            // id пользователя Pi (если есть сессия)
  username?: string;       // имя в Pi
  amount: number;          // сумма в Test-π
  memo?: string;           // описание
  status: OrderStatus;

  // связка с Pi
  paymentId?: string;
  txid?: string;           // хеш транзакции из сети
  network?: 'testnet' | 'mainnet';

  // что вернул Pi (храним частично)
  piPayment?: any;

  createdAt: Date;
  updatedAt: Date;
}
