import React from 'react';
import { useGameStore } from '../store';

export const Sidebar: React.FC = () => {
  const { 
    hp, maxHp, stamina, maxStamina, blessing, turn, logs, atk, def,
    endTurn, isMyTurn, isSubmitted 
  } = useGameStore();

  return (
    // 🚀 App.tsxのflexレイアウトに合わせて、固定(fixed)を解除し、h-fullで高さを確保
    <aside className="w-80 h-full bg-[#0f172a] border-r border-slate-800 flex flex-col z-50 shadow-2xl overflow-y-auto custom-scrollbar font-body select-none">
      
      {/* --- 1. Top: Turn & Status Pill (画像上部) --- */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          {/* Turn Number Box */}
          <div className="w-14 h-14 bg-slate-800 rounded border border-slate-700 flex items-center justify-center">
            <div className="text-3xl font-black text-orange-500 italic">{turn}</div>
          </div>
          {/* Status Pill: 画像の茶色〜オレンジのグラデーションを再現 */}
          <div className="flex flex-col justify-center">
            <div className={`inline-flex items-center justify-center px-6 py-3 rounded-full border shadow-xl transition-all ${
              isMyTurn ? 'bg-gradient-to-r from-[#3d2414] via-[#52331f] to-[#3d2414] border-[#7a482b]' : 'bg-slate-800 border-slate-700 opacity-50'
            }`}>
              <span className="text-[#fa7000] font-[900] tracking-[0.25em] text-xs uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                {isMyTurn ? 'PLAYER TURN' : 'ENEMY TURN'}
              </span>
            </div>
          </div>
        </div>

        {/* Sector Navigation (画像通りのリスト) */}
        <nav className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded bg-slate-800/80 text-green-400 border-l-4 border-green-500 shadow-inner">
            <span className="material-symbols-outlined text-base">map</span>
            <span className="text-[10px] font-black uppercase tracking-wider">マクタン島</span>
          </div>
          {['ラプ＝ラプ市', 'セントラルエリア', 'サント・ニーニョ教会'].map((name, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/30 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-base">
                {i === 0 ? 'grid_view' : i === 1 ? 'location_city' : 'location_on'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider">{name}</span>
            </div>
          ))}
        </nav>
      </div>

      {/* --- 2. Middle: Status Gauges (画像中央) --- */}
      <div className="px-6 space-y-8 flex-grow">
        {/* HP Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">HP {hp}/{maxHp || 100}</span>
            <span className={`text-[10px] font-bold ${hp < 30 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
              {hp < 30 ? 'CRITICAL' : 'OPTIMAL'}
            </span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-green-500 transition-all duration-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]" 
              style={{ width: `${(hp / (maxHp || 100)) * 100}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">スタミナ {stamina}%</span>
            <span className="text-[10px] font-bold text-orange-400">STABLE</span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-orange-500 transition-all duration-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]" 
              style={{ width: `${stamina}%` }}
            />
          </div>
        </div>

        {/* ATK / DEF Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-orange-500 text-xl mb-1">swords</span>
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Attack</div>
            <div className="text-2xl font-black text-slate-100 italic">{atk}</div>
          </div>
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-blue-400 text-xl mb-1">shield</span>
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Defend</div>
            <div className="text-2xl font-black text-slate-100 italic">{def}</div>
          </div>
        </div>

        {/* Faith Level */}
        <div className="bg-indigo-900/10 p-5 rounded-xl border border-indigo-500/20 flex items-center justify-between shadow-inner">
          <div>
            <div className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em]">Faith Level</div>
            <div className="text-base font-black text-slate-100 italic">High: {Math.round(blessing * 10)}</div>
          </div>
          <span className="material-symbols-outlined text-indigo-400 text-2xl animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>auto_awesome</span>
        </div>
      </div>

      {/* --- 3. Bottom: System Log (画像下部) --- */}
      <div className="p-4 border-t border-slate-800 bg-[#020617]/50 mt-auto">
        <div className="flex items-center gap-2 mb-3 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Tactical Feed</span>
        </div>
        <div className="bg-[#020617] rounded border border-slate-800 h-40 p-4 text-[10px] font-mono text-slate-400 custom-scrollbar overflow-y-auto space-y-1.5 leading-tight">
          {logs.map((log, i) => (
            <p key={i} className={i === 0 ? 'text-orange-400' : 'opacity-60'}>
              <span className="text-slate-700 mr-2">[{new Date().toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit'})}]</span>
              {log}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
};