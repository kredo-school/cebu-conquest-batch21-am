/// <reference types="vite/client" />
import React, { useMemo, memo } from 'react';
import { useGameStore } from '../store';

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenInventory: () => void;
}

const GOD_BUFFS: Record<number, { hp?: number; atk?: number; def?: number; ap?: number }> = {
  1: { hp: 40 },        // Neil: MAX_HP +30, HP +10
  2: { atk: 20 },       // Garry: ATK +20
  3: { hp: 10, ap: 15 }, // Shem: HP +10, MAX_AP +15
  4: { hp: -20 },       // Quisie: HP -20
  5: { def: 15 },       // Eduardo: DEF +15
  6: { hp: -10 },       // Kurt: HP -10
  7: {},                // Stephen: FAITH_REGEN (Passive)
  8: { ap: 30 },        // Bernardine: MAX_AP +30
};

export const Sidebar: React.FC<SidebarProps> = memo(({ onOpenSettings, onOpenHelp, onOpenInventory }) => {
  const hp = useGameStore(state => state.hp);
  const maxHp = useGameStore(state => state.maxHp);
  const ap = useGameStore(state => state.ap);
  const maxAp = useGameStore(state => state.maxAp || 100); 
  const turn = useGameStore(state => state.turn);
  const logs = useGameStore(state => state.logs);
  const atk = useGameStore(state => state.atk);
  const def = useGameStore(state => state.def);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const isUnderAttack = useGameStore(state => state.isUnderAttack);
  const playerName = useGameStore(state => state.playerName);
  const selectedGodId = useGameStore(state => state.selectedGodId);

  // 🎯 解決：使わなくなった `useState`, `useEffect`, `myId`, `lookupData`, `players` を完全に削除してESLint警告を根絶

  const buffs = useMemo(() => (selectedGodId ? GOD_BUFFS[selectedGodId] : {}), [selectedGodId]);
  const effectiveMaxHp = useMemo(() => maxHp + (buffs.hp || 0), [maxHp, buffs.hp]);
  const effectiveMaxAp = useMemo(() => maxAp + (buffs.ap || 0), [maxAp, buffs.ap]);

  const displayHp = useMemo(() => Math.max(0, Math.min(hp, effectiveMaxHp)), [hp, effectiveMaxHp]);
  const displayAp = useMemo(() => Math.max(0, Math.min(ap, effectiveMaxAp)), [ap, effectiveMaxAp]);
  
  const hpPercent = effectiveMaxHp > 0 ? Math.max(0, Math.min(100, (displayHp / effectiveMaxHp) * 100)) : 0;
  const apPercent = effectiveMaxAp > 0 ? Math.max(0, Math.min(100, (displayAp / effectiveMaxAp) * 100)) : 0;

  return (
    <>
      <style>{`
        @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); border-color: rgba(239, 68, 68, 0.5); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 1); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.5); }
        }
        @keyframes energy-critical {
            0%, 100% { background-color: rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.3); }
            50% { background-color: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 1); }
        }
        .animate-pulse-red { animation: pulse-red 2s infinite; }
        .animate-energy-critical { animation: energy-critical 0.8s infinite ease-in-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fa7000; border-radius: 10px; }
        .font-fix { line-height: 1.2; }
      `}</style>

      <aside className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-slate-950 w-80 border-r border-slate-800 shadow-2xl overflow-hidden font-body select-none text-left">
        
        <div className="flex-none p-6 pb-2 space-y-4">
          <div className="flex flex-col gap-1 border-l-2 border-orange-600 pl-3 mb-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Neural Link Operator</span>
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter font-fix truncate">
              {playerName || "COMMANDER"}
            </h2>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
              <div className="text-2xl font-black text-orange-500 italic font-fix">{turn}</div>
            </div>
            
            <div className={`inline-flex items-center justify-center px-6 py-3 rounded-full border shadow-2xl transition-all ${
              isUnderAttack ? 'bg-red-950/40 border-red-500 animate-pulse-red' : 
              (isMyTurn ? 'bg-orange-600/20 border-[#fa7000] animate-pulse-orange shadow-[0_0_20px_rgba(250,112,0,0.3)]' : 'bg-slate-900/50 border-slate-800 opacity-50')
            }`}>
              <span className={`font-[900] tracking-[0.25em] text-xs uppercase font-fix ${
                isUnderAttack ? 'text-red-500' : (isMyTurn ? 'text-white' : 'text-slate-500')
              }`}>
                {isMyTurn ? 'YOUR TURN' : (isUnderAttack ? 'ENEMY ALERT' : 'STANDBY')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">HP</span>
                <span className={`text-[10px] font-black font-mono ${buffs.hp ? 'text-orange-400' : 'text-slate-400'}`}>
                    {displayHp}/{effectiveMaxHp}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-500" 
                  style={{ width: `${hpPercent}%` }} 
                />
              </div>
            </div>

            <div className={`space-y-2 p-2 -m-2 rounded-lg transition-all border border-transparent ${ap <= 0 ? 'animate-energy-critical' : ''}`}>
              <div className="flex justify-between items-end">
                <span className={`text-[10px] font-black uppercase tracking-tighter ${ap <= 0 ? 'text-red-500' : 'text-slate-500'}`}>
                    {ap <= 0 ? '⚠ AP Depleted' : 'AP'}
                </span>
                <span className={`text-[10px] font-black font-mono ${ap <= 0 ? 'text-red-500' : (buffs.ap ? 'text-cyan-400' : 'text-slate-400')}`}>
                    {displayAp}/{effectiveMaxAp}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-500 ${ap <= 0 ? 'bg-red-600' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`} 
                  style={{ width: `${apPercent}%` }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded border transition-colors flex flex-col items-center bg-slate-900/50 border-slate-800">
                <span className={`text-[8px] font-bold uppercase mb-1 ${buffs.atk ? 'text-orange-500' : 'text-slate-600'}`}>Combat ATK</span>
                <div className={`text-lg font-black italic font-fix ${buffs.atk ? 'text-orange-400' : 'text-slate-100'}`}>
                    {atk + (buffs.atk || 0)}
                </div>
              </div>
              <div className={`p-2 rounded border transition-colors flex flex-col items-center ${buffs.def ? 'bg-orange-950/20 border-orange-500/50 shadow-[0_0_10px_rgba(250,112,0,0.1)]' : 'bg-slate-900/50 border-slate-800'}`}>
                <span className={`text-[8px] font-bold uppercase mb-1 ${buffs.def ? 'text-orange-500' : 'text-slate-600'}`}>Armor DEF</span>
                <div className={`text-lg font-black italic font-fix ${buffs.def ? 'text-orange-400' : 'text-slate-100'}`}>
                    {def + (buffs.def || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex-none px-6 py-4 space-y-3 bg-slate-950/80 backdrop-blur-md border-t border-white/5">
          <button onClick={onOpenInventory} className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded flex items-center justify-center gap-2 transition-all shadow-lg group">
            <span className="material-symbols-outlined text-emerald-400 text-sm group-hover:scale-110 transition-transform">inventory_2</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-fix">Open Inventory</span>
          </button>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-fix">Tactical Feed</span>
              </div>
              <div className="flex gap-4">
                <button onClick={onOpenHelp} className="text-slate-600 hover:text-cyan-400 transition-colors"><span className="material-symbols-outlined text-base">help</span></button>
                <button onClick={onOpenSettings} className="text-slate-600 hover:text-orange-400 transition-colors"><span className="material-symbols-outlined text-base">settings</span></button>
              </div>
            </div>
            <div className="bg-black/60 rounded border border-white/5 h-36 p-3 text-[9px] font-mono custom-scrollbar overflow-y-auto space-y-1.5 shadow-inner">
              {logs.map((log, i) => (
                <div key={i} className={`flex items-baseline gap-2 leading-tight ${i === 0 ? 'text-orange-400 font-bold' : 'text-slate-500 opacity-80'}`}>
                  <span className="text-slate-800 shrink-0">[{log.time}]</span>
                  <span className="flex-1 break-words font-fix">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});

export default Sidebar;