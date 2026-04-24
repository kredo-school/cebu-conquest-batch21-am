import React from 'react';
import { useGameStore } from '../store';
import { REACT_TO_PHASER } from '../game/events/PhaserBridge';

export const ActionPanel: React.FC = () => {
  const { 
    turn, selectedDistrictId, isMyTurn, stamina, activeBuffs,
    attack, stay, endTurn 
  } = useGameStore();

  // 出撃確定処理 (Turn 0)
  const handleDeploy = () => {
    if (!selectedDistrictId) return;
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { 
      detail: { districtId: selectedDistrictId } 
    }));
    useGameStore.getState().nextTurn();
  };

  // 1. [Turn 0] 初期配置フェーズ
  if (turn === 0) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center pointer-events-none px-12">
        <div className="glass-panel p-8 w-full max-w-xl flex flex-col items-center gap-6 pointer-events-auto border-t-2 border-orange-500 shadow-2xl">
          <div className="text-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 block">Tactical Deployment</span>
            <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${selectedDistrictId ? 'text-white' : 'text-orange-600 animate-pulse'}`}>
              {selectedDistrictId ? `📍 Target: Sector ${selectedDistrictId}` : '🗺️ Select Deployment Zone'}
            </h2>
          </div>
          <button
            onClick={handleDeploy}
            disabled={!selectedDistrictId}
            className={`px-24 py-5 rounded-lg font-black italic tracking-widest text-xl transition-all shadow-2xl
              ${selectedDistrictId 
                ? 'bg-orange-600 text-white hover:bg-orange-500 active:scale-95' 
                : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
          >
            START MISSION
          </button>
        </div>
      </div>
    );
  }

  // 2. 相手のターン待機状態
  if (!isMyTurn) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-12 py-4 rounded-full border border-slate-800 flex items-center gap-4 animate-pulse">
          <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
          <span className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Awaiting Hostile Command...</span>
        </div>
      </div>
    );
  }

  // 3. [Turn 1以降] 自分のターン
  const canAttack = selectedDistrictId && stamina >= 5;

  return (
    <div className="absolute bottom-12 left-0 right-0 flex items-end justify-between px-12 pointer-events-none">
      
      {/* 🚀 左側: アイテムカード群（画像通りのスタック配置） */}
      <div className="flex items-end -space-x-16 pointer-events-auto">
        {activeBuffs.length > 0 ? (
          activeBuffs.map((buff, index) => (
            <div 
              key={buff.id}
              className="group relative flex flex-col items-center justify-between p-4 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl w-32 h-48 transition-all duration-300 hover:-translate-y-12 hover:scale-110 hover:z-50 hover:border-orange-500 shadow-2xl cursor-default"
              style={{ zIndex: 10 + index }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 mb-2 shrink-0">
                <span className="material-symbols-outlined text-orange-400 text-3xl">
                  {buff.name.includes('マンゴー') ? 'nutrition' : buff.name.includes('レチョン') ? 'restaurant' : 'fort'}
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-sm font-black text-slate-100 tracking-wider mb-1">{buff.name}</span>
                <span className="text-[9px] text-green-400 font-bold uppercase leading-tight">{buff.effect}</span>
              </div>
            </div>
          ))
        ) : (
          /* 特産品がない時のプレースホルダー（レイアウト維持用） */
          <div className="w-32 h-48 border-2 border-dashed border-slate-800 rounded-xl opacity-20"></div>
        )}
      </div>

      {/* 🚀 右側: メインアクションボタン */}
      <div className="flex gap-5 items-end pointer-events-auto">
        
        {/* Attack Button */}
        <button 
          onClick={() => selectedDistrictId && attack(selectedDistrictId)} 
          disabled={!canAttack}
          className={`group relative overflow-hidden rounded-lg font-black italic tracking-tighter transition-all duration-200 flex flex-col items-center justify-center gap-2 w-44 h-28 text-2xl shadow-2xl
            ${canAttack 
              ? 'bg-orange-600 text-white shadow-[0_0_40px_rgba(234,88,12,0.5)] hover:shadow-[0_0_60px_rgba(234,88,12,0.7)] active:scale-95' 
              : 'bg-slate-900/60 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'}`}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>swords</span>
          <span>攻撃</span>
        </button>

        {/* Stay Button */}
        <button 
          onClick={stay} 
          className="group bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700 text-slate-100 rounded-lg font-bold hover:bg-slate-800 hover:border-orange-500 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 w-44 h-28 text-xl shadow-xl"
        >
          <span className="material-symbols-outlined text-green-400 text-3xl">vitals</span>
          <span>Stay (回復)</span>
        </button>

        {/* End Turn (完了) Button */}
        <button 
          onClick={() => { if(window.confirm("END PHASE?")) endTurn(); }} 
          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 w-16 h-28 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95"
          title="Turn End"
        >
          <span className="material-symbols-outlined text-2xl">timer</span>
          <span className="text-[10px] font-black mt-1">END</span>
        </button>

      </div>
    </div>
  );
};