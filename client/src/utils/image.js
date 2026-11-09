// Обрезает картинку до квадрата и сжимает до size×size, чтобы аватарка весила 20–60 КБ.
// Именно слишком тяжёлые файлы раньше и «убивали» запрос сохранения профиля.
export function fileToAvatarDataUrl(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Выберите файл-картинку'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Файл слишком большой (максимум 15 МБ)'));

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать картинку'));
    };
    img.src = url;
  });
}

// Вертикальная сторис 9:16: обрезаем по центру до 720×1280 и сжимаем в JPEG (≈100–250 КБ).
export function fileToStoryDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Выберите файл-картинку'));
    if (file.size > 20 * 1024 * 1024) return reject(new Error('Файл слишком большой (максимум 20 МБ)'));

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const W = 720;
      const H = 1280;
      const targetRatio = W / H;
      let sw = img.width;
      let sh = img.height;
      if (sw / sh > targetRatio) sw = sh * targetRatio; // слишком широкая — режем по бокам
      else sh = sw / targetRatio; // слишком высокая — режем сверху и снизу
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      canvas.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать картинку'));
    };
    img.src = url;
  });
}

// Фото для заявки на галочку: сохраняем пропорции, ограничиваем длинную сторону 1280 px (≈150–400 КБ в JPEG).
export function fileToPhotoDataUrl(file, maxSide = 1280) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Выберите файл-картинку'));
    if (file.size > 20 * 1024 * 1024) return reject(new Error('Файл слишком большой (максимум 20 МБ)'));

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // прозрачный PNG в JPEG иначе станет чёрным
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать картинку'));
    };
    img.src = url;
  });
}
