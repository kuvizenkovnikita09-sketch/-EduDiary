# EduDiary backend

Локальный API-сервер на Express + SQLite. Сам по себе этот архив не меняет существующий `script.js`: фронтенд подключим отдельным следующим шагом.

## Запуск

Нужен Node.js 20+ и npm. Открой терминал в папке `backend`:

```bash
npm install
```

Скопируй `.env.example` в `.env`, затем замени `JWT_SECRET` на длинную случайную строку (не менее 32 символов). Не публикуй `.env`.

```bash
npm start
```

Проверка: открой `http://localhost:3000/api/health`. Должен появиться ответ `{"ok":true,"service":"EduDiary API"}`.

SQLite-файл автоматически появится в `backend/data/edudiary.db`.

## Настройка фронтенда

По умолчанию ожидается Live Server на `http://127.0.0.1:5500`. Если адрес отличается, измени `FRONTEND_ORIGIN` в `.env` и перезапусти сервер.

В запросах из браузера указывай `credentials: "include"` — сессионная cookie HttpOnly:

```js
const response = await fetch("http://localhost:3000/api/auth/me", {
  credentials: "include"
});
```

## Маршруты API

- `POST /api/auth/register` — `{ "name", "email", "password" }`
- `POST /api/auth/login` — `{ "email", "password" }`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/subjects`
- `POST /api/subjects` — `{ "name" }`
- `DELETE /api/subjects/:id`
- `GET /api/grades`
- `POST /api/grades` — `{ "subjectId", "value", "date" }` (оценка 1–5)
- `DELETE /api/grades/:id`

Маршруты предметов и оценок требуют входа. Данные каждого пользователя отделены от данных остальных пользователей. Пароли хранятся в виде bcrypt-хешей.

## Важно

Это стартовая конфигурация для локальной разработки, не для публичного размещения. Не добавляй в публичный репозиторий реальные школьные данные. `.env` и файл базы исключены через `.gitignore`. Перед публикацией в интернете потребуются HTTPS, secure cookies, дополнительная защита запросов, резервное копирование и проверка конфигурации.
