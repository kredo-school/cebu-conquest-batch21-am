import React from 'react';
import { useGameStore } from '../store';

export const BuffCards: React.FC = () => {
  const { activeBuffs } = useGameStore();

  // 🚀 バフがない時はシステムログ風に表示
  if (activeBuffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 opacity-30">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-2"></div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
          - NO SPECIALTY DATA -
        </p>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent mt-2"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-4 w-full">
      {activeBuffs.map((buff) => (
        <div 
          key={buff.id} 
          className="group relative bg-slate-900/60 backdrop-blur-sm border-l-2 border-brand-500 p-3 rounded-r-lg shadow-lg overflow-hidden transition-all hover:bg-slate-800/80"
        >
          {/* 背景の装飾チップ */}
          <div className="absolute top-0 right-0 w-8 h-8 bg-brand-500/5 rotate-45 translate-x-4 -translate-y-4"></div>
          
          <div className="relative z-10">
            {/* ラベル */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1 h-1 bg-brand-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] font-black text-brand-500 uppercase tracking-widest opacity-80">
                Tactical Specialty
              </span>
            </div>

            {/* バフ名 */}
            <div className="text-xs font-black text-white uppercase italic tracking-wider mb-1">
              {buff.name}
            </div>

            {/* 効果内容 */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-emerald-500 font-black tracking-tighter">
                [ ACTIVE ]
              </span>
              <span className="text-[11px] text-emerald-400 font-bold tracking-tight">
                {buff.effect}
              </span>
            </div>

            {/* 下部の装飾バー */}
            <div className="flex gap-0.5 mt-2">
              <div className="h-0.5 w-8 bg-brand-500/60"></div>
              <div className="h-0.5 w-1 bg-brand-500/30"></div>
              <div className="h-0.5 w-1 bg-brand-500/10"></div>
            </div>
          </div>

          {/* ホバー時のスキャンライン演出 */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-500/0 via-brand-500/5 to-brand-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
      ))}
    </div>
  );
};