const { emitToUsername } = require('./realtime');

/**
 * Меняет баланс монет (amount может быть отрицательным; ниже нуля баланс не уходит)
 * и сообщает пользователю новый баланс по сокету. db — пул или клиент транзакции.
 */
async function addCoins(db, userId, amount) {
  const { rows } = await db.query(
    'UPDATE users SET coins = GREATEST(0, coins + $2) WHERE id = $1 RETURNING coins, username',
    [userId, amount]
  );
  if (!rows[0]) return null;
  emitToUsername(rows[0].username, 'coins', { coins: rows[0].coins }).catch(() => {});
  return rows[0].coins;
}

// Награда за достижение зависит от редкости.
const ACHIEVEMENT_REWARDS = { common: 10, rare: 25, epic: 60, legendary: 150 };

// Пакеты монет. Цены задаются только здесь — клиенту доверять нельзя.
const COIN_PACKS = [
  { code: 'p100', coins: 100, price_rub: 79 },
  { code: 'p300', coins: 300, price_rub: 199 },
  { code: 'p700', coins: 700, price_rub: 399 },
  { code: 'p1500', coins: 1500, price_rub: 749 },
  { code: 'p4000', coins: 4000, price_rub: 1790 },
];

module.exports = { addCoins, ACHIEVEMENT_REWARDS, COIN_PACKS };
