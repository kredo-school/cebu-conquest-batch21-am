import React, { useEffect } from 'react';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';

export const BattleModal: React.FC = () => {
  const { 
    // ⚔️ 予測モーダル用
    predictionModalOpen, 
    targetDistrictInfo, 
    atk, blessing, attack, move, closePrediction, ap,
    // 🚨 被弾アラート用に追加
    isMyTurn, escape, addLog,
    // 🚀 修正：useStateではなく、Store(グローバル)から呼び出す！
    isUnderAttack, setUnderAttack 
  } = useGameStore();

  // ==========================================
  // 🚨 1. 敵からの被弾アラート用ロジック
  // ==========================================
  useEffect(() => {
    const handleIncomingAttack = () => {
      // 念のため自分のターンでないことを確認
      if (!useGameStore.getState().isMyTurn) {
        setUnderAttack(true); // 🚀 修正：グローバル状態をONにしてサイドバーも赤くする
        try { SoundManager.playSe('alert'); } catch(e) {}
      }
    };

    window.addEventListener('INCOMING_ATTACK', handleIncomingAttack);
    return () => window.removeEventListener('INCOMING_ATTACK', handleIncomingAttack);
  }, [setUnderAttack]);

  const handleDefense = () => {
    try { SoundManager.playSe('click'); } catch(e) {}
    addLog("🛡️ 防御態勢を展開！ダメージを軽減します。");
    setUnderAttack(false); // 🚀 修正：グローバル状態をOFF
  };

  const handleEscape = () => {
    try { SoundManager.playSe('click'); } catch(e) {}
    escape();
    setUnderAttack(false); // 🚀 修正：グローバル状態をOFF
  };

  // ==========================================
  // ⚔️ 2. こちらからの攻撃・移動予測用ロジック
  // ==========================================
  let isMyTerritory = false;
  let isNeutral = false;
  let isEnemy = false;
  let finalAtk = 0;
  let enemyDef = 40;
  let winRate = 0;
  const AP_COST = 5;
  let canAction = false;

  let themeColor = 'text-orange-500';
  let borderColor = 'border-orange-500/50';
  let btnClass = 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20';
  let icon = '⚔️';
  let title = 'TACTICAL PREDICTION';
  let actionText = 'ATTACK';

  if (targetDistrictInfo) {
    isMyTerritory = targetDistrictInfo.isMyTerritory || false;
    isNeutral = targetDistrictInfo.isNeutral || false;
    isEnemy = !isMyTerritory && !isNeutral;

    finalAtk = atk * blessing;
    enemyDef = targetDistrictInfo.enemyDef || 40;
    winRate = (finalAtk / (finalAtk + enemyDef)) * 100;
    canAction = ap >= AP_COST;

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
  }

  const handleExecute = () => {
    if (!targetDistrictInfo) return;
    if (isMyTerritory) {
      move(targetDistrictInfo.id);
    } else {
      attack(targetDistrictInfo.id);
    }
  };

  // どちらも非表示ならレンダリングしない
  if (!predictionModalOpen && !isUnderAttack) return null;

  return (
    <>
      {/* 🚨 アラート用のCSSアニメーション */}
      <style>{`
        @keyframes overlay-alarm {
          0%, 100% { background-color: rgba(239, 68, 68, 0); }
          50% { background-color: rgba(239, 68, 68, 0.15); }
        }
        .animate-overlay-alarm {
          animation: overlay-alarm 2s infinite ease-in-out;
        }
        @keyframes slide-up-exit {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        .animate-slide-up-exit {
          animation: slide-up-exit 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: 2s;
        }
        @keyframes slide-in-right {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          transform: translateX(100%);
          opacity: 0;
          animation: slide-in-right 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: 2s;
        }
      `}</style>

      {/* ==========================================
          🚨 被弾アラート UI (相手のターンに表示)
         ========================================== */}
      {isUnderAttack && !isMyTurn && (
        <div className="absolute inset-0 z-[200] pointer-events-none overflow-hidden">
          <div className="absolute inset-0 animate-overlay-alarm pointer-events-none border-[12px] border-red-500/20"></div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-slide-up-exit">
            <div className="flex flex-col items-center gap-4 bg-slate-900/90 backdrop-blur-xl border-y border-red-500/50 py-8 px-24 shadow-[0_0_50px_rgba(239,68,68,0.5)]">
              <span className="material-symbols-outlined text-red-500 text-6xl animate-pulse">warning</span>
              <div className="text-center">
                {/* 🚀 修正: font-fixを追加 */}
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] font-fix">
                  INCOMING ATTACK
                </h2>
                <p className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase font-fix">
                  Opponent's Turn in Progress
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-12 right-12 flex gap-4 pointer-events-auto animate-slide-in-right">
            <button onClick={handleDefense} className="w-32 h-32 bg-slate-900/95 backdrop-blur-md border-2 border-blue-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-900/50 hover:border-blue-400 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] group active:scale-95">
              <span className="material-symbols-outlined text-blue-400 text-4xl group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">shield</span>
              <span className="text-xs font-black text-blue-100 uppercase tracking-widest font-fix">DEFENSE</span>
            </button>
            <button onClick={handleEscape} className="w-32 h-32 bg-slate-900/95 backdrop-blur-md border-2 border-red-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-red-900/50 hover:border-red-400 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] group active:scale-95">
              <span className="material-symbols-outlined text-red-400 text-4xl group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">directions_run</span>
              <span className="text-xs font-black text-red-100 uppercase tracking-widest font-fix">ESCAPE</span>
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          ⚔️ 攻撃・移動予測 UI
         ========================================== */}
      {predictionModalOpen && targetDistrictInfo && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm select-none">
          <div className={`relative bg-slate-900 border-2 ${borderColor} w-[360px] rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden`}>
            
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <span className="material-symbols-outlined text-9xl">radar</span>
            </div>
            
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <span className="text-xl">{icon}</span>
              <h2 className={`text-sm font-black tracking-widest uppercase ${themeColor} font-fix`}>
                {title}
              </h2>
            </div>

            <div className="mb-6 relative z-10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 font-fix">Target Sector</p>
              <div className="text-2xl font-black text-white italic tracking-tighter font-fix">
                {targetDistrictInfo.name}
              </div>
            </div>

            {isEnemy && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 relative z-10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400 font-bold font-fix">Your ATK (Est.)</span>
                  <span className="text-sm font-black text-blue-400 font-fix">{finalAtk.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-slate-400 font-bold font-fix">Enemy DEF (Est.)</span>
                  <span className="text-sm font-black text-red-400 font-fix">{enemyDef}</span>
                </div>
                <div className="border-t border-slate-800 pt-3 flex justify-between items-end">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest font-fix">Win Probability</span>
                  <div className="text-3xl font-black text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)] font-fix">
                    {winRate.toFixed(1)}<span className="text-sm">%</span>
                  </div>
                </div>
              </div>
            )}

            {!isEnemy && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 relative z-10">
                <p className="text-xs text-slate-400 font-bold leading-relaxed font-fix">
                  {isMyTerritory 
                    ? "本陣をこの地区に移動します。移動後はこの地区からの隣接エリアにしか攻撃できなくなります。" 
                    : "この地区は現在無人です。戦闘なしで無血占領し、領土を拡大することが可能です。"}
                </p>
              </div>
            )}

            <div className="flex gap-3 relative z-10">
              <button onClick={closePrediction} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all">
                <span className="font-fix">CANCEL</span>
              </button>
              <button onClick={handleExecute} disabled={!canAction} className={`flex-[2] text-white font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${canAction ? btnClass : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'}`}>
                <span className="font-fix">{canAction ? `${actionText} (-${AP_COST} AP)` : 'NO AP'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};