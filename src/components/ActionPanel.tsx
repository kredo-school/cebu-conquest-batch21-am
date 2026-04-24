import React, { useState } from 'react';
import { useGameStore } from '../store';
import { REACT_TO_PHASER } from '../game/events/PhaserBridge';
import SoundManager from '../game/SoundManager'; // 🚀 追加：クリック音用

export const ActionPanel: React.FC = () => {
  const { 
    turn, selectedDistrictId, isMyTurn, stamina, activeBuffs,
    attack, stay
  } = useGameStore();

  // 🚀 追加：選択されたカードのIDを保持するステート
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);

  // 出撃確定処理 (Turn 0)
  const handleDeploy = () => {
    if (!selectedDistrictId) return;
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { 
      detail: { districtId: selectedDistrictId } 
    }));
    useGameStore.getState().nextTurn();
  };

  // 🚀 バフカードのアイコンと色を自動判定するヘルパー関数
  const getBuffVisuals = (name: string) => {
    if (name.includes('マンゴー')) return { icon: 'local_fire_department', color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-500/50' };
    if (name.includes('レチョン') || name.includes('チチャロン') || name.includes('ドリンク')) return { icon: 'restaurant', color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50' };
    if (name.includes('守護石') || name.includes('要塞') || name.includes('スパイス')) return { icon: 'fort', color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500/50' };
    return { icon: 'stars', color: 'text-amber-400', bg: 'bg-amber-400/20', border: 'border-amber-400/50' }; // デフォルト
  };

  // 🚀 追加：カードをクリックしたときの処理
  const handleCardClick = (id: number) => {
    try { SoundManager.playSe('click'); } catch(e) {}
    // 同じカードを押したら解除、違うカードならそれを選択
    setSelectedCardId(prev => prev === id ? null : id);
  };

  // 1. [Turn 0] 初期配置フェーズ
  if (turn === 0) {
    return (
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center pointer-events-none px-12 z-50">
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
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-50">
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
    <div className="absolute bottom-12 left-72 right-12 flex items-end justify-between pointer-events-none z-50">
      
      {/* 🚀 左側: アイテムカード群 */}
      <div className="flex items-end -space-x-4 pointer-events-auto pl-8 pb-2">
        {activeBuffs.length > 0 ? (
          activeBuffs.map((buff, index) => {
            const visuals = getBuffVisuals(buff.name);
            const isSelected = selectedCardId === buff.id; // 🚀 選択判定

            return (
              <div 
                key={buff.id}
                onClick={() => handleCardClick(buff.id)}
                className={`group relative flex flex-col items-center justify-between p-4 backdrop-blur-xl border rounded-2xl w-28 h-36 transition-all duration-300 cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.8)]
                  ${isSelected 
                    // 🚀 選択時のスタイル：上に大きく持ち上がり、枠線がテーマカラーに光る
                    ? `bg-slate-800 -translate-y-12 scale-110 z-50 ${visuals.border} shadow-[0_0_20px_rgba(255,255,255,0.1)]` 
                    // 🚀 非選択時のスタイル：ホバーすると少しだけ上に持ち上がる
                    : `bg-slate-900/95 border-slate-700/50 hover:-translate-y-6 hover:scale-105 hover:z-40 hover:border-slate-400`
                  }`}
                style={{ zIndex: isSelected ? 50 : 10 + index }}
              >
                <div className={`w-12 h-12 rounded-full ${visuals.bg} flex items-center justify-center border ${visuals.border} mb-2 shrink-0 shadow-inner`}>
                  <span className={`material-symbols-outlined text-2xl ${visuals.color}`}>
                    {visuals.icon}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center mt-auto">
                  <span className="text-[11px] font-black text-slate-100 tracking-wider mb-1 line-clamp-1">{buff.name}</span>
                  <span className="text-[9px] text-emerald-400 font-black uppercase">{buff.effect}</span>
                </div>
              </div>
            );
          })
        ) : (
          /* 特産品がない時のプレースホルダー */
          <div className="w-28 h-36 border-2 border-dashed border-slate-800 rounded-2xl opacity-20"></div>
        )}
      </div>

      {/* 🚀 右側: メインアクションボタン */}
      <div className="flex gap-4 items-end pointer-events-auto">
        
        {/* Attack Button */}
        <button 
          onClick={() => {
            if (selectedDistrictId) {
              attack(selectedDistrictId);
              setSelectedCardId(null); // 🚀 アクション実行時に選択をクリア
            }
          }} 
          disabled={!canAttack}
          className={`group relative overflow-hidden rounded-2xl font-black italic tracking-widest transition-all duration-200 flex flex-col items-center justify-center gap-1 w-40 h-24 text-xl
            ${canAttack 
              ? 'bg-[#f97316] text-white shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:bg-[#ea580c] active:scale-95 border-b-4 border-orange-700' 
              : 'bg-slate-900/90 text-slate-500 border border-slate-700 cursor-not-allowed backdrop-blur-md shadow-lg'}`}
        >
          <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>swords</span>
          <span>攻撃</span>
        </button>

        {/* Stay Button */}
        <button 
          onClick={() => {
            stay();
            setSelectedCardId(null); // 🚀 アクション実行時に選択をクリア
          }} 
          className="group bg-slate-900 border border-slate-700 text-slate-300 rounded-2xl font-bold hover:bg-slate-800 hover:text-white transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-36 h-24 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          <span className="material-symbols-outlined text-emerald-400 text-2xl group-hover:scale-110 transition-transform">monitoring</span>
          <span>Stay (回復)</span>
        </button>

      </div>
    </div>
  );
};