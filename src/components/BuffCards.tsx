import React, { memo } from 'react'; // 🚀 memoをインポート
import { useGameStore } from '../store';

// 🚀 島ID定数（コンポーネント外に配置し、再定義を防止）
const ISLAND_NAMES: Record<number, string> = {
  11: "CEBU",
  12: "MACTAN",
  13: "BOHOL",
  14: "NEGROS",
  15: "SIQUIJOR"
};

// 🚀 最適化：React.memoでラップし、バフデータが不変なら再描画をスキップ
export const BuffCards: React.FC = memo(() => {
  // 🚀 最適化：必要なバフ配列だけを個別に取得
  const activeBuffs = useGameStore(state => state.activeBuffs);

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
        const islandId = Math.floor(buff.id / 1000);
        const unitId = buff.id % 1000;
        const islandName = ISLAND_NAMES[islandId] || "UNKNOWN";

        return (
          <div 
            key={buff.id} 
            className="group relative bg-slate-900/60 backdrop-blur-sm border-l-2 border-orange-500 p-3 rounded-r-lg shadow-lg overflow-hidden transition-all hover:bg-slate-800/80"
          >
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-orange-500/10 text-[8px] font-mono text-orange-500/60 font-bold font-fix group-hover:text-orange-500 transition-colors">
              U-{unitId}
            </div>
            
            <div className="relative z-10 text-left">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></span>
                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest opacity-80 font-fix">
                  {islandName} SPECIALTY
                </span>
              </div>

              <div className="text-xs font-black text-white uppercase italic tracking-wider mb-1 font-fix">
                {buff.name}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[9px] text-emerald-500 font-black tracking-tighter font-fix">
                  [ ACTIVE ]
                </span>
                <span className="text-[10px] text-emerald-400 font-bold tracking-tight font-fix">
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