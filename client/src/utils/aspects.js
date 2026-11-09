/** Готовые наборы пропорций для разных мест сайта. ratio: null — «как есть» (пропорции исходного фото). */
export const ASPECTS = {
  post: [
    { id: 'orig', label: 'Оригинал', ratio: null },
    { id: '1:1', label: '1:1', ratio: 1 },
    { id: '4:5', label: '4:5', ratio: 4 / 5 },
    { id: '16:9', label: '16:9', ratio: 16 / 9 },
  ],
  story: [
    { id: '9:16', label: '9:16', ratio: 9 / 16 },
    { id: '4:5', label: '4:5', ratio: 4 / 5 },
    { id: '1:1', label: '1:1', ratio: 1 },
    { id: 'orig', label: 'Оригинал', ratio: null },
  ],
  avatar: [{ id: '1:1', label: '1:1', ratio: 1 }],
};
