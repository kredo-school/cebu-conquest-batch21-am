// src/components/layout/GlobalNavbar.tsx

import React from 'react';
// ※ isServerOnline を使用しなくなったため、useGameStore が他で不要であればインポートごと削除しても構いません。
// import { useGameStore } from '../../store'; 

interface Props {
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenRanking?: () => void;
  onAbort?: () => void;
}

export const GlobalNavbar: React.FC<Props> = ({ 
  onOpenSettings, onOpenHelp, onOpenRanking, onAbort 
}) => {

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-white/5 shadow-md">
      <div className="flex items-center gap-6">
        <span className="text-2xl font-black text-orange-600 uppercase tracking-tighter font-fix select-none">
          CEBU CONQUEST
        </span>
      </div>
      <div className="flex gap-4 items-center">
        {onOpenRanking && (
          <button onClick={onOpenRanking} className="text-slate-500 hover:text-white p-2 transition-all group" title="LEADERBOARD">
            <span className="material-symbols-outlined group-hover:text-orange-500">leaderboard</span>
          </button>
        )}
        {onOpenHelp && (
          <button onClick={onOpenHelp} className="text-slate-500 hover:text-white p-2 transition-all group" title="HELP">
            <span className="material-symbols-outlined group-hover:text-cyan-300">help</span>
          </button>
        )}
        {onOpenSettings && (
          <button onClick={onOpenSettings} className="text-slate-500 hover:text-white p-2 transition-all group" title="SETTINGS">
            <span className="material-symbols-outlined group-hover:text-orange-500">settings</span>
          </button>
        )}
        {onAbort && (
          <button onClick={onAbort} className="text-red-500 hover:text-red-400 font-black text-[10px] tracking-widest px-4 py-2 border border-red-900/30 rounded-lg transition-all font-fix uppercase">
            Abort
          </button>
        )}
      </div>
    </nav>
  );
};