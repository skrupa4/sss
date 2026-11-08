import { useEffect, useState } from 'react';
import { api, fetchBlobUrl } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { formatRegDate, timeAgo } from '../../utils/format';
import { profilePath } from '../../utils/router';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import { EmptyState, ErrorState, Spinner } from '../ui/Spinner';
import { useAdminAction } from './useAdminAction';

const FILTERS = [
  { id: 'pending', label: 'На рассмотрении' },
  { id: 'approved', label: 'Одобренные' },
  { id: 'rejected', label: 'Отклонённые' },
];

const STATUS = {
  pending: ['на рассмотрении', 'bg-amber-400/10 text-amber-300'],
  approved: ['одобрена', 'bg-ok/10 text-ok'],
  rejected: ['отклонена', 'bg-red-500/10 text-red-400'],
};

// Фото доступно только админу, поэтому грузим его через fetch с токеном.
function ProofPhoto({ id, onOpen }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url = null;
    let cancelled = false;
    fetchBlobUrl(`/api/admin/verifications/${id}/photo`)
      .then((u) => { url = u; if (cancelled) URL.revokeObjectURL(u); else setSrc(u); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [id]);

  if (failed) return <div className="flex h-40 items-center justify-center rounded-xl bg-raised text-sm text-muted">Фото не загрузилось</div>;
  if (!src) return <div className="flex h-40 items-center justify-center rounded-xl bg-raised"><div className="spinner" /></div>;
  return (
    <button type="button" onClick={() => onOpen(src)} className="block w-full overflow-hidden rounded-xl bg-raised" aria-label="Открыть фото крупно">
      <img src={src} alt="Фото к заявке" className="max-h-64 w-full object-contain" />
    </button>
  );
}

function RequestCard({ r, busy, onReview, onOpenPhoto }) {
  const [note, setNote] = useState('');
  const [status, label] = [STATUS[r.status][1], STATUS[r.status][0]];
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar username={r.username} version={r.avatar_version} size={44} />
        <div className="min-w-0 flex-1">
          <a href={`#${profilePath(r.username)}`} className="block truncate text-sm font-semibold hover:text-accent">{r.username}</a>
          <p className="truncate text-xs text-muted">@{r.handle} · на сайте с {formatRegDate(r.user_created_at)} · подписчиков: {r.followers}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${status}`}>{label}</span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90">{r.reason}</p>
      <p className="mt-1 text-xs text-faint">{timeAgo(r.created_at)}</p>
      <div className="mt-3"><ProofPhoto id={r.id} onOpen={onOpenPhoto} /></div>

      {r.status === 'pending' ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="input !py-2 text-sm" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Комментарий пользователю (необязательно)" />
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={busy} onClick={() => onReview(r, 'approve', note)} className="rounded-xl bg-ok/90 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50">Одобрить</button>
            <button type="button" disabled={busy} onClick={() => onReview(r, 'reject', note)} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50">Отклонить</button>
          </div>
        </div>
      ) : (
        r.admin_note && <p className="mt-3 text-sm text-muted">Комментарий: {r.admin_note}</p>
      )}
    </li>
  );
}

export default function VerificationsTab() {
  const [filter, setFilter] = useState('pending');
  const [photo, setPhoto] = useState(null);
  const { data, loading, error, reload } = useAsync(() => api.get(`/api/admin/verifications?status=${filter}`), [filter]);
  const { run, busyId } = useAdminAction(reload);

  const onReview = (r, action, note) =>
    run(r.id, () => api.post(`/api/admin/verifications/${r.id}/${action}`, { note }), action === 'approve' ? 'Галочка выдана' : 'Заявка отклонена');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${filter === f.id ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'}`}>
            {f.label}
          </button>
        ))}
      </div>
      {loading && !data && <Spinner />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState>{filter === 'pending' ? 'Новых заявок нет.' : 'Здесь пока пусто.'}</EmptyState>}
      <ul className="flex flex-col gap-2">
        {data?.map((r) => <RequestCard key={r.id} r={r} busy={busyId === r.id} onReview={onReview} onOpenPhoto={setPhoto} />)}
      </ul>
      <Modal open={Boolean(photo)} onClose={() => setPhoto(null)} title="Фото к заявке" size="lg">
        {photo && <img src={photo} alt="Фото к заявке" className="mx-auto max-h-[70dvh] rounded-xl object-contain" />}
      </Modal>
    </div>
  );
}
