// src/components/BuffCards.tsx
import React, { memo } from 'react';
import { useGameStore } from '../store';

// 🚀 最適化：React.memoでラップし、バフデータが不変なら再描画をスキップ
export const BuffCards: React.FC = memo(() => {
  // 🚀 最適化：必要なバフ配列とルックアップ辞書だけを個別に取得
  const activeBuffs = useGameStore(state => state.activeBuffs);
  const lookupData = useGameStore(state => state.lookupData); // ✅ GDD v3.1: ルックアップ辞書を追加

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
        // ✅ GDD v3.1: lookupData を使って安全に所属島とユニット情報を取得
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
            // 表示用のユニットID (例: 11101 なら 01 の部分。下2桁)
            unitId = spot.id % 100;
          }
        }

        return (
          <div 
            key={buff.id} 
            className="group relative bg-slate-900/60 backdrop-blur-sm border-l-2 border-orange-500 p-3 rounded-r-lg shadow-lg overflow-hidden transition-all hover:bg-slate-800/80"
          >
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-orange-500/10 text-[8px] font-mono text-orange-500/60 font-bold font-fix group-hover:text-orange-500 transition-colors">
              U-{String(unitId).padStart(2, '0')} {/* ✅ 下2桁でパディング */}
            </div>
            
            <div className="relative z-10 text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></span>
                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest opacity-80 font-fix line-clamp-1">
                  {islandName} SPECIALTY
                </span>
              </div>

              <div className="text-xs font-black text-white uppercase italic tracking-wider mb-1 font-fix line-clamp-1">
                {buff.name}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[9px] text-emerald-500 font-black tracking-tighter font-fix shrink-0">
                  [ ACTIVE ]
                </span>
                <span className="text-[10px] text-emerald-400 font-bold tracking-tight font-fix line-clamp-1">
                  {buff.effect}
                </span>
              </div>

              <div className="flex gap-0.5 mt-2">
                <div className="h-0.5 w-8 bg-orange-500/60"></div>
                <div className="h-0.5 w-1 bg-orange-500/30"></div>
                <div className="h-0.5 w-1 bg-orange-500/10"></div>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/0 via-orange-500/5 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </div>
        );
      })}
      
      <style>{`
        .font-fix { line-height: 1.2; }
      `}</style>
    </div>
  );
});