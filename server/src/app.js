const express = require('express');
const cors = require('cors');
const config = require('./config');
const { HttpError } = require('./utils/errors');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
// Аватарка приходит как base64 (до ~400 КБ), поэтому лимит больше стандартного.
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/clans', require('./routes/clans'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Маршрут не найден' }));

// Единый обработчик ошибок. Express 5 сам передаёт сюда ошибки из async-обработчиков.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Слишком большой запрос' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

module.exports = app;
