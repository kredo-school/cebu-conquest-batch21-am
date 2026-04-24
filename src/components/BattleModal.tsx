import React from 'react';
import { useGameStore } from '../store';

export const BattleModal: React.FC = () => {
  const { 
    predictionModalOpen, 
    targetDistrictInfo, 
    atk, blessing, attack, move, closePrediction, stamina 
  } = useGameStore();

  if (!predictionModalOpen || !targetDistrictInfo) return null;

  // 状態フラグ
  const isMyTerritory = targetDistrictInfo.isMyTerritory;
  const isNeutral = targetDistrictInfo.isNeutral;
  const isEnemy = !isMyTerritory && !isNeutral;

  // バトル計算
  const finalAtk = atk * blessing;
  const enemyDef = targetDistrictInfo.enemyDef || 40;
  const winRate = (finalAtk / (finalAtk + enemyDef)) * 100;

  const AP_COST = 5;
  const canAction = stamina >= AP_COST;

  // 状況に応じたアクションを実行
  const handleExecute = () => {
    if (isMyTerritory) {
      move(targetDistrictInfo.id);
    } else {
      // 敵陣または中立への攻撃・占領
      attack(targetDistrictInfo.id);
    }
  };

  // 状況に応じたカラーリング設定
  let themeColor = 'text-orange-500';
  let borderColor = 'border-orange-500/50';
  let btnClass = 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20';
  let icon = '⚔️';
  let title = 'TACTICAL PREDICTION';
  let actionText = 'ATTACK';

  if (isMyTerritory) {
    themeColor = 'text-blue-400';
    borderColor = 'border-blue-500/50';
    btnClass = 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20';
    icon = '🚚';
    title = 'RELOCATE BASE';
    actionText = 'MOVE';
  } else if (isNeutral) {
    themeColor = 'text-emerald-400';
    borderColor = 'border-emerald-500/50';
    btnClass = 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20';
    icon = '🏳️';
    title = 'OCCUPY SECTOR';
    actionText = 'OCCUPY';
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm select-none">
      
      {/* モーダル本体 */}
      <div className={`relative bg-slate-900 border-2 ${borderColor} w-[360px] rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden`}>
        
        {/* 背景の装飾 */}
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <span className="material-symbols-outlined text-9xl">radar</span>
        </div>
        
        {/* ヘッダー */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <span className="text-xl">{icon}</span>
          <h2 className={`text-sm font-black tracking-widest uppercase ${themeColor}`}>
            {title}
          </h2>
        </div>

        {/* ターゲット情報 */}
        <div className="mb-6 relative z-10">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Target Sector</p>
          <div className="text-2xl font-black text-white italic tracking-tighter">
            {targetDistrictInfo.name}
          </div>
        </div>

        {/* 敵陣の場合のみ勝率予測を表示 */}
        {isEnemy && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 relative z-10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 font-bold">Your ATK (Est.)</span>
              <span className="text-sm font-black text-blue-400">{finalAtk.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-slate-400 font-bold">Enemy DEF (Est.)</span>
              <span className="text-sm font-black text-red-400">{enemyDef}</span>
            </div>
            
            <div className="border-t border-slate-800 pt-3 flex justify-between items-end">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Win Probability</span>
              <div className="text-3xl font-black text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]">
                {winRate.toFixed(1)}<span className="text-sm">%</span>
              </div>
            </div>
          </div>
        )}

        {/* 自陣・中立の場合の説明文 */}
        {!isEnemy && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 relative z-10">
            <p className="text-xs text-slate-400 font-bold leading-relaxed">
              {isMyTerritory 
                ? "本陣をこの地区に移動します。移動後はこの地区からの隣接エリアにしか攻撃できなくなります。" 
                : "この地区は現在無人です。戦闘なしで無血占領し、領土を拡大することが可能です。"}
            </p>
          </div>
        )}

        {/* ボタンエリア */}
        <div className="flex gap-3 relative z-10">
          <button 
            onClick={closePrediction} 
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all"
          >
            CANCEL
          </button>
          <button 
            onClick={handleExecute} 
            disabled={!canAction}
            className={`flex-[2] text-white font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95
              ${canAction ? btnClass : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'}`}
          >
            {canAction ? `${actionText} (-${AP_COST} AP)` : 'NO AP'}
          </button>
        </div>

      </div>
    </div>
  );
};