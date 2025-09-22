import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import logger from 'morgan';
import MongoStore from 'connect-mongo';
import { MongoClient } from 'mongodb';
import env from './environments';
import mountPaymentsEndpoints from './handlers/payments';
import mountUserEndpoints from './handlers/users';

// Типы для session (как у тебя и было)
import "./types/session";

// ---------- MongoDB ----------

const dbName = env.mongo_db_name;

// 1) Предпочитаем полный SRV-URI из переменной окружения (рекомендуется для Atlas)
const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb+srv://${encodeURIComponent(env.mongo_user)}:${encodeURIComponent(
    env.mongo_password
  )}@${env.mongo_host}/${dbName}?retryWrites=true&w=majority`;

// Для SRV-строки отдельные опции авторизации не нужны — всё в URI
const mongoClientOptions = {}; // оставляем пустым

// ---------- Express App и мидлвары ----------

const app: express.Application = express();

// Создадим папку для логов, чтобы не было ошибок при записи
try {
  fs.mkdirSync(path.join(__dirname, '..', 'log'), { recursive: true });
} catch { /* noop */ }

// Короткий лог в консоль
app.use(logger('dev'));

// Полный лог в файл
app.use(logger('common', {
  stream: fs.createWriteStream(path.join(__dirname, '..', 'log', 'access.log'), { flags: 'a' }),
}));

// Позволяем работать с JSON
app.use(express.json());

// CORS (разрешаем запросы с твоего фронтенда)
app.use(cors({
  origin: env.frontend_url,
  credentials: true
}));

// Cookies
app.use(cookieParser());

// Сессии (храним в MongoDB)
app.use(session({
  secret: env.session_secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    dbName: dbName,
    collectionName: 'user_sessions'
  }),
}));

// ---------- Роуты ----------

// Платежи
const paymentsRouter = express.Router();
mountPaymentsEndpoints(paymentsRouter);
app.use('/payments', paymentsRouter);

// Пользователи (вход/выход)
const userRouter = express.Router();
mountUserEndpoints(userRouter);
app.use('/user', userRouter);

// Простой ответ на корень (для проверки)
app.get('/', async (_, res) => {
  res.status(200).send({ message: "Hello, World!" });
});

// Health-check (Render будет стучаться сюда)
app.get('/healthz', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// ---------- Запуск сервера ----------

const PORT = Number(process.env.PORT) || 8000;

app.listen(PORT, async () => {
  try {
    const client = await MongoClient.connect(mongoUri, mongoClientOptions);
    const db = client.db(dbName);
    app.locals.orderCollection = db.collection('orders');
    app.locals.userCollection = db.collection('users');
    console.log('Connected to MongoDB on:', mongoUri);
  } catch (err) {
    console.error('Connection to MongoDB failed:', err);
  }

  console.log(`App platform demo app - Backend listening on port ${PORT}!`);
  console.log(`CORS config: configured to respond to a frontend hosted on ${env.frontend_url}`);
});
