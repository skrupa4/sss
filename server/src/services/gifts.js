// Каталог подарков. Цена в монетах; иконки — эмодзи, поэтому клиенту достаточно кода.
const GIFTS = [
  { code: 'heart', title: 'Сердечко', icon: '💝', price: 10 },
  { code: 'rose', title: 'Роза', icon: '🌹', price: 25 },
  { code: 'teddy', title: 'Мишка', icon: '🧸', price: 50 },
  { code: 'cake', title: 'Торт', icon: '🎂', price: 75 },
  { code: 'champagne', title: 'Шампанское', icon: '🍾', price: 100 },
  { code: 'rocket', title: 'Ракета', icon: '🚀', price: 150 },
  { code: 'ring', title: 'Кольцо', icon: '💍', price: 250 },
  { code: 'crown', title: 'Корона', icon: '👑', price: 400 },
  { code: 'diamond', title: 'Бриллиант', icon: '💎', price: 600 },
  { code: 'trophy', title: 'Кубок', icon: '🏆', price: 1000 },
];

const GIFT_BY_CODE = new Map(GIFTS.map((g) => [g.code, g]));

module.exports = { GIFTS, GIFT_BY_CODE };
