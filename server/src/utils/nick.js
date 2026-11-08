const { HttpError } = require('./errors');

// Идентификаторы пресетов совпадают с client/src/utils/nick.js.
const NICK_PRESETS = ['sunset', 'ocean', 'aurora', 'gold', 'neon', 'lava', 'mint', 'violet'];

// Допустимо: preset:<id> или произвольный цвет #rrggbb. null — сбросить на стандартный.
function validateNickColor(value) {
  if (value === null || value === '' || value === undefined) return null;
  if (typeof value !== 'string') throw new HttpError(400, 'Некорректный цвет');
  const preset = /^preset:([a-z]+)$/.exec(value);
  if (preset && NICK_PRESETS.includes(preset[1])) return value;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  throw new HttpError(400, 'Некорректный цвет');
}

module.exports = { NICK_PRESETS, validateNickColor };
