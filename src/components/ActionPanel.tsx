import React, { useState, useMemo, memo } from 'react';
import { useGameStore } from '../store';
import { REACT_TO_PHASER } from '../game/events/PhaserBridge';
import SoundManager from '../game/SoundManager';

// 🚀 島ID定数
const ISLAND_NAMES: Record<number, string> = {
  11: "CEBU MAINLAND",
  12: "MACTAN ISLAND",
  13: "BOHOL",
  14: "NEGROS",
  15: "SIQUIJOR"
};

// 🚀 最適化：React.memoでラップし、不要な再描画を徹底ガード
export const ActionPanel: React.FC = memo(() => {
  // 🚀 最適化：セレクタを個別化し、必要なステートの変化にのみ反応
  const turn = useGameStore(state => state.turn);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const ap = useGameStore(state => state.ap);
  const activeBuffs = useGameStore(state => state.activeBuffs);
  const attack = useGameStore(state => state.attack);
  const stay = useGameStore(state => state.stay);
  const endTurn = useGameStore(state => state.endTurn); // 🚀 追加

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  // 🚀 5桁ID解析ロジック
  const targetInfo = useMemo(() => {
    if (!selectedDistrictId) return null;
    const islandId = Math.floor(selectedDistrictId / 1000);
    return {
      island: ISLAND_NAMES[islandId] || "UNKNOWN SECTOR",
      code: `${islandId}-${selectedDistrictId % 1000}`
    };
  }, [selectedDistrictId]);

  const handleDeploy = () => {
    if (!selectedDistrictId) return;
    try { SoundManager.playSe('click'); } catch(e) {}
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { 
      detail: { districtId: selectedDistrictId } 
    }));
    useGameStore.getState().nextTurn();
  };

  const getBuffVisuals = (name: string) => {
    if (name.includes('マンゴー')) return { icon: 'local_fire_department', color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/50' };
    if (name.includes('レチョン') || name.includes('チチャロン')) return { icon: 'restaurant', color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50' };
    if (name.includes('守護石') || name.includes('要塞')) return { icon: 'fort', color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500/50' };
    return { icon: 'stars', color: 'text-amber-400', bg: 'bg-amber-400/20', border: 'border-amber-400/50' };
  };

  const handleCardClick = (id: number) => {
    try { SoundManager.playSe('click'); } catch(e) {}
    setSelectedCardId(prev => prev === id ? null : id);
  };

  // 1. [Turn 0] 初期配置フェーズ
  if (turn === 0) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center pointer-events-none px-12 z-50 animate-fadeIn">
        <div className="bg-slate-900/90 backdrop-blur-xl p-8 w-full max-w-xl flex flex-col items-center gap-6 pointer-events-auto border-t-2 border-orange-500 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-b-2xl">
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 block font-fix">Neural Link Synchronization</span>
            <div className="flex flex-col items-center">
              {targetInfo ? (
                <>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter font-fix text-white mb-1">📍 {targetInfo.island}</h2>
                  <span className="text-orange-500 font-mono text-sm font-bold bg-orange-500/10 px-3 py-0.5 rounded border border-orange-500/20">SECTOR-CODE: {targetInfo.code}</span>
                </>
              ) : (
                <h2 className="text-2xl font-black italic uppercase tracking-tighter font-fix text-orange-600 animate-pulse">🗺️ Select Deployment Zone</h2>
              )}
            </div>
          </div>
          <button onClick={handleDeploy} disabled={!selectedDistrictId} className={`group relative overflow-hidden px-24 py-5 rounded-xl font-black italic tracking-widest text-xl transition-all shadow-2xl font-fix ${selectedDistrictId ? 'bg-orange-600 text-white hover:bg-orange-500 active:scale-95' : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}>
            <div className="relative z-10">START MISSION</div>
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-15deg]"></div>
          </button>
        </div>
      </div>
    );
  }

  // 2. 相手のターン
  if (!isMyTurn) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div className="bg-slate-900/80 backdrop-blur-md px-12 py-4 rounded-full border border-white/5 flex items-center gap-4 animate-pulse shadow-2xl">
          <span className="w-2 h-2 bg-slate-500 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"></span>
          <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Awaiting Hostile Command...</span>
        </div>
      </div>
    );
  }

  // 3. 自分のターン
  const canAttack = selectedDistrictId && ap >= 5;

  return (
    <div className="absolute bottom-12 left-80 right-12 flex items-end justify-between pointer-events-none z-50 text-left">
      
      {/* 左側: アイテムカード群 */}
      <div className="flex items-end -space-x-6 pointer-events-auto pb-2">
        {activeBuffs.length > 0 ? (
          activeBuffs.map((buff, index) => {
            const visuals = getBuffVisuals(buff.name);
            const isSelected = selectedCardId === buff.id;
            return (
              <div key={buff.id} onClick={() => handleCardClick(buff.id)} className={`group relative flex flex-col items-center justify-between p-4 backdrop-blur-2xl border rounded-2xl w-28 h-36 transition-all duration-300 cursor-pointer shadow-[0_15px_35px_rgba(0,0,0,0.9)] ${isSelected ? `bg-slate-800 -translate-y-12 scale-110 z-50 ${visuals.border} shadow-[0_0_25px_rgba(249,115,22,0.2)]` : `bg-slate-900/95 border-white/5 hover:-translate-y-6 hover:scale-105 hover:z-40 hover:border-slate-500`}`} style={{ zIndex: isSelected ? 100 : 10 + index }}>
                <div className={`w-12 h-12 rounded-full ${visuals.bg} flex items-center justify-center border ${visuals.border} mb-2 shrink-0 shadow-inner group-hover:scale-110 transition-transform`}><span className={`material-symbols-outlined text-2xl ${visuals.color}`}>{visuals.icon}</span></div>
                <div className="flex flex-col items-center text-center mt-auto w-full"><span className="text-[10px] font-black text-slate-100 tracking-wider mb-1 line-clamp-1 font-fix uppercase">{buff.name}</span><div className="h-px w-6 bg-white/10 mb-1"></div><span className="text-[8px] text-emerald-400 font-black uppercase font-fix leading-none">{buff.effect}</span></div>
              </div>
            );
          })
        ) : (
          <div className="w-28 h-36 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center opacity-20"><span className="material-symbols-outlined text-slate-700 text-3xl">inventory_2</span></div>
        )}
      </div>

      {/* 右側: メインアクションボタン */}
      <div className="flex gap-3 items-end pointer-events-auto">
        
        {/* Engagement Button (Attack) */}
        <button 
          onClick={() => { if (selectedDistrictId) { try { SoundManager.playSe('click'); } catch(e) {} attack(selectedDistrictId); setSelectedCardId(null); } }} 
          disabled={!canAttack}
          className={`group relative overflow-hidden rounded-2xl font-black italic tracking-widest transition-all duration-200 flex flex-col items-center justify-center gap-1 w-40 h-24 text-2xl ${canAttack ? 'bg-orange-600 text-white shadow-[0_10px_40px_rgba(234,88,12,0.4)] hover:bg-orange-500 hover:scale-105 active:scale-95 border-b-4 border-orange-800' : 'bg-slate-900/95 text-slate-600 border border-white/5 cursor-not-allowed backdrop-blur-md shadow-inner opacity-50'}`}
        >
          <span className="material-symbols-outlined text-3xl group-enabled:group-hover:scale-110 transition-transform" style={{ fontVariationSettings: '"FILL" 1' }}>swords</span>
          <span className="font-fix uppercase tracking-tighter text-xs">Engagement</span>
        </button>

        {/* Neural Recover Button (Stay) */}
        <button 
          onClick={() => { try { SoundManager.playSe('click'); } catch(e) {} stay(); setSelectedCardId(null); }} 
          className="group bg-slate-900/90 backdrop-blur-xl border border-white/10 text-slate-400 rounded-2xl font-black hover:bg-slate-800 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-32 h-24 text-sm shadow-2xl"
        >
          <span className="material-symbols-outlined text-emerald-400 text-2xl group-hover:scale-110 transition-transform">monitoring</span>
          <span className="font-fix uppercase tracking-widest text-[9px]">Recover</span>
        </button>

        {/* 🚀 Turn End Button (承認ボタン) */}
        <button 
          onClick={() => { try { SoundManager.playSe('click'); } catch(e) {} endTurn(); setSelectedCardId(null); }} 
          className="group bg-blue-950/40 border-2 border-blue-500/30 text-blue-400 rounded-2xl font-black hover:bg-blue-600 hover:text-white hover:border-blue-400 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-32 h-24 text-sm shadow-[0_0_20px_rgba(59,130,246,0.2)]"
        >
          <span className="material-symbols-outlined text-2xl group-hover:rotate-180 transition-transform duration-500">logout</span>
          <span className="font-fix uppercase tracking-widest text-[9px]">Turn End</span>
        </button>
      </div>

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .font-fix { line-height: 1.2; }
      `}</style>
    </div>
  );
});