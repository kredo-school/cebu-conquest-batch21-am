/// <reference types="vite/client" />
import React, { useState, memo, useMemo } from 'react';
import { useGameStore, Player, LookupData } from '../store';

interface RankingViewProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onBack: () => void;
}

/**
 * 🏆 RankingView: Territorial Occupancy Leaderboard
 */
export const RankingView: React.FC<RankingViewProps> = memo(({ 
  onOpenSettings, onOpenHelp, onBack
}) => {
  const { players, myId, lookupData } = useGameStore();
  const [filter, setFilter] = useState<'weekly' | 'global'>('weekly');

  const { sortedPlayers, hasActiveData } = useMemo(() => {
    if (!players) return { sortedPlayers: [], hasActiveData: false };

    // 1人でも占領率が0より大きいプレイヤーがいるか判定
    const active = players.some(p => (p.occupancy || 0) > 0);

    const mapped = [...players]
      .sort((a, b) => (b.occupancy || 0) - (a.occupancy || 0))
      .map(player => {
        let islandName = "FRONTIER";
        const locId = player.districtId || player.location;

        if (locId && lookupData?.districts) {
          const typedLookup = lookupData as LookupData;
          let district = typedLookup.districts.get(locId);
          if (!district && typedLookup.spots) {
            const spot = typedLookup.spots.get(locId);
            if (spot) district = typedLookup.districts.get(spot.parentDistrictId);
          }
          if (district) {
            const area = typedLookup.areas?.get(district.parentAreaId);
            if (area) {
              const island = typedLookup.islands?.get(area.parentIslandId);
              if (island) {
                islandName = island.name.toUpperCase();
              }
            }
          }
        }

        return {
          ...player,
          baseIsland: islandName
        };
      });

    return { sortedPlayers: mapped, hasActiveData: active };
  }, [players, lookupData]);

  const topThree = sortedPlayers.slice(0, 3);
  const remaining = sortedPlayers.slice(3);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 font-body selection:bg-orange-500/30 overflow-hidden flex flex-col relative animate-fadeIn">
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; border-radius: 10px; }
        .font-fix { line-height: 1.1; }
      `}</style>

      {/* 1. Navigation */}
      <nav className="flex-none w-full flex justify-between items-center px-6 h-16 z-50 bg-slate-950 border-b border-orange-900/30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-all text-white active:scale-90">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="text-xl font-black text-brand-500 uppercase tracking-tighter font-fix">CEBU CONQUEST // RANKING</div>
        </div>

        <div className="flex items-center gap-2 relative z-50 pointer-events-auto">
          <button 
            onClick={() => { console.log("🔮 RankingView: Help triggered"); onOpenHelp?.(); }} 
            className="p-2 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer relative z-50 pointer-events-auto"
          >
            <span className="material-symbols-outlined">help</span>
          </button>
          <button 
            onClick={() => { console.log("🔮 RankingView: Settings triggered"); onOpenSettings?.(); }} 
            className="p-2 text-slate-500 hover:text-orange-500 transition-colors cursor-pointer relative z-50 pointer-events-auto"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </nav>

      {/* 2. Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar pt-8 pb-20 relative">
        <div className="p-6 max-w-6xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 text-left">
            <div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none font-fix">
                Top Commanders
              </h1>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-2 h-2 bg-orange-600 animate-pulse"></div>
                <p className="text-orange-500 font-black text-[10px] tracking-[0.4em] uppercase font-fix">
                  Neural link sync: Global occupancy ratings
                </p>
              </div>
            </div>
            
            <div className="flex bg-slate-900/60 border border-white/5 p-1 rounded-xl backdrop-blur-sm">
              {['weekly', 'global'].map(type => (
                <button 
                  key={type}
                  onClick={() => setFilter(type as 'weekly' | 'global')}
                  className={`px-8 py-2.5 text-[10px] font-black rounded-lg uppercase transition-all font-fix ${filter === type ? 'bg-orange-600 text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Podium (Top 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-end">
            
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="order-2 md:order-1 bg-slate-900/40 border border-white/5 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[260px] relative group hover:border-orange-500/30 transition-all shadow-xl">
                <div className="absolute top-4 left-4 text-4xl font-black italic opacity-5 font-fix">02</div>
                
                {/* 🚀 修正ポイント: GDD・スクショ準拠のスタイリッシュな NO IMAGE プレートに変更 */}
                <div className="w-20 h-20 bg-slate-900/80 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center mb-4 shadow-md shrink-0">
                  <div className="text-[11px] font-black text-slate-500 tracking-wider font-mono">NO</div>
                  <div className="text-[11px] font-black text-slate-500 tracking-wider font-mono -mt-1">IMAGE</div>
                </div>

                {hasActiveData ? (
                  <>
                    <h3 className="text-xl font-black text-white font-fix uppercase mb-1">{topThree[1].playerName || topThree[1].username}</h3>
                    <span className="text-[9px] font-black text-orange-500/60 tracking-widest uppercase mb-4 font-fix italic">{topThree[1].baseIsland} Origin</span>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                      <div className="bg-orange-600 h-full opacity-60" style={{ width: `${topThree[1].occupancy}%` }}></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold font-fix uppercase">Occupancy: {topThree[1].occupancy}%</p>
                  </>
                ) : (
                  <>
                    <div className="text-slate-500 font-bold tracking-widest text-[11px] font-mono mb-4">AWAITING ADDR...</div>
                    <p className="text-[10px] text-slate-500 font-bold font-fix uppercase">Occupancy: 0%</p>
                  </>
                )}
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="order-1 md:order-2 bg-slate-900/60 border-2 border-orange-500/40 p-12 rounded-3xl flex flex-col items-center justify-center min-h-[320px] relative transform scale-110 shadow-[0_0_60px_rgba(234,88,12,0.15)] z-10 backdrop-blur-md">
                <div className="absolute top-4 right-8 text-7xl font-black italic text-orange-500 opacity-10 font-fix">01</div>
                
                {/* 🚀 修正ポイント: スクショに合わせたゴールド調のハイライト付き NO IMAGE プレートに変更 */}
                <div className="w-24 h-24 bg-gradient-to-b from-amber-600/20 to-slate-900 border-2 border-amber-500/50 rounded-2xl flex flex-col items-center justify-center mb-5 shadow-[0_0_15px_rgba(217,119,6,0.15)] shrink-0">
                  <div className="text-xs font-black text-amber-500 tracking-widest font-mono">NO</div>
                  <div className="text-xs font-black text-amber-500 tracking-widest font-mono -mt-1">IMAGE</div>
                </div>

                {hasActiveData ? (
                  <>
                    <h3 className="text-3xl font-black text-white font-fix uppercase italic tracking-tighter mb-2">{topThree[0].playerName || topThree[0].username}</h3>
                    <span className="text-[11px] font-black text-orange-500 tracking-[0.4em] uppercase mb-8 font-fix">{topThree[0].baseIsland} Dominator</span>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-4 border border-white/5">
                      <div className="bg-orange-600 h-full shadow-[0_0_20px_#ea580c]" style={{ width: `${topThree[0].occupancy}%` }}></div>
                    </div>
                    <p className="text-white text-xs font-black font-fix uppercase tracking-widest">Global Control: {topThree[0].occupancy}%</p>
                  </>
                ) : (
                  <>
                    <div className="text-slate-400 font-bold tracking-[0.15em] text-[11px] font-mono mb-6 uppercase">Grid Initializing...</div>
                    <p className="text-white text-xs font-black font-fix uppercase tracking-widest">Occupancy: 0%</p>
                  </>
                )}
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="order-3 bg-slate-900/40 border border-white/5 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[260px] relative group hover:border-orange-500/30 transition-all shadow-xl">
                <div className="absolute top-4 left-4 text-4xl font-black italic opacity-5 font-fix">03</div>
                
                {/* 🚀 修正ポイント: GDD・スクショ準拠のスタイリッシュな NO IMAGE プレートに変更 */}
                <div className="w-20 h-20 bg-slate-900/80 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center mb-4 shadow-md shrink-0">
                  <div className="text-[11px] font-black text-slate-500 tracking-wider font-mono">NO</div>
                  <div className="text-[11px] font-black text-slate-500 tracking-wider font-mono -mt-1">IMAGE</div>
                </div>

                {hasActiveData ? (
                  <>
                    <h3 className="text-xl font-black text-white font-fix uppercase mb-1">{topThree[2].playerName || topThree[2].username}</h3>
                    <span className="text-[9px] font-black text-orange-500/60 tracking-widest uppercase mb-4 font-fix italic">{topThree[2].baseIsland} Origin</span>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2">
                      <div className="bg-orange-600 h-full opacity-40" style={{ width: `${topThree[2].occupancy}%` }}></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold font-fix uppercase">Occupancy: {topThree[2].occupancy}%</p>
                  </>
                ) : (
                  <>
                    <div className="text-slate-500 font-bold tracking-widest text-[11px] font-mono mb-4">AWAITING ADDR...</div>
                    <p className="text-[10px] text-slate-500 font-bold font-fix uppercase">Occupancy: 0%</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* List View */}
          <div className="grid gap-2 text-left">
            {remaining.map((player: Player, index: number) => {
              const isMe = player.id === myId;
              return (
                <div key={player.id} className={`group flex items-center p-4 rounded-xl border transition-all ${
                  isMe ? 'bg-orange-600/10 border-orange-500/40 shadow-lg' : 'bg-slate-900/30 border-white/5 hover:border-white/10'
                }`}>
                  <span className="w-10 text-xl font-black italic text-slate-700 font-fix shrink-0">
                    {(index + 4).toString().padStart(2, '0')}
                  </span>
                  
                  {/* 画像アイコンの代わりに、サイバーパンクな四角いドットドットインジケーターを設置 */}
                  <div className="w-2 h-6 bg-slate-900 border border-white/10 mr-6 shrink-0 rounded-sm group-hover:bg-orange-500 group-hover:border-orange-400 transition-colors"></div>

                  <div className="flex-1 flex items-baseline gap-4 min-w-0">
                    <h4 className={`text-sm font-black uppercase font-fix truncate ${isMe ? 'text-orange-500' : 'text-white'}`}>
                      {player.playerName || player.username} {isMe && "(YOU)"}
                    </h4>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-800/80 text-slate-400 font-black rounded uppercase font-fix tracking-tighter shrink-0">
                      {player.baseIsland}
                    </span>
                    <div className="hidden lg:block h-px flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                  </div>

                  <div className="text-right ml-6 shrink-0">
                    <div className={`text-xl font-black font-fix ${isMe ? 'text-orange-500' : 'text-slate-500'}`}>
                      {hasActiveData ? `${player.occupancy || 0}%` : '0%'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
});

export default RankingView;