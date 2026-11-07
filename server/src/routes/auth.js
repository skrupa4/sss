const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { fetchUser } = require('../services/users');
const { HttpError } = require('../utils/errors');
const { str, validateUsername, validateEmail, validatePassword } = require('../utils/validate');

const router = express.Router();

router.post('/register', async (req, res) => {
  const username = validateUsername(req.body.username);
  const email = validateEmail(req.body.email);
  const password = validatePassword(req.body.password);
  const hash = await bcrypt.hash(password, 10);

  let id;
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password, handle) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, email, hash, username.toLowerCase()]
    );
    id = rows[0].id;
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'users_email_key') throw new HttpError(400, 'Эта почта уже занята');
      throw new HttpError(400, 'Такой никнейм уже занят');
    }
    throw err;
  }
  // created_at ставит сама БД (DEFAULT NOW()) — дата регистрации настоящая.
  res.json({ token: signToken(id), user: await fetchUser(pool, 'id', id, { withEmail: true }) });
});

router.post('/login', async (req, res) => {
  const login = str(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!login || !password) throw new HttpError(400, 'Введите никнейм и пароль');

  const { rows } = await pool.query(
    'SELECT id, password FROM users WHERE username = $1 OR LOWER(email) = LOWER($1) LIMIT 1',
    [login]
  );
  if (!rows.length) throw new HttpError(401, 'Пользователь не найден');
  if (!(await bcrypt.compare(password, rows[0].password))) throw new HttpError(401, 'Неверный пароль');

  res.json({ token: signToken(rows[0].id), user: await fetchUser(pool, 'id', rows[0].id, { withEmail: true }) });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json(await fetchUser(pool, 'id', req.user.id, { withEmail: true }));
});

module.exports = router;
