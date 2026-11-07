import { clanPath } from '../../utils/router';
import Icon from './Icons';

export function VerifiedBadge({ className = 'h-4 w-4' }) {
  return (
    <span className={`inline-flex ${className} shrink-0 items-center justify-center rounded-full bg-accent text-white`} title="Подтверждённый аккаунт">
      <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  );
}

export function ClanTag({ tag, id }) {
  if (!tag) return null;
  const classes = 'inline-flex shrink-0 items-center rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-accent';
  if (!id) return <span className={classes}>{tag}</span>;
  return <a href={`#${clanPath(id)}`} className={`${classes} hover:bg-accent/20`}>{tag}</a>;
}
