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
import mountJobsEndpoints from './handlers/jobs';

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

// --- CORS: разрешаем несколько доверенных источников ---
const allowedOrigins = [
  env.frontend_url,                      // твой прод на Render из ENV
  'https://dopi-frontend.onrender.com', // явный прод-URL
  // ↓ После того как добавишь PiNet субдомен в Dev Portal, вставь его сюда:
  // 'https://<твой-поддомен>.pinet.org'  // пример, замени на точный
];

app.use(cors({
  origin: (origin, cb) => {
    // Разрешаем запросы без Origin (например, curl) и из белого списка
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true
}));
// Cookies
app.use(cookieParser());

// Render сидит за прокси → без этого secure cookie не будут работать
app.set('trust proxy', 1);

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
  cookie: process.env.NODE_ENV === 'production'
    ? { sameSite: 'none', secure: true }
    : { sameSite: 'lax', secure: false }
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

// ...
const apiRouter = express.Router();
app.use('/api', apiRouter);

const jobsRouter = express.Router();
mountJobsEndpoints(jobsRouter);
apiRouter.use('/jobs', jobsRouter);

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
    const client = await MongoClient.connect(mongoUri, {
      serverSelectionTimeoutMS: 20000, // ждём дольше, чтобы Atlas успел ответить
      tls: true                       // явно включаем TLS
    });

    const db = client.db(dbName);
    app.locals.env = env;
    app.locals.orderCollection = db.collection('orders');
    app.locals.userCollection = db.collection('users');
    app.locals.jobCollection = db.collection('jobs');

// индексы на старте (один раз создастся, дальше будет существовать)
await app.locals.jobCollection.createIndex({ status: 1, createdAt: -1 });
await app.locals.jobCollection.createIndex({ creatorUid: 1, createdAt: -1 });
await app.locals.jobCollection.createIndex({ freelancerUid: 1, createdAt: -1 });

    // 🔒 Логируем безопасно (без пароля)
    const safeUri = mongoUri.replace(/:\/\/(.*)@/, '://***:***@');
    console.log('Connected to MongoDB on:', safeUri);

  } catch (err) {
    console.error('Connection to MongoDB failed:', err);
  }

  console.log(`App platform demo app - Backend listening on port ${PORT}!`);
  console.log(`CORS config: configured to respond to a frontend hosted on ${env.frontend_url}`);
});
