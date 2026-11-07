import { useState } from 'react';
import Icon from './Icons';

const EMOJIS = ['😀', '😂', '🤣', '😊', '😍', '😘', '😜', '😎', '🔥', '👑', '💎', '✨', '💀', '🤡', '👻', '👾', '❤️', '💔', '💯', '👍', '👎', '✊', '✌️', '🚀', '💵', '🪐'];

export default function EmojiPicker({ onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Эмодзи"
        aria-expanded={open}
        className={`rounded-xl border p-2 transition-colors ${open ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line bg-raised text-muted hover:text-ink'}`}
      >
        <Icon name="smile" className="h-5 w-5" />
      </button>
      {open && (
        <div className="pop-in scroll-thin absolute bottom-full left-0 z-20 mb-2 grid max-h-44 w-64 grid-cols-7 gap-1 overflow-y-auto rounded-2xl border border-line bg-raised p-2 shadow-2xl">
          {EMOJIS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => onPick(emoji)} className="rounded-lg p-1 text-xl hover:bg-white/10">
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
