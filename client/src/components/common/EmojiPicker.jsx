import React from 'react';
import { EMOJI_LIST } from '../../config/api';

const EmojiPicker = ({ onSelect, className = '' }) => {
  return (
    <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap gap-2 max-h-24 overflow-y-auto chat-scroll ${className}`}>
      {EMOJI_LIST.map((emoji, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-lg md:text-xl p-0.5 outline-none hover:scale-125 transition-transform select-none"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;