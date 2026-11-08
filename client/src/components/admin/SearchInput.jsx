import Icon from '../ui/Icons';

export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
      <input className="input !pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
