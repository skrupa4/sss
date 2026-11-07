const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../db');
const { HttpError } = require('../utils/errors');

function signToken(userId) {
  return jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

// Возвращает { id, username } по токену или null. Имя берём из БД, поэтому смена ника не ломает токен.
async function userFromToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, username FROM users WHERE id = $1', [payload.id]);
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
  req.user = user;
  next();
}

async function optionalAuth(req, res, next) {
  req.user = await userFromToken(bearer(req));
  next();
}

module.exports = { signToken, userFromToken, requireAuth, optionalAuth };
