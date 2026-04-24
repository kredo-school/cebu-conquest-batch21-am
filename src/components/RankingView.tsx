import React, { useState } from 'react';
import { useGameStore } from '../store';

interface RankingViewProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onBack: () => void; // 🚀 修正：戻るためのプロップスを追加
}

export const RankingView: React.FC<RankingViewProps> = ({ 
  onOpenSettings, onOpenHelp, onBack // 🚀 修正：onBack を受け取る
}) => {
  const { players, myId } = useGameStore();
  const [filter, setFilter] = useState<'weekly' | 'global'>('weekly');

  // 本来はAPIから取得しますが、デモ用に並び替え
  const sortedPlayers = [...players].sort((a, b) => (b.occupancy || 0) - (a.occupancy || 0));
  
  const topThree = sortedPlayers.slice(0, 3);
  const remaining = sortedPlayers.slice(3);
  const myRank = sortedPlayers.findIndex(p => p.id === myId) + 1;
  const me = sortedPlayers.find(p => p.id === myId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-body selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* 1. Top Navigation */}
      <nav className="fixed top-0 w-full flex justify-between items-center px-6 h-16 z-50 bg-slate-900/80 backdrop-blur-md border-b border-blue-500/30 shadow-lg shadow-blue-900/20">
        <div className="flex items-center gap-4">
          {/* 🚀 修正：戻るボタン（矢印）を追加 */}
          <button 
            onClick={onBack}
            className="flex items-center justify-center p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 text-white"
            title="BACK TO BASE CAMP"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="text-xl font-black text-orange-500 tracking-tighter uppercase text-left">CEBU CONQUEST</div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
          <span className="text-slate-400 hover:text-blue-200 transition-colors cursor-pointer">Battle Results</span>
          <span className="text-orange-400 border-b-2 border-orange-500 pb-1 cursor-default">Battle Rankings</span>
          <span className="text-slate-400 hover:text-blue-200 transition-colors cursor-pointer">Record Rankings</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <button 
            onClick={onOpenHelp}
            className="flex items-center justify-center p-2 hover:bg-blue-800/40 rounded-lg transition-all active:scale-90 pointer-events-auto"
            title="HELP / MANUAL"
          >
            <span className="material-symbols-outlined text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">help</span>
          </button>

          <button 
            onClick={onOpenSettings}
            className="flex items-center justify-center p-2 hover:bg-blue-800/40 rounded-lg transition-all active:scale-90 pointer-events-auto"
            title="SETTINGS"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          
          <span className="material-symbols-outlined p-2 hover:bg-blue-800/40 rounded-lg cursor-pointer">person</span>
        </div>
      </nav>

      {/* 2. Main Content */}
      <main className="pt-24 pb-32 min-h-screen relative">
        {/* Background Map Layer */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <img 
            alt="" 
            className="w-full h-full object-cover filter grayscale contrast-125" 
            src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1000" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"></div>
        </div>

        <div className="relative z-10 p-6 max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="text-left">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase mb-2 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                最優秀指揮官ランキング
              </h1>
              <p className="text-blue-400 font-bold text-sm tracking-widest flex items-center">
                <span className="material-symbols-outlined text-xs mr-1">update</span> 
                セッション更新まで: 02:14:45
              </p>
            </div>
            <div className="flex bg-slate-900/50 backdrop-blur border border-blue-500/20 p-1 rounded-lg">
              <button 
                onClick={() => setFilter('weekly')}
                className={`px-4 py-1 text-xs font-bold rounded uppercase transition-all ${filter === 'weekly' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-400'}`}
              >Weekly</button>
              <button 
                onClick={() => setFilter('global')}
                className={`px-4 py-1 text-xs font-bold rounded uppercase transition-all ${filter === 'global' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-400'}`}
              >Global</button>
            </div>
          </div>

          {/* Podium Grid (Top 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="order-2 md:order-1 bg-slate-900/60 backdrop-blur-md border border-blue-500/20 p-6 rounded-2xl flex flex-col items-center relative overflow-hidden group">
                <span className="absolute top-0 right-0 p-2 text-6xl font-black italic opacity-10">02</span>
                <div className="w-24 h-24 rounded-full border-2 border-blue-400/50 p-1 mb-4 relative shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[1].name}`} className="w-full h-full object-cover rounded-full bg-slate-800" alt="rank2" />
                  <div className="absolute -bottom-2 -right-2 bg-slate-800 border border-blue-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-blue-400">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  </div>
                </div>
                <h3 className="text-xl font-black text-white mb-1">{topThree[1].name}</h3>
                <p className="text-blue-400 font-bold text-xs mb-4 uppercase">VANGUARD</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '84%' }}></div>
                </div>
                <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest text-center">占有率: {topThree[1].occupancy || 0}%</p>
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="order-1 md:order-2 bg-slate-900/80 backdrop-blur-xl border border-orange-500/50 p-8 rounded-2xl flex flex-col items-center relative overflow-hidden transform scale-105 shadow-[0_20px_50px_rgba(59,130,246,0.1)] group">
                <span className="absolute top-0 right-0 p-4 text-8xl font-black italic text-orange-500 opacity-20">01</span>
                <div className="w-32 h-32 rounded-full border-4 border-orange-500 p-1.5 mb-6 relative shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[0].name}`} className="w-full h-full object-cover rounded-full bg-slate-800" alt="rank1" />
                  <div className="absolute -bottom-2 -right-2 bg-slate-800 border-2 border-orange-500 w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.5)] text-orange-500">
                    <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mb-1">{topThree[0].name}</h3>
                <p className="text-orange-500 font-bold text-sm mb-6 tracking-[0.2em] uppercase">Supreme Commander</p>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full shadow-[0_0_10px_#f97316]" style={{ width: '92%' }}></div>
                </div>
                <p className="text-white text-xs mt-3 font-bold uppercase tracking-widest text-center">占有率: {topThree[0].occupancy || 0}%</p>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="order-3 md:order-3 bg-slate-900/60 backdrop-blur-md border border-blue-500/20 p-6 rounded-2xl flex flex-col items-center relative overflow-hidden group">
                <span className="absolute top-0 right-0 p-2 text-6xl font-black italic opacity-10">03</span>
                <div className="w-24 h-24 rounded-full border-2 border-blue-400/50 p-1 mb-4 relative shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${topThree[2].name}`} className="w-full h-full object-cover rounded-full bg-slate-800" alt="rank3" />
                  <div className="absolute -bottom-2 -right-2 bg-slate-800 border border-blue-500 w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-blue-400">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
                  </div>
                </div>
                <h3 className="text-xl font-black text-white mb-1">{topThree[2].name}</h3>
                <p className="text-blue-400 font-bold text-xs mb-4 uppercase">VANGUARD</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '72%' }}></div>
                </div>
                <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest text-center">占有率: {topThree[2].occupancy || 0}%</p>
              </div>
            )}
          </div>

          {/* List View */}
          <div className="space-y-3">
            {remaining.map((player, index) => (
              <div key={player.id} className="group bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-sm border border-blue-500/10 rounded-xl p-4 flex items-center transition-all duration-300">
                <span className="w-12 text-2xl font-black italic text-slate-700 group-hover:text-blue-400 transition-colors">
                  {(index + 4).toString().padStart(2, '0')}
                </span>
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 mr-4 overflow-hidden shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} className="w-full h-full object-cover" alt="avatar" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-bold uppercase">{player.name}</h4>
                    <span className="text-blue-400 font-black text-sm">
                      {player.occupancy || 0}% <span className="text-[10px] text-slate-500 ml-1 font-black">占有率</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">LEAGUE: ELITE</div>
                </div>
                <div className="ml-6 flex items-center text-emerald-400 text-xs font-bold w-12">
                  <span className="material-symbols-outlined text-sm mr-1">arrow_upward</span> 2
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Personalized Sticky Bottom Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-40 px-6 hidden md:block">
        <div className="max-w-5xl mx-auto bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(59,130,246,0.1)] flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-orange-600 text-white px-4 py-1 font-black italic mr-4 rounded-lg shadow-lg">
              {myRank > 0 ? `${myRank}位` : '--位'}
            </div>
            <div className="w-10 h-10 rounded-full border border-blue-500/50 mr-3 overflow-hidden bg-slate-800">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.name}`} className="w-full h-full object-cover" alt="me" />
            </div>
            <div className="text-left">
              <div className="text-white font-bold text-sm uppercase">CDR. {me?.name || 'Operator'}</div>
              <div className="text-[10px] text-blue-400 font-black tracking-widest uppercase">
                {myRank > 1 ? `Next Rank: ${myRank - 1}位 (あと 2.5% 占有率)` : 'TOP COMMANDER'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-12">
            <div className="text-right">
              <div className="text-slate-500 text-[10px] font-bold uppercase">勝利数</div>
              <div className="text-white font-black text-lg">42</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 text-[10px] font-bold uppercase">征服エリア</div>
              <div className="text-white font-black text-lg">08</div>
            </div>
            <button className="bg-orange-600 text-white font-black px-6 py-2 rounded-xl uppercase text-xs hover:bg-orange-500 transition-all shadow-lg shadow-orange-900/40 active:scale-95">
              プロフィール詳細
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 px-4 pb-safe bg-slate-900/95 border-t border-blue-500/20 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center justify-center text-slate-500 cursor-pointer" onClick={onBack}>
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] font-bold mt-1 text-center">Home</span>
        </div>
        <div className="flex flex-col items-center justify-center text-orange-500 bg-orange-500/10 rounded-xl px-4 py-1">
          <span className="material-symbols-outlined">leaderboard</span>
          <span className="text-[10px] font-bold mt-1 text-center">Rankings</span>
        </div>
        <div className="flex flex-col items-center justify-center text-slate-500">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold mt-1 text-center">Profile</span>
        </div>
      </footer>
    </div>
  );
};