// src/components/RankingView.tsx
import React, { useState, useMemo, memo } from 'react';
import { useGameStore } from '../store';

interface RankingViewProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onBack: () => void;
}

export const RankingView: React.FC<RankingViewProps> = memo(({ 
  onOpenSettings, onOpenHelp, onBack
}) => {
  // ✅ GDD v3.1: lookupDataを追加で取得
  const { players, myId, districts, lookupData } = useGameStore();
  const [filter, setFilter] = useState<'weekly' | 'global'>('weekly');

  // 🚀 最適化：ランキング計算をメモ化
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => (b.occupancy || 0) - (a.occupancy || 0))
      .map(player => {
        // ✅ GDD v3.1: lookupData から動的に島名を取得
        let islandName = "FRONTIER";
        
        // プレイヤーの現在位置（未設定の場合はフォールバック値を使用）
        const locId = player.districtId || player.location || (player.id === 'p1' ? 131 : 111);

        if (lookupData && lookupData.districts && lookupData.areas && lookupData.islands) {
          // locIdがspot(5桁)かdistrict(3桁)か両方に対応して逆引き
          let district = lookupData.districts.get(locId);
          if (!district && lookupData.spots) {
            const spot = lookupData.spots.get(locId);
            if (spot) district = lookupData.districts.get(spot.parentDistrictId);
          }

          if (district) {
            const area = lookupData.areas.get(district.parentAreaId);
            if (area) {
              const island = lookupData.islands.get(area.parentIslandId);
              if (island) islandName = island.name.toUpperCase();
            }
          }
        }

        return {
          ...player,
          baseIsland: islandName
        };
      });
  }, [players, lookupData]);

  const topThree = sortedPlayers.slice(0, 3);
  const remaining = sortedPlayers.slice(3);
  const myRank = sortedPlayers.findIndex(p => p.id === myId) + 1;
  const me = sortedPlayers.find(p => p.id === myId);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 font-body selection:bg-orange-500/30 overflow-hidden flex flex-col relative animate-fadeIn">
      
      {/* 1. Navigation */}
      <nav className="flex-none w-full flex justify-between items-center px-6 h-16 z-50 bg-slate-900/80 backdrop-blur-md border-b border-orange-500/30 shadow-lg shadow-orange-900/10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="text-xl font-black text-orange-500 tracking-tighter uppercase font-fix">CEBU CONQUEST</div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[10px] font-black tracking-[0.2em] uppercase">
          <span className="text-slate-500 hover:text-white cursor-pointer transition-colors font-fix">Archive</span>
          <span className="text-orange-500 border-b-2 border-orange-500 pb-1 font-fix">Active Ranking</span>
          <span className="text-slate-500 hover:text-white cursor-pointer transition-colors font-fix">Hall of Fame</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onOpenHelp} className="p-2 hover:bg-slate-800 rounded-lg transition-all">
            <span className="material-symbols-outlined text-cyan-400">help</span>
          </button>
          <button onClick={onOpenSettings} className="p-2 hover:bg-slate-800 rounded-lg transition-all">
            <span className="material-symbols-outlined text-slate-400">settings</span>
          </button>
        </div>
      </nav>

      {/* 2. Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar pt-8 pb-40 relative">
        <div className="relative z-10 p-6 max-w-6xl mx-auto text-left">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic font-fix mb-2">
                TOP COMMANDERS
              </h1>
              <p className="text-orange-500 font-bold text-xs tracking-[0.3em] uppercase font-fix flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
                Regional Power Distribution Update
              </p>
            </div>
            
            <div className="flex bg-slate-900 border border-white/10 p-1 rounded-xl">
              {['weekly', 'global'].map(type => (
                <button 
                  key={type}
                  onClick={() => setFilter(type as any)}
                  className={`px-6 py-2 text-[10px] font-black rounded-lg uppercase transition-all font-fix ${filter === type ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Podium (Top 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="order-2 md:order-1 bg-slate-900/40 backdrop-blur-sm border border-white/5 p-8 rounded-2xl flex flex-col items-center relative group hover:border-orange-500/30 transition-all">
                <div className="absolute top-4 left-4 text-4xl font-black italic opacity-10 font-fix">02</div>
                <div className="w-24 h-24 rounded-full border-2 border-slate-700 p-1 mb-4 relative">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[1].name}`} className="w-full h-full object-cover rounded-full bg-slate-800" alt="" />
                  <div className="absolute -bottom-1 -right-1 bg-slate-800 border border-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-sm">shield</span>
                  </div>
                </div>
                <h3 className="text-xl font-black text-white font-fix uppercase">{topThree[1].name}</h3>
                <span className="text-[9px] font-black text-orange-500/60 tracking-widest uppercase mb-4 font-fix">Origin: {topThree[1].baseIsland}</span>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mb-2">
                  <div className="bg-orange-500/50 h-full" style={{ width: `${topThree[1].occupancy}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-500 font-bold font-fix uppercase">Occupancy: {topThree[1].occupancy}%</p>
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="order-1 md:order-2 bg-slate-900/60 backdrop-blur-md border-2 border-orange-500/50 p-10 rounded-3xl flex flex-col items-center relative transform scale-105 shadow-[0_0_50px_rgba(249,115,22,0.15)]">
                <div className="absolute top-4 right-6 text-6xl font-black italic text-orange-500 opacity-20 font-fix">01</div>
                <div className="w-32 h-32 rounded-full border-4 border-orange-500 p-1.5 mb-6 relative">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[0].name}`} className="w-full h-full object-cover rounded-full bg-slate-800" alt="" />
                  <div className="absolute -bottom-2 -right-2 bg-orange-600 w-12 h-12 rounded-full flex items-center justify-center shadow-lg text-white">
                    <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white font-fix uppercase">{topThree[0].name}</h3>
                <span className="text-[10px] font-black text-orange-500 tracking-[0.3em] uppercase mb-6 font-fix">{topThree[0].baseIsland} Dominator</span>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-orange-500 h-full shadow-[0_0_15px_#f97316]" style={{ width: `${topThree[0].occupancy}%` }}></div>
                </div>
                <p className="text-white text-xs font-black font-fix uppercase tracking-tighter">Current Control: {topThree[0].occupancy}%</p>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="order-3 bg-slate-900/40 backdrop-blur-sm border border-white/5 p-8 rounded-2xl flex flex-col items-center relative group hover:border-orange-500/30 transition-all">
                <div className="absolute top-4 left-4 text-4xl font-black italic opacity-10 font-fix">03</div>
                <div className="w-24 h-24 rounded-full border-2 border-slate-700 p-1 mb-4 relative">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[2].name}`} className="w-full h-full object-cover rounded-full bg-slate-800" alt="" />
                </div>
                <h3 className="text-xl font-black text-white font-fix uppercase">{topThree[2].name}</h3>
                <span className="text-[9px] font-black text-orange-500/60 tracking-widest uppercase mb-4 font-fix">Origin: {topThree[2].baseIsland}</span>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mb-2">
                  <div className="bg-orange-500/50 h-full" style={{ width: `${topThree[2].occupancy}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-500 font-bold font-fix uppercase">Occupancy: {topThree[2].occupancy}%</p>
              </div>
            )}
          </div>

          {/* List View */}
          <div className="grid gap-3">
            {remaining.map((player, index) => (
              <div key={player.id} className="group bg-slate-900/30 hover:bg-orange-600/5 border border-white/5 hover:border-orange-500/30 rounded-xl p-5 flex items-center transition-all">
                <span className="w-12 text-2xl font-black italic text-slate-800 group-hover:text-orange-500/50 transition-colors font-fix">
                  {(index + 4).toString().padStart(2, '0')}
                </span>
                <div className="w-12 h-12 rounded-xl bg-slate-800 mr-6 overflow-hidden shrink-0 border border-white/5">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-white font-black uppercase text-sm font-fix">{player.name}</h4>
                    <span className="text-[8px] px-2 py-0.5 bg-slate-800 text-slate-400 font-black rounded uppercase font-fix">{player.baseIsland}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest font-fix">Rank: Elite Commander</div>
                </div>
                <div className="text-right">
                  <div className="text-orange-500 font-black text-xl font-fix">{player.occupancy}%</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase font-fix">Control</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Sticky Personal Status */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 hidden md:block">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-orange-500/40 rounded-2xl p-5 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-slate-500 uppercase font-fix">Your Rank</span>
              <span className="text-3xl font-black italic text-orange-500 font-fix">{myRank}</span>
            </div>
            <div className="h-10 w-px bg-slate-800"></div>
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-full border-2 border-orange-500/50 overflow-hidden bg-slate-800">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.name}`} className="w-full h-full object-cover" alt="" />
              </div>
              <div>
                <div className="text-white font-black text-sm uppercase font-fix italic">CDR. {me?.name || 'OPERATOR'}</div>
                <div className="text-[9px] text-orange-500 font-black tracking-widest uppercase font-fix">Current Origin: {me?.baseIsland || 'Unknown'}</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="text-slate-500 text-[8px] font-black uppercase font-fix tracking-widest">Occupancy</div>
              <div className="text-white font-black text-xl font-fix">{me?.occupancy || 0}%</div>
            </div>
            <button className="bg-orange-600 hover:bg-orange-500 text-white font-black px-8 py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 font-fix">
              Personal Data Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});