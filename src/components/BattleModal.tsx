import React, { useEffect, useMemo, memo } from 'react';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';

// 🚀 ESLint警告対策：anyを使わず、隣接チェックに必要な型を定義
interface Territory {
  district_id: number;
  neighbors?: number[];
}

// 🚀 React.memoでラップし、不要なレンダリングをガード 
export const BattleModal: React.FC = memo(() => {
  const { 
    predictionModalOpen, 
    targetDistrictInfo, 
    selectedDistrictId,
    masterData,
    atk, blessing, attack, move, closePrediction, ap,
    isMyTurn, escape, addLog,
    isUnderAttack, setUnderAttack,
    lookupData 
  } = useGameStore();

  // ✅ 修正箇所1: lookupData を使って安全にターゲット情報を取得（undefined エラー対策）
  const targetParsed = useMemo(() => {
    if (!targetDistrictInfo || !lookupData || !lookupData.districts) return null;
    
    const district = lookupData.districts.get(targetDistrictInfo.id);
    if (!district) return null;

    const area = lookupData.areas?.get(district.parentAreaId);
    
    // 🚀 TSエラー対策：parentIslandId が undefined でないことを確認してから get を実行
    const islandId = area?.parentIslandId;
    const island = typeof islandId === 'number' ? lookupData.islands?.get(islandId) : null;

    return {
      islandName: island?.name?.toUpperCase() || area?.name?.toUpperCase() || "UNKNOWN SECTOR",
      sectorCode: targetDistrictInfo.id 
    };
  }, [targetDistrictInfo, lookupData]);

  // 🚀 修正箇所2: 隣接チェックロジック（(t: any) を排除）
  const isAdjacent = useMemo(() => {
    if (!targetDistrictInfo || !masterData || selectedDistrictId === null) return false;
    
    // 型を Territory に指定することで ESLint 警告を解消
    const current = (masterData.territories as Territory[])?.find((t) => t.district_id === selectedDistrictId);
    return current?.neighbors?.includes(Number(targetDistrictInfo.id)) || false;
  }, [targetDistrictInfo, masterData, selectedDistrictId]);

  // 🚨 敵からの被弾アラート用ロジック
  useEffect(() => {
    const handleIncomingAttack = () => {
      if (!useGameStore.getState().isMyTurn) {
        setUnderAttack(true);
        try { SoundManager.playSe('alert'); } catch {}
      }
    };
    window.addEventListener('INCOMING_ATTACK', handleIncomingAttack);
    return () => window.removeEventListener('INCOMING_ATTACK', handleIncomingAttack);
  }, [setUnderAttack]);

  const handleDefense = () => {
    try { SoundManager.playSe('click'); } catch {}
    addLog("🛡️ 防御態勢を展開！ダメージを軽減します。");
    setUnderAttack(false);
  };

  const handleEscape = () => {
    try { SoundManager.playSe('click'); } catch {}
    escape();
    setUnderAttack(false);
  };

  // ⚔️ バトルロジック変数
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

    // 🚀 リンク状況とAPの両方が揃った時だけアクション可能
    canAction = isAdjacent && ap >= AP_COST;

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
    if (!targetDistrictInfo || !canAction) return;
    try { SoundManager.playSe('click'); } catch {}
    if (isMyTerritory) {
      move(targetDistrictInfo.id);
    } else {
      attack(targetDistrictInfo.id);
    }
  };

  if (!predictionModalOpen && !isUnderAttack) return null;

  return (
    <>
      <style>{`
        @keyframes overlay-alarm {
          0%, 100% { background-color: rgba(239, 68, 68, 0); }
          50% { background-color: rgba(239, 68, 68, 0.15); }
        }
        .animate-overlay-alarm { animation: overlay-alarm 2s infinite ease-in-out; }
        @keyframes slide-up-exit {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        .animate-slide-up-exit { animation: slide-up-exit 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; animation-delay: 2s; }
        @keyframes slide-in-right {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { transform: translateX(100%); opacity: 0; animation: slide-in-right 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .font-fix { line-height: 1.2; }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>

      {/* 🚨 被弾アラート UI */}
      {isUnderAttack && !isMyTurn && (
        <div className="absolute inset-0 z-[200] pointer-events-none overflow-hidden">
          <div className="absolute inset-0 animate-overlay-alarm pointer-events-none border-[12px] border-red-500/20"></div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-slide-up-exit">
            <div className="flex flex-col items-center gap-4 bg-slate-900/90 backdrop-blur-xl border-y border-red-500/50 py-8 px-24 shadow-[0_0_50px_rgba(239,68,68,0.5)]">
              <span className="material-symbols-outlined text-red-500 text-6xl animate-pulse">warning</span>
              <div className="text-center">
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] font-fix text-left">INCOMING ATTACK</h2>
                <p className="text-red-400 text-xs font-bold tracking-[0.3em] uppercase font-fix text-left">Opponent's Turn in Progress</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-12 right-12 flex gap-4 pointer-events-auto animate-slide-in-right" style={{ animationDelay: '2s' }}>
            <button onClick={handleDefense} className="w-32 h-32 bg-slate-900/95 backdrop-blur-md border-2 border-blue-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-900/50 hover:border-blue-400 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] group active:scale-95">
              <span className="material-symbols-outlined text-blue-400 text-4xl group-hover:scale-110 transition-transform">shield</span>
              <span className="text-xs font-black text-blue-100 uppercase tracking-widest font-fix">DEFENSE</span>
            </button>
            <button onClick={handleEscape} className="w-32 h-32 bg-slate-900/95 backdrop-blur-md border-2 border-red-500/40 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-red-900/50 hover:border-red-400 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] group active:scale-95">
              <span className="material-symbols-outlined text-red-400 text-4xl group-hover:scale-110 transition-transform">directions_run</span>
              <span className="text-xs font-black text-red-100 uppercase tracking-widest font-fix">ESCAPE</span>
            </button>
          </div>
        </div>
      )}

      {/* ⚔️ 攻撃・移動予測 UI */}
      {predictionModalOpen && targetDistrictInfo && targetParsed && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm select-none pointer-events-auto">
          <div className={`relative bg-slate-900 border-2 ${borderColor} w-[380px] rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden animate-fadeIn`}>
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <h2 className={`text-[11px] font-black tracking-widest uppercase ${themeColor} font-fix`}>
                  {title}
                </h2>
              </div>
              <div className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[10px] font-mono text-slate-400">
                SEC-{targetParsed.sectorCode}
              </div>
            </div>

            <div className="mb-6 relative z-10 text-left">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 font-fix">
                {targetParsed.islandName}
              </span>
              <div className="text-2xl font-black text-white italic tracking-tighter font-fix uppercase">
                {targetDistrictInfo.name}
              </div>
            </div>

            {/* 🚀 リンクステータスのバッジ */}
            <div className="flex justify-between items-center mb-4 px-1">
               <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-fix">Link Status</span>
               <span className={`text-[10px] font-black font-fix px-2 py-0.5 rounded ${isAdjacent ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10 animate-pulse'}`}>
                 {isAdjacent ? 'STABLE (ADJACENT)' : 'OUT OF RANGE'}
               </span>
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
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 relative z-10 text-left">
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed font-fix">
                  {isMyTerritory 
                    ? "本陣をこの地区に移動します。移動後はこの地区からの隣接エリアにしか攻撃できなくなります。" 
                    : "この地区は現在無人です。戦闘なしで無血占領し、領土を拡大することが可能です。"}
                </p>
              </div>
            )}

            <div className="flex gap-3 relative z-10">
              <button 
                onClick={closePrediction} 
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                <span className="font-fix">CANCEL</span>
              </button>
              <button 
                onClick={handleExecute} 
                disabled={!canAction} 
                className={`flex-[2] text-white font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${canAction ? btnClass : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none grayscale opacity-60'}`}
              >
                <span className="font-fix">
                  {!isAdjacent ? 'OUT OF RANGE' : (ap >= AP_COST ? `${actionText} (-${AP_COST} AP)` : 'NO AP')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});