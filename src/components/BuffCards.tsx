// src/components/BuffCards.tsx
import React, { memo } from 'react';
import { useGameStore } from '../store';

// 🚀 自動で効果を判別して、5種類のデザイン（色・アイコン）を返す魔法の関数
const getBuffStyle = (effect: string = '') => {
  const e = effect.toUpperCase();
  // ⚔️ ATK (攻撃)
  if (e.includes('ATK') || e.includes('攻撃')) {
    return { type: 'ATK', icon: 'swords', border: 'border-red-500', text: 'text-red-500', bg: 'bg-red-500/10', badge: 'bg-red-500/20', line: 'bg-red-500/60', gradient: 'from-red-500/0 via-red-500/5 to-red-500/0' };
  }
  // 🛡️ DEF (防御)
  if (e.includes('DEF') || e.includes('防御')) {
    return { type: 'DEF', icon: 'shield', border: 'border-blue-500', text: 'text-blue-500', bg: 'bg-blue-500/10', badge: 'bg-blue-500/20', line: 'bg-blue-500/60', gradient: 'from-blue-500/0 via-blue-500/5 to-blue-500/0' };
  }
  // 💚 HP (体力)
  if (e.includes('HP') || e.includes('体力') || e.includes('回復')) {
    return { type: 'HP', icon: 'favorite', border: 'border-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10', badge: 'bg-emerald-500/20', line: 'bg-emerald-500/60', gradient: 'from-emerald-500/0 via-emerald-500/5 to-emerald-500/0' };
  }
  // ⚡ AP (スタミナ/行動力)
  if (e.includes('AP') || e.includes('行動') || e.includes('スタミナ')) {
    return { type: 'AP', icon: 'bolt', border: 'border-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20', line: 'bg-amber-500/60', gradient: 'from-amber-500/0 via-amber-500/5 to-amber-500/0' };
  }
  // ✨ FAITH (信仰)
  if (e.includes('FAITH') || e.includes('信仰') || e.includes('神')) {
    return { type: 'FAITH', icon: 'auto_awesome', border: 'border-fuchsia-500', text: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', badge: 'bg-fuchsia-500/20', line: 'bg-fuchsia-500/60', gradient: 'from-fuchsia-500/0 via-fuchsia-500/5 to-fuchsia-500/0' };
  }
  // 📦 その他 (デフォルト)
  return { type: 'BUFF', icon: 'extension', border: 'border-orange-500', text: 'text-orange-500', bg: 'bg-orange-500/10', badge: 'bg-orange-500/20', line: 'bg-orange-500/60', gradient: 'from-orange-500/0 via-orange-500/5 to-orange-500/0' };
};

export const BuffCards: React.FC = memo(() => {
  const activeBuffs = useGameStore(state => state.activeBuffs);
  const lookupData = useGameStore(state => state.lookupData);

  if (!activeBuffs || activeBuffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 opacity-30">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-2"></div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">
          - NO SPECIALTY DATA -
        </p>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent mt-2"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-4 w-full">
      {activeBuffs.map((buff) => {
        let islandName = "UNKNOWN";
        let unitId = buff.id;

        if (lookupData && lookupData.spots && lookupData.districts && lookupData.areas && lookupData.islands) {
          const spot = lookupData.spots.get(buff.id);
          if (spot) {
            const district = lookupData.districts.get(spot.parentDistrictId);
            if (district) {
              const area = lookupData.areas.get(district.parentAreaId);
              if (area) {
                const island = lookupData.islands.get(area.parentIslandId);
                if (island) {
                  islandName = island.name.toUpperCase();
                }
              }
            }
            unitId = spot.id % 100;
          }
        }

        // 🚀 バフの効果テキストからデザインスタイルを取得！
        const style = getBuffStyle(buff.effect);

        return (
          <div 
            key={buff.id} 
            className={`group relative bg-slate-900/60 backdrop-blur-sm border-l-2 ${style.border} p-3 rounded-r-lg shadow-lg overflow-hidden transition-all hover:bg-slate-800/80`}
          >
            {/* 右上の小さな識別コード */}
            <div className={`absolute top-0 right-0 px-2 py-0.5 ${style.badge} text-[8px] font-mono ${style.text} opacity-60 font-bold font-fix group-hover:opacity-100 transition-opacity`}>
              U-{String(unitId).padStart(2, '0')}
            </div>
            
            <div className="relative z-10 text-left">
              <div className="flex items-center gap-1.5 mb-1">
                {/* 🚀 種類ごとのマテリアルアイコンを配置 */}
                <span className={`material-symbols-outlined text-[12px] ${style.text}`}>
                  {style.icon}
                </span>
                <span className={`text-[8px] font-black ${style.text} uppercase tracking-widest opacity-80 font-fix line-clamp-1`}>
                  {islandName} SPECIALTY [{style.type}]
                </span>
              </div>

              <div className="text-xs font-black text-white uppercase italic tracking-wider mb-1 font-fix line-clamp-1">
                {buff.name}
              </div>

              <div className="flex items-center gap-1">
                <span className={`text-[9px] ${style.text} font-black tracking-tighter font-fix shrink-0`}>
                  [ ACTIVE ]
                </span>
                <span className="text-[10px] text-slate-300 font-bold tracking-tight font-fix line-clamp-1">
                  {buff.effect}
                </span>
              </div>

              {/* 装飾ラインもテーマカラーに */}
              <div className="flex gap-0.5 mt-2 opacity-80">
                <div className={`h-0.5 w-8 ${style.line}`}></div>
                <div className={`h-0.5 w-1 ${style.line} opacity-50`}></div>
                <div className={`h-0.5 w-1 ${style.line} opacity-20`}></div>
              </div>
            </div>

            {/* 背景のグラデーションもテーマカラーに */}
            <div className={`absolute inset-0 bg-gradient-to-b ${style.gradient} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>
            
            {/* 🚀 背景にうっすら巨大なアイコンを透かして表示（超サイバーパンク！） */}
            <span className={`material-symbols-outlined absolute -right-2 -bottom-2 text-[60px] ${style.text} opacity-[0.05] pointer-events-none rotate-12 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500`}>
              {style.icon}
            </span>
          </div>
        );
      })}
      
      <style>{`
        .font-fix { line-height: 1.2; }
      `}</style>
    </div>
  );
});