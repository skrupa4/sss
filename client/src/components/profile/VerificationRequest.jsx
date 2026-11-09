import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { useToasts } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { fileToPhotoDataUrl } from '../../utils/image';
import { VerifiedBadge } from '../ui/Badges';
import Icon from '../ui/Icons';
import Modal from '../ui/Modal';

const MIN = 20;
const MAX = 600;

function RequestForm({ onDone }) {
  const { push } = useToasts();
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const pick = async (file) => {
    if (!file) return;
    setError('');
    try {
      setPhoto(await fileToPhotoDataUrl(file));
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('/api/verification', { reason, photo });
      push({ type: 'success', title: 'Заявка отправлена', body: 'Мы рассмотрим её и пришлём уведомление.' });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const ready = reason.trim().length >= MIN && photo;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Расскажите, почему вам нужна галочка, и приложите фото — например, скриншот вашего профиля на другой площадке, документ с закрытыми данными или фото с листком с вашим ником.
      </p>
      <label className="block text-sm">
        <span className="mb-1.5 flex justify-between text-muted">
          <span>Почему вам нужна галочка</span>
          <span className={reason.length > MAX ? 'text-accent' : ''}>{reason.length}/{MAX}</span>
        </span>
        <textarea className="input resize-none" rows={5} value={reason} maxLength={MAX} onChange={(e) => setReason(e.target.value)} placeholder="Я автор канала…, меня знают как…" />
      </label>

      <div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        {photo ? (
          <div className="relative overflow-hidden rounded-2xl border border-line">
            <img src={photo} alt="Приложенное фото" className="max-h-64 w-full bg-raised object-contain" />
            <button type="button" onClick={() => setPhoto(null)} aria-label="Убрать фото" className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-8 text-sm text-muted transition-colors hover:border-accent/50 hover:text-ink">
            <Icon name="camera" className="h-5 w-5" /> Прикрепить фото
          </button>
        )}
      </div>

      {error && <p className="text-sm text-accent" role="alert">{error}</p>}
      <button type="button" onClick={submit} disabled={!ready || busy} className="rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
        {busy ? 'Отправляем…' : 'Отправить заявку'}
      </button>
      {!ready && <p className="-mt-2 text-center text-xs text-faint">Нужно описание (от {MIN} символов) и фото</p>}
    </div>
  );
}

/** Раздел «Галочка» в настройках профиля: статус заявки и форма отправки. */
export default function VerificationRequest() {
  const { data, loading, reload } = useAsync(() => api.get('/api/verification/me'), []);
  const [open, setOpen] = useState(false);
  if (loading && !data) return null;
  if (!data) return null;

  const req = data.request;
  let body;
  if (data.verified) {
    body = <p className="flex items-center gap-2 text-sm text-ink/90"><VerifiedBadge /> Ваш аккаунт подтверждён.</p>;
  } else if (req?.status === 'pending') {
    body = <p className="text-sm text-muted">⏳ Заявка на рассмотрении. Когда мы ответим, придёт уведомление.</p>;
  } else {
    body = (
      <>
        {req?.status === 'rejected' && (
          <p className="mb-2 text-sm text-muted">Прошлая заявка отклонена{req.admin_note ? `: «${req.admin_note}»` : '.'} Можно подать новую.</p>
        )}
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl border border-line bg-ink/[0.04] px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink/10">
          Запросить галочку
        </button>
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface/60 p-4">
      <h3 className="mb-2 text-sm font-semibold">Подтверждение аккаунта</h3>
      {body}
      <Modal open={open} onClose={() => setOpen(false)} title="Заявка на галочку" size="md">
        {open && <RequestForm onDone={() => { setOpen(false); reload(); }} />}
      </Modal>
    </div>
  );
}
