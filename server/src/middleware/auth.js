const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../db');
const { HttpError } = require('../utils/errors');

function signToken(userId) {
  return jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

// Возвращает { id, username, is_admin, is_banned } по токену или null.
// Имя берём из БД, поэтому смена ника не ломает токен.
async function userFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, username, COALESCE(is_admin, false) AS is_admin, COALESCE(is_banned, false) AS is_banned FROM users WHERE id = $1',
      [payload.id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function bearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function requireAuth(req, res, next) {
  const user = await userFromToken(bearer(req));
  if (!user) throw new HttpError(401, 'Требуется авторизация');
  if (user.is_banned) throw new HttpError(403, 'Аккаунт заблокирован администратором');
  req.user = user;
  next();
}

async function optionalAuth(req, res, next) {
  const user = await userFromToken(bearer(req));
  req.user = user && !user.is_banned ? user : null;
  next();
}

// Только для администратора. Проверка идёт на сервере по БД — подделать на клиенте нельзя.
// Сам читает токен, поэтому подключается без requireAuth: router.use(requireAdmin).
async function requireAdmin(req, res, next) {
  const user = await userFromToken(bearer(req));
  if (!user) throw new HttpError(401, 'Требуется авторизация');
  if (user.is_banned || !user.is_admin) throw new HttpError(403, 'Доступ только для администратора');
  req.user = user;
  next();
}

module.exports = { signToken, userFromToken, requireAuth, optionalAuth, requireAdmin };
