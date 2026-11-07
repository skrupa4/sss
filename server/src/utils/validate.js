const { HttpError } = require('./errors');

const NAME_RE = /^[\p{L}\p{N}_.-]+$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateUsername(value) {
  const username = str(value);
  if (username.length < 3 || username.length > 24) {
    throw new HttpError(400, 'Никнейм должен быть от 3 до 24 символов');
  }
  if (!NAME_RE.test(username)) {
    throw new HttpError(400, 'Никнейм может содержать буквы, цифры, «_», «.» и «-»');
  }
  return username;
}

function validateHandle(value) {
  const handle = str(value).toLowerCase();
  if (handle.length < 3 || handle.length > 24) {
    throw new HttpError(400, 'Хэндл должен быть от 3 до 24 символов');
  }
  if (!NAME_RE.test(handle)) {
    throw new HttpError(400, 'Хэндл может содержать буквы, цифры, «_», «.» и «-»');
  }
  return handle;
}

function validateEmail(value) {
  const email = str(value).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) throw new HttpError(400, 'Некорректный email');
  return email;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 6) {
    throw new HttpError(400, 'Пароль должен быть не короче 6 символов');
  }
  if (Buffer.byteLength(value) > 72) throw new HttpError(400, 'Пароль слишком длинный');
  return value;
}

function validateText(value, { max, field = 'Текст' }) {
  const text = str(value);
  if (!text) throw new HttpError(400, `${field} не может быть пустым`);
  if (text.length > max) throw new HttpError(400, `${field}: максимум ${max} символов`);
  return text;
}

function validateBio(value) {
  const bio = typeof value === 'string' ? value.trim() : '';
  if (bio.length > 200) throw new HttpError(400, 'Описание: максимум 200 символов');
  return bio;
}

module.exports = {
  str,
  validateUsername,
  validateHandle,
  validateEmail,
  validatePassword,
  validateText,
  validateBio,
};
