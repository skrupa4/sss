const crypto = require('crypto');
const config = require('../config');

const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;
const MAX_SENDS_PER_HOUR = 5;

const makeCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
// В базе лежит только хэш, привязанный к адресу и секрету сервера.
const hashCode = (email, code) => crypto.createHmac('sha256', config.JWT_SECRET).update(`${email.toLowerCase()}:${code}`).digest('hex');
const codeMatches = (email, code, hash) => {
  const a = Buffer.from(hashCode(email, String(code)), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { makeCode, hashCode, codeMatches, TTL_MINUTES, MAX_ATTEMPTS, RESEND_COOLDOWN_SEC, MAX_SENDS_PER_HOUR };
