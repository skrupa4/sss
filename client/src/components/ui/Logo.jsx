export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { tile: 'h-8 w-8 rounded-xl text-lg', text: 'text-xl' },
    md: { tile: 'h-10 w-10 rounded-xl text-2xl', text: 'text-2xl' },
    lg: { tile: 'h-16 w-16 rounded-2xl text-4xl', text: 'text-4xl' },
  }[size];
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span className={`logo-tile flex items-center justify-center font-black leading-none text-white ${sizes.tile}`}>S</span>
      <span className={`font-black tracking-tight text-ink ${sizes.text}`}>SSS</span>
    </span>
  );
}
