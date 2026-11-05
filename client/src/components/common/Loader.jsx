import React from 'react';

const Loader = ({ show, text = 'Загрузка данных...' }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-[#080808] z-[9999] flex flex-col gap-4 items-center justify-center">
      <div className="w-10 h-10 border-3 border-white/5 border-t-[#ff2a5f] rounded-full animate-spin shadow-[0_0_15px_#ff2a5f]" />
      <div className="text-gray-500 font-black uppercase text-[10px] tracking-[0.25em]">
        {text}
      </div>
    </div>
  );
};

export default Loader;