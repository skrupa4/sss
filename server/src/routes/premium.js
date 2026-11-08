const express = require('express');
const { pool, withTransaction } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { fetchUser, isPremiumUser } = require('../services/users');
const { getSettings } = require('../services/settings');
const { checkAchievements } = require('../services/achievements');
const { HttpError } = require('../utils/errors');
const { NICK_PRESETS, validateNickColor } = require('../utils/nick');

const router = express.Router();
router.use(requireAuth);

async function statusFor(userId) {
  const [user, settings] = await Promise.all([fetchUser(pool, 'id', userId, { withEmail: true }), getSettings()]);
  return {
    active: user.is_premium,
    until: user.premium_until,
    is_admin: user.is_admin,
    nick_color: user.nick_color,
    trial_enabled: settings.premium_trial_enabled,
    trial_days: settings.premium_trial_days,
    trial_used: user.premium_trial_used,
    presets: NICK_PRESETS,
  };
}

router.get('/', async (req, res) => {
  res.json(await statusFor(req.user.id));
});

// Тестовая подписка: бесплатно, один раз на пользователя, длительность задаёт админ (по умолчанию 30 дней).
router.post('/activate', async (req, res) => {
  const settings = await getSettings();
  if (!settings.premium_trial_enabled) throw new HttpError(403, 'Пробный период сейчас недоступен');

  await withTransaction(async (db) => {
    const { rows } = await db.query('SELECT premium_trial_used, premium_until FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    if (rows[0].premium_trial_used) throw new HttpError(400, 'Пробный период уже использован');
    await db.query(
      `UPDATE users SET premium_trial_used = true,
         premium_until = GREATEST(NOW(), COALESCE(premium_until, NOW())) + ($2 || ' days')::interval
       WHERE id = $1`,
      [req.user.id, String(settings.premium_trial_days)]
    );
  });
  await checkAchievements(req.user.id);
  res.json(await statusFor(req.user.id));
});

router.put('/nick', async (req, res) => {
  if (!(await isPremiumUser(pool, req.user.id))) throw new HttpError(403, 'Цвет ника доступен с Premium');
  const color = validateNickColor(req.body.color);
  await pool.query('UPDATE users SET nick_color = $1 WHERE id = $2', [color, req.user.id]);
  res.json(await statusFor(req.user.id));
});

module.exports = router;
