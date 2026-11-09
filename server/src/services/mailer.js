// Отправка писем через HTTP API (Brevo или Resend): SMTP-порты на бесплатном Render закрыты.
const config = require('../config');
const { HttpError } = require('../utils/errors');

const provider = () => {
  if (!config.mail.from) return null;
  if (config.mail.brevoKey) return 'brevo';
  if (config.mail.resendKey) return 'resend';
  return null;
};
const mailEnabled = () => provider() !== null;

async function sendMail({ to, subject, html, text }) {
  const which = provider();
  if (!which) throw new HttpError(503, 'Почта на сервере не настроена');
  const { from, fromName } = config.mail;
  const request = which === 'brevo'
    ? {
        url: 'https://api.brevo.com/v3/smtp/email',
        headers: { 'api-key': config.mail.brevoKey },
        body: { sender: { name: fromName, email: from }, to: [{ email: to }], subject, htmlContent: html, textContent: text },
      }
    : {
        url: 'https://api.resend.com/emails',
        headers: { Authorization: `Bearer ${config.mail.resendKey}` },
        body: { from: `${fromName} <${from}>`, to: [to], subject, html, text },
      };
  try {
    const res = await fetch(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...request.headers },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`Почта (${which}): HTTP ${res.status}`, (await res.text()).slice(0, 300));
      throw new Error('mail failed');
    }
  } catch (err) {
    if (err.message !== 'mail failed') console.error(`Почта (${which}):`, err.message);
    throw new HttpError(502, 'Не удалось отправить письмо. Проверьте адрес почты и попробуйте позже');
  }
}

const PURPOSES = {
  register: { subject: 'Код подтверждения SSS', lead: 'Ваш код для регистрации в SSS' },
  email: { subject: 'Подтвердите новую почту в SSS', lead: 'Код для смены почты в SSS' },
};

function sendCode(to, code, purpose = 'register') {
  const p = PURPOSES[purpose];
  const text = `${p.lead}: ${code}\nКод действует 10 минут. Если это были не вы, просто проигнорируйте письмо.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e5e5ea;border-radius:16px">
  <p style="margin:0 0 12px;font-size:15px;color:#333">${p.lead}:</p>
  <p style="margin:0 0 16px;font-size:34px;font-weight:800;letter-spacing:8px;color:#e8184f">${code}</p>
  <p style="margin:0;font-size:13px;color:#777">Код действует 10 минут. Если это были не вы, просто проигнорируйте письмо.</p>
</div>`;
  return sendMail({ to, subject: p.subject, html, text });
}

module.exports = { mailEnabled, sendMail, sendCode };
