import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';

const MAX_ZOOM = 4;

// Кодируем в JPEG; если файл тяжелее лимита сервера — сначала снижаем качество, потом размер.
function encode(img, rect, outW, outH, maxBytes) {
  let w = outW;
  let h = outH;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // прозрачный PNG в JPEG иначе станет чёрным
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
    for (const q of [0.88, 0.78, 0.66]) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (!maxBytes || (url.length * 3) / 4 <= maxBytes) return url;
    }
    w *= 0.82;
    h *= 0.82;
  }
  throw new Error('Не удалось сжать фото до допустимого размера');
}

/**
 * Кадрирование: двигайте фото пальцем/мышью, масштабируйте ползунком, колесом или щипком.
 * Рамка показывает ровно то, что будет опубликовано. Размер результата зависит от выбранных пропорций.
 */
export default function ImageCropper({ file, aspects, round = false, maxSide = 1280, maxBytes, title = 'Кадрирование', onDone, onCancel }) {
  const [img, setImg] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [aspectId, setAspectId] = useState(aspects[0].id);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stageRef = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(0);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => setImg(im);
    im.onerror = () => setLoadError('Не удалось открыть изображение. Выберите PNG, JPEG или WebP.');
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const iw = img?.naturalWidth || 1;
  const ih = img?.naturalHeight || 1;
  const aspect = aspects.find((a) => a.id === aspectId) || aspects[0];
  const ratio = aspect.ratio ?? iw / ih;

  // Реальные размеры рамки на экране.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !img) return undefined;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [img, aspectId]);

  const base = box.w ? Math.max(box.w / iw, box.h / ih) : 1; // масштаб, при котором фото закрывает рамку
  const clampOff = (o, z) => {
    const scale = base * z;
    const mx = Math.max(0, (iw * scale - box.w) / 2);
    const my = Math.max(0, (ih * scale - box.h) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };
  const pos = clampOff(off, zoom);
  const scale = base * zoom;

  const changeZoom = (next) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(z);
    setOff((o) => clampOff(o, z));
  };
  const changeAspect = (id) => { setAspectId(id); setZoom(1); setOff({ x: 0, y: 0 }); };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinch.current = 0;
  };
  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) changeZoom(zoom * (dist / pinch.current));
      pinch.current = dist;
    } else if (pointers.current.size === 1) {
      setOff(clampOff({ x: pos.x + e.clientX - prev.x, y: pos.y + e.clientY - prev.y }, zoom));
    }
  };
  const onPointerUp = (e) => { pointers.current.delete(e.pointerId); pinch.current = 0; };

  // Размер результата (рамка → исходные пиксели): без увеличения, но не больше maxSide по длинной стороне.
  const srcW = box.w ? box.w / scale : iw;
  const srcH = box.h ? box.h / scale : ih;
  const outScale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const outW = Math.round(srcW * outScale);
  const outH = Math.round(srcH * outScale);

  const done = () => {
    setBusy(true);
    setError('');
    try {
      const rect = { sx: iw / 2 - box.w / (2 * scale) - pos.x / scale, sy: ih / 2 - box.h / (2 * scale) - pos.y / scale, sw: srcW, sh: srcH };
      onDone(encode(img, rect, outW, outH, maxBytes));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const stageStyle = useMemo(() => ({ aspectRatio: String(ratio), width: `min(100%, calc(52dvh * ${ratio}))` }), [ratio]);

  return (
    <Modal open onClose={onCancel} title={title} size="sm">
      {loadError ? (
        <div className="space-y-4">
          <p className="rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">{loadError}</p>
          <button type="button" onClick={onCancel} className="w-full rounded-xl border border-line px-4 py-2.5 text-sm font-semibold">Закрыть</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {aspects.length > 1 && (
            <div className="flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Пропорции">
              {aspects.map((a) => (
                <button key={a.id} type="button" role="radio" aria-checked={a.id === aspectId} onClick={() => changeAspect(a.id)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${a.id === aspectId ? 'bg-accent text-white' : 'bg-ink/[0.07] text-muted hover:text-ink'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <div
            ref={stageRef}
            style={stageStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => changeZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
            className={`relative cursor-grab touch-none select-none overflow-hidden bg-black active:cursor-grabbing ${round ? 'rounded-full' : 'rounded-xl'}`}
          >
            {img ? (
              <img
                src={img.src}
                alt="Кадрирование"
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{ width: iw, height: ih, transformOrigin: 'center', transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`, opacity: box.w ? 1 : 0 }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-sm text-white/60">Загрузка…</span>
            )}
            {!round && <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/25" />}
          </div>

          <label className="flex w-full items-center gap-3 text-sm text-muted">
            <span className="shrink-0">Масштаб</span>
            <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} className="h-1 w-full accent-[var(--color-accent)]" aria-label="Масштаб" />
          </label>
          <p className="text-xs text-faint">Размер результата: {img && box.w ? `${outW} × ${outH} пикс.` : '…'} · перетаскивайте фото, чтобы выбрать кадр</p>

          {error && <p className="w-full rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent" role="alert">{error}</p>}
          <div className="flex w-full justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink">Отмена</button>
            <button type="button" onClick={done} disabled={!img || !box.w || busy} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
              {busy ? 'Готовим…' : 'Готово'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
