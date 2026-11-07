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
