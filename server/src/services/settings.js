const { pool } = require('../db');

const DEFAULTS = { premium_trial_enabled: true, premium_trial_days: 30 };

async function getSettings() {
  const { rows } = await pool.query('SELECT key, value FROM app_settings');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const days = Number(map.premium_trial_days);
  return {
    premium_trial_enabled: map.premium_trial_enabled === undefined ? DEFAULTS.premium_trial_enabled : map.premium_trial_enabled === 'true',
    premium_trial_days: Number.isInteger(days) && days > 0 ? days : DEFAULTS.premium_trial_days,
  };
}

async function saveSettings(patch) {
  for (const [key, value] of Object.entries(patch)) {
    await pool.query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, String(value)]
    );
  }
  return getSettings();
}

module.exports = { getSettings, saveSettings };
