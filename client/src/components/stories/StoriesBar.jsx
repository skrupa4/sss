import { useCallback, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToasts } from '../../context/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { useSocketEvent } from '../../hooks/useSocketEvent';
import { navigate } from '../../utils/router';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icons';
import Modal from '../ui/Modal';
import StoryComposer from './StoryComposer';
import StoryViewer from './StoryViewer';

function Ring({ group, label, onClick, children, plus, onPlus }) {
  const gradient = group?.has_unseen || group?.is_me;
  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={`rounded-full p-[3px] transition-transform active:scale-95 ${gradient ? 'bg-gradient-to-tr from-accent via-fuchsia-500 to-accent-2' : 'bg-ink/15'}`}
        >
          <span className="block rounded-full border-[3px] border-bg">{children}</span>
        </button>
        {plus && (
          <button type="button" onClick={onPlus} aria-label="Добавить сторис" className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-accent text-white transition hover:scale-110">
            <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
      </div>
      <span className="w-full truncate text-center text-xs text-muted">{label}</span>
    </div>
  );
}

/** Кружки сторис над лентой. Публиковать могут только пользователи Premium. */
export default function StoriesBar() {
  const { user } = useAuth();
  const { push } = useToasts();
  const loader = useCallback(() => api.get('/api/stories'), []);
  const { data: groups, reload } = useAsync(loader, []);
  // Снимок списка на время просмотра: порядок кружков не должен «прыгать» под зрителем.
  const [viewer, setViewer] = useState(null); // { groups, index }
  const [composing, setComposing] = useState(false);
  const [upsell, setUpsell] = useState(false);

  // Новые сторис появляются сами.
  useSocketEvent('story:new', reload);
  useSocketEvent('story:removed', reload);

  const mine = groups?.find((g) => g.is_me);
  const startCompose = () => (user.is_premium ? setComposing(true) : setUpsell(true));

  return (
    <section aria-label="Сторис" className="rounded-2xl border border-line bg-surface px-4 py-3.5">
      <div className="hide-scrollbar flex gap-3 overflow-x-auto">
        <Ring
          group={mine}
          label="Ваша"
          plus
          onPlus={startCompose}
          onClick={() => (mine ? setViewer({ groups, index: groups.indexOf(mine) }) : startCompose())}
        >
          <Avatar username={user.username} version={user.avatar_version} size={58} rounded="rounded-full" />
        </Ring>

        {groups?.filter((g) => !g.is_me).map((g) => (
          <Ring key={g.username} group={g} label={g.username} onClick={() => setViewer({ groups, index: groups.indexOf(g) })}>
            <Avatar username={g.username} version={g.avatar_version} size={58} rounded="rounded-full" />
          </Ring>
        ))}

        {groups && groups.length <= 1 && (
          <p className="self-center pl-2 text-sm text-faint">Здесь появятся сторис тех, на кого вы подписаны.</p>
        )}
      </div>

      {viewer && (
        <StoryViewer groups={viewer.groups} startIndex={viewer.index} onClose={() => { setViewer(null); reload(); }} />
      )}

      <StoryComposer open={composing} onClose={() => setComposing(false)} onPublished={() => { reload(); push({ type: 'success', title: 'Сторис опубликована', body: 'Она будет видна 24 часа.' }); }} />

      <Modal open={upsell} onClose={() => setUpsell(false)} title="Сторис — для Premium" size="sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg shadow-orange-500/30">🎬</div>
          <p className="text-[15px] leading-relaxed text-muted">Публикуйте вертикальные сторис, которые видят подписчики. Сейчас Premium можно активировать бесплатно.</p>
          <button type="button" onClick={() => { setUpsell(false); navigate('/premium'); }} className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition hover:brightness-110">
            Подробнее о Premium
          </button>
        </div>
      </Modal>
    </section>
  );
}
