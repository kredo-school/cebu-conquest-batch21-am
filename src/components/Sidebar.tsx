import React from 'react';
import { useGameStore } from '../store';

export const Sidebar: React.FC = () => {
  const { 
    hp, maxHp, stamina, maxStamina, blessing, turn, logs, atk, def,
    endTurn, isMyTurn, isSubmitted,
    isUnderAttack // 🚀 Storeから被弾状態を取得
  } = useGameStore();

  return (
    <>
      {/* 🚀 サイドバー用のアラートアニメーション定義 */}
      <style>{`
        @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); border-color: rgba(239, 68, 68, 0.5); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.5); }
        }
        @keyframes pulse-warning-text {
            0%, 100% { color: #f87171; opacity: 1; }
            50% { color: #f97316; opacity: 0.8; }
        }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
        .animate-warning-text { animation: pulse-warning-text 1.5s infinite; }
      `}</style>

      {/* 🚀 App.tsxのflexレイアウトに合わせて、固定(fixed)を解除し、h-fullで高さを確保 */}
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
          
          {/* 🔴 HP Bar (被弾時に赤く警告表示) */}
          <div className={`transition-all duration-300 space-y-3 ${isUnderAttack ? 'p-3 rounded-lg bg-red-950/20 border border-red-500/30 animate-pulse-red' : ''}`}>
            <div className="flex justify-between items-end">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isUnderAttack ? 'text-red-400' : 'text-slate-400'}`}>HP {hp}/{maxHp || 100}</span>
              {isUnderAttack ? (
                <span className="text-[10px] font-bold text-red-500 animate-warning-text">UNDER ATTACK</span>
              ) : (
                <span className={`text-[10px] font-bold ${hp < 30 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                  {hp < 30 ? 'CRITICAL' : 'OPTIMAL'}
                </span>
              )}
            </div>
            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 ${isUnderAttack ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]'}`} 
                style={{ width: `${(hp / (maxHp || 100)) * 100}%` }}
              />
            </div>
          </div>

          {/* Stamina Bar (被弾時は暗くする) */}
          <div className={`space-y-3 transition-opacity duration-300 ${isUnderAttack ? 'opacity-40' : 'opacity-100'}`}>
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

          {/* 🔴 ATK / DEF Stats Grid (被弾時に赤く警告表示) */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center shadow-inner transition-all duration-300 ${isUnderAttack ? 'bg-red-900/10 border-red-500/40 animate-pulse-red' : 'bg-slate-950/40 border-slate-800'}`}>
              <span className={`material-symbols-outlined text-xl mb-1 ${isUnderAttack ? 'text-red-500' : 'text-orange-500'}`}>swords</span>
              <div className={`text-[8px] font-black uppercase tracking-tighter ${isUnderAttack ? 'text-red-400' : 'text-slate-500'}`}>Attack</div>
              <div className="text-2xl font-black text-slate-100 italic">{atk}</div>
            </div>
            <div className={`p-4 rounded-xl border flex flex-col items-center justify-center shadow-inner transition-all duration-300 ${isUnderAttack ? 'bg-red-900/10 border-red-500/40 animate-pulse-red' : 'bg-slate-950/40 border-slate-800'}`}>
              <span className={`material-symbols-outlined text-xl mb-1 ${isUnderAttack ? 'text-red-400' : 'text-blue-400'}`}>shield</span>
              <div className={`text-[8px] font-black uppercase tracking-tighter ${isUnderAttack ? 'text-red-400' : 'text-slate-500'}`}>Defend</div>
              <div className="text-2xl font-black text-slate-100 italic">{def}</div>
            </div>
          </div>

          {/* Faith Level (被弾時は暗くする) */}
          <div className={`bg-indigo-900/10 p-5 rounded-xl border border-indigo-500/20 flex items-center justify-between shadow-inner transition-opacity duration-300 ${isUnderAttack ? 'opacity-40' : 'opacity-100'}`}>
            <div>
              <div className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em]">Faith Level</div>
              <div className="text-base font-black text-slate-100 italic">High: {Math.round(blessing * 10)}</div>
            </div>
            <span className="material-symbols-outlined text-indigo-400 text-2xl animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>auto_awesome</span>
          </div>
        </div>

        {/* --- 3. Bottom: System Log (画像下部) --- */}
        <div className="p-4 border-t border-slate-800 bg-[#020617]/50 mt-auto">
          {/* 🔴 ログヘッダー (被弾時に文言と色を変更) */}
          <div className="flex items-center gap-2 mb-3 px-2">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isUnderAttack ? 'bg-red-500' : 'bg-orange-500'}`}></span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isUnderAttack ? 'text-red-400 animate-warning-text' : 'text-slate-500'}`}>
              {isUnderAttack ? 'ALERT: COMBAT IN PROGRESS' : 'Tactical Feed'}
            </span>
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
    </>
  );
};