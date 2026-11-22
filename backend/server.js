require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./database");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.JWT_SECRET;
const ORIGIN = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500";
const COOKIE = "edudiary_session";

if (!SECRET || SECRET.length < 32) {
  console.error("Укажи в .env JWT_SECRET длиной не менее 32 символов.");
  process.exit(1);
}

app.use(helmet());
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: "30kb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20,
  standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Слишком много попыток. Попробуй позже." }
});

function text(value, max = 80) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s && s.length <= max ? s : null;
}
function setSession(res, user) {
  const token = jwt.sign(
    { sub: String(user.id), email: user.email },
    SECRET, { expiresIn: "7d", jwtid: crypto.randomUUID() }
  );
  res.cookie(COOKIE, token, {
    httpOnly: true, secure: false, sameSite: "strict",
    path: "/", maxAge: 7 * 24 * 60 * 60 * 1000
  });
}
function auth(req, res, next) {
  const token = req.cookies[COOKIE];
  if (!token) return res.status(401).json({ error: "Нужно войти в аккаунт." });
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = Number(payload.sub);
    if (!Number.isSafeInteger(req.userId)) throw new Error("Invalid user");
    next();
  } catch {
    res.clearCookie(COOKIE, { httpOnly: true, sameSite: "strict", path: "/" });
    res.status(401).json({ error: "Сессия истекла. Войди снова." });
  }
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "EduDiary API" }));

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const name = text(req.body.name, 60);
  const email = text(req.body.email, 254)?.toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Проверь имя и адрес электронной почты." });
  if (password.length < 10 || password.length > 128)
    return res.status(400).json({ error: "Пароль должен содержать от 10 до 128 символов." });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)")
      .run(name, email, hash);
    const user = { id: Number(result.lastInsertRowid), name, email };
    setSession(res, user);
    res.status(201).json({ user });
  } catch (e) {
    if (String(e.code).includes("SQLITE_CONSTRAINT"))
      return res.status(409).json({ error: "Аккаунт с такой почтой уже существует." });
    console.error(e);
    res.status(500).json({ error: "Не удалось создать аккаунт." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const email = text(req.body.email, 254)?.toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!email || !password) return res.status(400).json({ error: "Введи почту и пароль." });
  const row = db.prepare("SELECT id,name,email,password_hash FROM users WHERE email=?").get(email);
  const valid = row && await bcrypt.compare(password, row.password_hash);
  if (!valid) return res.status(401).json({ error: "Неверная почта или пароль." });
  const user = { id: row.id, name: row.name, email: row.email };
  setSession(res, user);
  res.json({ user });
});
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: "strict", path: "/" });
  res.json({ ok: true });
});
app.get("/api/auth/me", auth, (req, res) => {
  const user = db.prepare("SELECT id,name,email FROM users WHERE id=?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Аккаунт не найден." });
  res.json({ user });
});

app.get("/api/subjects", auth, (req, res) => {
  const subjects = db.prepare(
    "SELECT id,name,created_at AS createdAt FROM subjects WHERE user_id=? ORDER BY id DESC"
  ).all(req.userId);
  res.json({ subjects });
});
app.post("/api/subjects", auth, (req, res) => {
  const name = text(req.body.name, 60);
  if (!name) return res.status(400).json({ error: "Название предмета должно быть от 1 до 60 символов." });
  try {
    const result = db.prepare("INSERT INTO subjects (user_id,name) VALUES (?,?)").run(req.userId, name);
    const subject = db.prepare(
      "SELECT id,name,created_at AS createdAt FROM subjects WHERE id=? AND user_id=?"
    ).get(Number(result.lastInsertRowid), req.userId);
    res.status(201).json({ subject });
  } catch (e) {
    if (String(e.code).includes("SQLITE_CONSTRAINT"))
      return res.status(409).json({ error: "Такой предмет уже добавлен." });
    console.error(e);
    res.status(500).json({ error: "Не удалось добавить предмет." });
  }
});
app.delete("/api/subjects/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Некорректный ID." });
  const result = db.prepare("DELETE FROM subjects WHERE id=? AND user_id=?").run(id, req.userId);
  if (!result.changes) return res.status(404).json({ error: "Предмет не найден." });
  res.json({ ok: true });
});

app.get("/api/grades", auth, (req, res) => {
  const grades = db.prepare(`
    SELECT g.id,g.subject_id AS subjectId,s.name AS subject,g.value,g.date,g.created_at AS createdAt
    FROM grades g JOIN subjects s ON s.id=g.subject_id
    WHERE g.user_id=? ORDER BY g.date DESC,g.id DESC
  `).all(req.userId);
  res.json({ grades });
});
app.post("/api/grades", auth, (req, res) => {
  const subjectId = Number(req.body.subjectId);
  const value = Number(req.body.value);
  const date = text(req.body.date, 10);
  if (!Number.isSafeInteger(subjectId) || subjectId < 1 ||
      !Number.isInteger(value) || value < 1 || value > 5 ||
      !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date + "T00:00:00Z")))
    return res.status(400).json({ error: "Проверь предмет, оценку и дату." });
  const subject = db.prepare("SELECT id FROM subjects WHERE id=? AND user_id=?").get(subjectId, req.userId);
  if (!subject) return res.status(400).json({ error: "Выбранный предмет не найден." });
  const result = db.prepare("INSERT INTO grades (user_id,subject_id,value,date) VALUES (?,?,?,?)")
    .run(req.userId, subjectId, value, date);
  const grade = db.prepare(`
    SELECT g.id,g.subject_id AS subjectId,s.name AS subject,g.value,g.date,g.created_at AS createdAt
    FROM grades g JOIN subjects s ON s.id=g.subject_id
    WHERE g.id=? AND g.user_id=?
  `).get(Number(result.lastInsertRowid), req.userId);
  res.status(201).json({ grade });
});
app.delete("/api/grades/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Некорректный ID." });
  const result = db.prepare("DELETE FROM grades WHERE id=? AND user_id=?").run(id, req.userId);
  if (!result.changes) return res.status(404).json({ error: "Оценка не найдена." });
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Внутренняя ошибка сервера." });
});
app.listen(PORT, () => {
  console.log(`EduDiary API: http://localhost:${PORT}`);
  console.log(`Проверка: http://localhost:${PORT}/api/health`);
});
