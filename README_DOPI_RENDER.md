# DoPi Demo (на основе Pi Demo App)

Этот пакет подготовлен для быстрого деплоя на Render (Testnet).

## 1) Что здесь уже сделано
- Обновлён бренд в шапке: **DoPi**
- Добавлены ссылки **/privacy.html** и **/terms.html** (файлы лежат в `frontend/public`)
- Добавлен `render.yaml` для автосоздания двух сервисов на Render (backend + frontend)
- Подготовлены `.env.render.example` для backend и frontend

## 2) Быстрый деплой (шаги)
1. Создай новый репозиторий на GitHub и загрузи в него эти файлы (весь корень).
2. В Pi Developer Portal (Testnet) выпиши `App ID`, `API Key`, `API Secret` и подключи **App Wallet (Testnet)**.
3. Создай бесплатный кластер в MongoDB Atlas и получи:
   - имя БД (например `dopi_demo`),
   - пользователя и пароль,
   - хост кластера (например `cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`).
4. На Render нажми **New → Blueprint** и укажи `render.yaml` из твоего репо.
5. После создания сервисов:
   - Зайди в **dopi-backend → Environment** и заполни переменные из `backend/.env.render.example`.
   - Выполни **Manual Redeploy** бэкенда.
6. Возьми URL фронтенда (например `https://dopi-frontend.onrender.com`) и пропиши его:
   - в **Developer Portal (Testnet)** в App URL / Allowed Origins,
   - в **dopi-backend → Environment → FRONTEND_URL**.
7. Открой фронт в **Pi Browser**, авторизуйся и протестируй платёж в Testnet.

## 3) Где менять тексты/логику
- Брендинг/меню: `frontend/src/Shop/components/Header.tsx`
- Страницы/кнопки: `frontend/src/Shop`
- Бэкенд-эндпойнты: `backend/src/handlers`
