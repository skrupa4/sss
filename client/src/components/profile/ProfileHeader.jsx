import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatRegDate, plural } from '../../utils/format';
import { clanPath, messagesPath, navigate, profilePath } from '../../utils/router';
import { ClanTag, VerifiedBadge } from '../ui/Badges';
import Icon from '../ui/Icons';
import AvatarUploader from './AvatarUploader';
import EditProfileForm from './EditProfileForm';

export default function ProfileHeader({ profile, isOwn, onChange }) {
  const { updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
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
      <div className="h-28 bg-gradient-to-br from-accent/25 via-accent-2/20 to-surface md:h-36" />
      <div className="px-4 pb-5 md:px-7 md:pb-7">
        <div className="-mt-12 flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between">
          <AvatarUploader profile={profile} editable={isOwn} onChanged={applyOwn} />
          <div className="flex flex-wrap justify-center gap-2">
            {isOwn ? (
              !editing && (
                <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/10">
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
                    profile.is_subscribed ? 'border border-line bg-white/[0.04] hover:bg-white/10' : 'bg-accent text-white hover:brightness-110'
                  }`}
                >
                  {profile.is_subscribed ? 'Отписаться' : 'Подписаться'}
                </button>
                <button type="button" onClick={() => navigate(messagesPath(profile.username))} className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/10">
                  <Icon name="chat" className="h-4 w-4" /> Написать
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
          <div className="mt-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h1 className="premium-nick text-2xl font-extrabold tracking-tight">{profile.username}</h1>
              {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
              <ClanTag tag={profile.clan_tag} id={profile.clan_id} />
            </div>
            <p className="text-sm text-muted">@{profile.handle}</p>
            {profile.bio ? (
              <p className="mx-auto mt-3 max-w-xl whitespace-pre-wrap text-[15px] text-ink/85 md:mx-0">{profile.bio}</p>
            ) : (
              isOwn && <p className="mt-3 text-sm text-faint">Добавьте описание — нажмите «Редактировать».</p>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm md:justify-start">
              <span><b className="font-bold">{profile.followers}</b> <span className="text-muted">{plural(profile.followers, 'подписчик', 'подписчика', 'подписчиков')}</span></span>
              <span><b className="font-bold">{profile.following}</b> <span className="text-muted">{plural(profile.following, 'подписка', 'подписки', 'подписок')}</span></span>
              <span><b className="font-bold">{profile.rating}</b> <span className="text-muted">рейтинг</span></span>
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px] text-muted md:justify-start">
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" className="h-4 w-4" /> Регистрация: {formatRegDate(profile.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="shield" className="h-4 w-4" />
                {profile.clan_id ? (
                  <>Клан: <a href={`#${clanPath(profile.clan_id)}`} className="font-medium text-ink hover:text-accent">{profile.clan_name}</a></>
                ) : (
                  <>Без клана{isOwn && <> · <a href="#/clans" className="text-accent hover:underline">найти клан</a></>}</>
                )}
              </span>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-center text-sm text-accent md:text-left" role="alert">{error}</p>}
      </div>
    </section>
  );
}
