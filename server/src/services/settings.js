const { pool } = require('../db');
const { mailEnabled } = require('./mailer');

const DEFAULTS = { premium_trial_enabled: true, premium_trial_days: 30, email_codes_enabled: true };

async function getSettings() {
  const { rows } = await pool.query('SELECT key, value FROM app_settings');
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const days = Number(map.premium_trial_days);
  return {
    premium_trial_enabled: map.premium_trial_enabled === undefined ? DEFAULTS.premium_trial_enabled : map.premium_trial_enabled === 'true',
    premium_trial_days: Number.isInteger(days) && days > 0 ? days : DEFAULTS.premium_trial_days,
    // Переключатель в админ-панели: коды на почту при регистрации и смене почты.
    email_codes_enabled: map.email_codes_enabled === undefined ? DEFAULTS.email_codes_enabled : map.email_codes_enabled === 'true',
    mail_configured: mailEnabled(),
  };
}

// Реально ли сейчас просим код: почта настроена И админ не выключил проверку.
async function emailCodesRequired() {
  return mailEnabled() && (await getSettings()).email_codes_enabled;
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

module.exports = { getSettings, saveSettings, emailCodesRequired };
