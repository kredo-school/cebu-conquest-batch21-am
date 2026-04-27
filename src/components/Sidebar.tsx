import React from 'react';
import { useGameStore } from '../store';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenInventory: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenHelp, onOpenInventory }) => {
  const { 
    hp, maxHp, ap, blessing, turn, logs, atk, def,
    isMyTurn, isUnderAttack 
  } = useGameStore();

  return (
    <>
      <style>{`
        @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); border-color: rgba(239, 68, 68, 0.5); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.5); }
        }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
        
        /* 🚀 全OSでスクロールバーの外観を統一 */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f97316; border-radius: 10px; }
        
        /* 🚀 テキストのベースラインをOS間で統一 */
        .font-fix { line-height: 1.2; }
      `}</style>

      {/* 🚀 サイドバー本体：h-screenで固定し、OSによる隙間の発生を防ぐ */}
      <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-slate-950 w-80 border-r border-slate-800 shadow-2xl overflow-hidden font-body select-none">
        
        {/* --- 1 & 2. Status Area: 上端に固定（flex-none） --- */}
        <div className="flex-none p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Turn & Status Indicator [cite: 37, 53] */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
              <div className="text-2xl font-black text-orange-500 italic font-fix">{turn}</div>
            </div>
            <div className={`inline-flex items-center justify-center px-6 py-3 rounded-full border shadow-2xl transition-all ${
              isUnderAttack ? 'bg-red-950/40 border-red-500 animate-pulse-red' : 
              (isMyTurn ? 'bg-gradient-to-r from-[#3d2414] via-[#52331f] to-[#3d2414] border-[#7a482b]' : 'bg-slate-900 border-slate-800 opacity-50')
            }`}>
              <span className={`font-[900] tracking-[0.25em] text-xs uppercase font-fix ${isUnderAttack ? 'text-red-500' : 'text-[#fa7000]'}`}>
                {isMyTurn ? 'PLAYER TURN' : (isUnderAttack ? 'ENEMY ALERT' : 'STANDBY')}
              </span>
            </div>
          </div>

          {/* Gauges: HP & AP (Stamina) [cite: 35, 36, 43] */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-500">HP {hp}/{maxHp}</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-500" style={{ width: `${(hp/maxHp)*100}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-500">AP (STAMINA) {ap}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all duration-500" style={{ width: `${ap}%` }} />
              </div>
            </div>

            {/* Combat Stats [cite: 43] */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col items-center">
                <span className="material-symbols-outlined text-orange-500 text-lg">swords</span>
                <div className="text-[8px] text-slate-600 font-bold uppercase mt-1">ATTACK</div>
                <div className="text-xl font-black text-slate-100 italic font-fix">{atk}</div>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col items-center">
                <span className="material-symbols-outlined text-blue-400 text-lg">shield</span>
                <div className="text-[8px] text-slate-600 font-bold uppercase mt-1">DEFEND</div>
                <div className="text-xl font-black text-slate-100 italic font-fix">{def}</div>
              </div>
            </div>

            {/* Faith Level & Inventory Button  */}
            <div className="space-y-3">
              <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-500/20 flex items-center justify-between shadow-inner">
                <div className="text-left">
                  <div className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Faith Level</div>
                  <div className="text-base font-bold text-slate-100 italic font-fix">High: {blessing.toFixed(1)}</div>
                </div>
                <span className="material-symbols-outlined text-indigo-400 text-xl animate-pulse">auto_awesome</span>
              </div>

              <button 
                onClick={onOpenInventory}
                className="w-full py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl flex items-center justify-center gap-3 transition-all group pointer-events-auto"
              >
                <span className="material-symbols-outlined text-emerald-400 group-hover:scale-110 transition-transform">inventory_2</span>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest font-fix">Inventory</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- 3. Log Area: 残りのスペースを埋めて下端に吸着（flex-1 + justify-end） [cite: 32, 53] --- */}
        <div className="flex-1 flex flex-col justify-end min-h-0 bg-slate-950">
          <div className="p-4 border-t border-white/5 bg-black/20">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-left">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-fix">SYSTEM LOG</span>
              </div>
              
              <div className="flex gap-4">
                <button onClick={onOpenHelp} className="text-slate-600 hover:text-cyan-400 transition-colors pointer-events-auto" title="Help">
                  <span className="material-symbols-outlined text-lg">help</span>
                </button>
                <button onClick={onOpenSettings} className="text-slate-600 hover:text-orange-400 transition-colors pointer-events-auto" title="Settings">
                  <span className="material-symbols-outlined text-lg">settings</span>
                </button>
              </div>
            </div>
            
            <div className="bg-black/40 rounded border border-white/5 h-36 p-3 text-[10px] font-mono text-slate-500 custom-scrollbar overflow-y-auto space-y-1.5 text-left">
              {logs.map((log, i) => (
                <p key={i} className={`leading-relaxed ${i === 0 ? 'text-orange-400 font-bold' : 'opacity-60'}`}>
                  <span className="text-slate-800 mr-2">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}]</span>
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};