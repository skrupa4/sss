// Вставляет текст в позицию курсора поля ввода и возвращает курсор на место.
export function insertAtCursor(el, value, insert, setValue) {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  setValue(value.slice(0, start) + insert + value.slice(end));
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.selectionStart = el.selectionEnd = start + insert.length;
  });
}
