import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatRegDate } from '../../utils/format';
import { clanPath, messagesPath, navigate, profilePath } from '../../utils/router';
import Avatar from '../ui/Avatar';
import { ClanTag, VerifiedBadge } from '../ui/Badges';
import Icon from '../ui/Icons';
import Nick from '../ui/Nick';
import AvatarUploader from './AvatarUploader';
import EditProfileForm from './EditProfileForm';
import GiftModal from '../gifts/GiftModal';

function Stat({ value, label }) {
  return (
    <div className="flex-1 rounded-2xl bg-raised/70 px-3 py-3 text-center">
      <p className="text-xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-xs text-muted">{label}</p>
    </div>
  );
}

function InfoRow({ icon, children }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-muted">
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export default function ProfileHeader({ profile, isOwn, achievementsCount, onChange }) {
  const { updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Свои данные обновляем и в профиле, и в глобальном состоянии (меню, посты).
  const applyOwn = (updated) => {
    updateUser(updated);
    onChange({ ...profile, ...updated });
  };

  const toggleFollow = async () => {
    setBusy(true);
    setError('');
    try {
      if (profile.is_subscribed) await api.del(`/api/users/${encodeURIComponent(profile.username)}/follow`);
      else await api.post(`/api/users/${encodeURIComponent(profile.username)}/follow`);
      onChange({
        ...profile,
        is_subscribed: !profile.is_subscribed,
        followers: Math.max(0, profile.followers + (profile.is_subscribed ? -1 : 1)),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="h-28 bg-gradient-to-br from-accent/30 via-accent-2/25 to-surface md:h-36" />
      <div className="px-4 pb-5 md:px-7 md:pb-7">
        <div className="-mt-12 flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between">
          <AvatarUploader editable={isOwn} uploadPath="/api/users/me/avatar" hasImage={profile.avatar_version > 0} onChanged={applyOwn}>
            <Avatar username={profile.username} version={profile.avatar_version} size={104} rounded="rounded-3xl" className="border-4 border-surface shadow-xl" />
          </AvatarUploader>
          <div className="flex flex-wrap justify-center gap-2">
            {isOwn ? (
              !editing && (
                <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl border border-line bg-ink/[0.04] px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink/10">
                  <Icon name="edit" className="h-4 w-4" /> Редактировать
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={busy}
                  className={`rounded-xl px-5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                    profile.is_subscribed ? 'border border-line bg-ink/[0.04] hover:bg-ink/10' : 'bg-accent text-white hover:brightness-110'
                  }`}
                >
                  {profile.is_subscribed ? 'Отписаться' : 'Подписаться'}
                </button>
                <button type="button" onClick={() => navigate(messagesPath(profile.username))} className="flex items-center gap-2 rounded-xl border border-line bg-ink/[0.04] px-4 py-2 text-sm font-semibold transition-colors hover:bg-ink/10">
                  <Icon name="chat" className="h-4 w-4" /> Написать
                </button>
                <button type="button" onClick={() => setGiftOpen(true)} className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-amber-400/20">
                  <Icon name="gift" className="h-4 w-4" /> Подарить
                </button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <EditProfileForm
            profile={profile}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setEditing(false);
              applyOwn(updated);
              // Если сменили ник — адрес профиля тоже меняется.
              if (updated.username !== profile.username) navigate(profilePath(updated.username));
            }}
          />
        ) : (
          <div className="mt-5 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="text-2xl font-extrabold tracking-tight">
                <Nick name={profile.username} color={profile.nick_color} premium={profile.is_premium} />
              </h1>
              {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
              {profile.is_premium && (
                <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400/20 to-orange-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-gold" title="Premium">
                  <Icon name="crown" className="h-3 w-3" fill="currentColor" strokeWidth={1.5} /> Premium
                </span>
              )}
              <ClanTag tag={profile.clan_tag} id={profile.clan_id} />
            </div>
            <p className="text-sm text-muted">@{profile.handle}</p>

            {profile.bio ? (
              <p className="mx-auto mt-3 max-w-xl whitespace-pre-wrap text-[15px] leading-relaxed text-ink/85 md:mx-0">{profile.bio}</p>
            ) : (
              isOwn && <p className="mt-3 text-sm text-faint">Добавьте описание — нажмите «Редактировать».</p>
            )}

            <div className="mt-5 flex gap-2.5">
              <Stat value={profile.followers} label="Подписчиков" />
              <Stat value={profile.following} label="Подписок" />
              <Stat value={achievementsCount ?? '—'} label="Достижений" />
            </div>

            <ul className="mt-4 flex flex-col items-center gap-2 md:items-start">
              <InfoRow icon="calendar">На сайте с {formatRegDate(profile.created_at)}</InfoRow>
              <InfoRow icon="shield">
                {profile.clan_id ? (
                  <>Клан: <a href={`#${clanPath(profile.clan_id)}`} className="font-medium text-ink transition-colors hover:text-accent">{profile.clan_name}</a></>
                ) : (
                  <>Без клана{isOwn && <> · <a href="#/clans" className="text-accent hover:underline">найти клан</a></>}</>
                )}
              </InfoRow>
            </ul>
          </div>
        )}
        {error && <p className="mt-3 text-center text-sm text-accent md:text-left" role="alert">{error}</p>}
        {!isOwn && <GiftModal open={giftOpen} onClose={() => setGiftOpen(false)} toUser={profile.username} />}
      </div>
    </section>
  );
}
