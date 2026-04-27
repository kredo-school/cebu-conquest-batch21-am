import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';

// 🚀 修正：Sidebarへ移行したため、プロップス（onOpen...）を削除
interface HUDProps {}

// 🚀 演出の二重発火（点滅）を物理的に防ぐためのトラッカー
let globalPhaseTracker = {
  lastTurn: -1,
  played: false
};

export const HUD: React.FC<HUDProps> = () => {
  const { 
    districts, isMyTurn, turn, isSubmitted, activeBuffs,
    players, attack, stay
  } = useGameStore();

  const [showPhase, setShowPhase] = useState(false);

  // 🚀 YOUR PHASE 演出制御
  useEffect(() => {
    if (globalPhaseTracker.lastTurn !== turn) {
      globalPhaseTracker.lastTurn = turn;
      globalPhaseTracker.played = false;
    }

    if (isMyTurn && !isSubmitted && turn > 0 && !globalPhaseTracker.played) {
      globalPhaseTracker.played = true;
      setShowPhase(true);
      const timer = setTimeout(() => setShowPhase(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isMyTurn, isSubmitted, turn]);

  // --- 📊 勢力計算 ---
  const totalDistricts = Object.keys(districts).length || 11;
  const teamStats = (players || []).map(player => {
    const ownedCount = Object.values(districts).filter(ownerId => ownerId === player.id).length;
    return {
      id: player.id,
      color: player.color || '#f97316',
      percent: totalDistricts > 0 ? (ownedCount / totalDistricts) * 100 : 0
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-body select-none flex flex-col">
      
      {/* 🚀 1. 中央上部：勢力分布バー */}
      <div className="p-8 flex justify-center items-start pointer-events-auto">
        <div className="flex h-14 w-[480px] bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
          {teamStats.map((team) => (
            <div 
              key={team.id}
              className="h-full flex items-center justify-center transition-all duration-1000 border-r border-white/5 last:border-r-0"
              style={{ 
                width: `${team.percent}%`, 
                background: `linear-gradient(180deg, ${team.color}66 0%, ${team.color}33 100%)` 
              }}
            >
              {/* 🚀 修正: font-fixを追加 */}
              <span className="text-lg font-black text-white italic px-2 font-fix">
                {team.percent.toFixed(1)}%
              </span>
            </div>
          ))}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 -translate-x-full animate-[shimmer_5s_infinite]"></div>
        </div>
      </div>

      {/* 🚀 2. 中央：YOUR PHASE アニメーション */}
      <div className="flex-grow flex items-center justify-center">
        {showPhase && (
          <div className="phase-animation-container flex flex-col items-center relative p-16">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-500/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-500/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/50"></div>
            <div className="flex items-center gap-4 mb-2">
              {/* 🚀 修正: font-fixを追加 */}
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.5em] holographic-text font-fix">TACTICAL ENGAGEMENT</span>
            </div>
            {/* 🚀 修正: font-fixを追加し、leading-noneとの競合を調整 */}
            <h1 className="holographic-text text-8xl md:text-9xl font-black italic tracking-tighter uppercase flex flex-col items-center font-fix">
              <span className="text-white block mt-2">YOUR</span>
              <span className="text-orange-500 -mt-4 block">PHASE</span>
            </h1>
          </div>
        )}
      </div>

      {/* 🚀 3. 下部：カードとアクションボタン */}
      <div className="p-12 w-full flex items-end justify-between transition-all duration-500">
        
        {/* 左側：アイテムカード */}
        <div className="flex items-end -space-x-16 pointer-events-auto">
          {activeBuffs.map((buff, i) => (
            <div key={buff.id} className={`group relative z-[${10+i}] flex flex-col items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl w-32 h-48 transition-all duration-300 hover:-translate-y-8 hover:scale-110 hover:z-50 hover:border-orange-500 shadow-xl cursor-default overflow-hidden`}>
              <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 mb-2">
                <span className="material-symbols-outlined text-orange-400 text-3xl">
                  {buff.id % 2 === 0 ? 'fort' : 'restaurant'}
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                {/* 🚀 修正: font-fixを追加 */}
                <span className="text-sm font-black text-slate-100 tracking-wider mb-1 font-fix">{buff.name}</span>
                {/* 🚀 修正: font-fixを追加 */}
                <span className="text-[9px] text-green-400 font-bold uppercase leading-tight font-fix">{buff.effect}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 右側：大型アクションボタン */}
        <div className={`flex gap-5 items-end transition-all duration-500 ${isMyTurn && !isSubmitted ? 'opacity-100 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button 
            onClick={() => attack(0)}
            className="group relative overflow-hidden bg-orange-600 text-white rounded-lg font-black italic tracking-tighter shadow-[0_0_40px_rgba(234,88,12,0.5)] hover:shadow-[0_0_60px_rgba(234,88,12,0.7)] active:scale-95 transition-all flex flex-col items-center justify-center gap-2 w-44 h-24 text-2xl"
          >
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>swords</span>
            {/* 🚀 修正: font-fixを追加 */}
            <span className="font-fix">攻撃</span>
          </button>

          <button 
            onClick={stay}
            className="group bg-slate-900/80 backdrop-blur-xl border-2 border-slate-700/80 text-slate-100 rounded-lg font-bold hover:bg-slate-800 hover:border-orange-500/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 w-44 h-24 text-xl"
          >
            <span className="material-symbols-outlined text-green-400 text-2xl">vitals</span>
            {/* 🚀 修正: font-fixを追加 */}
            <span className="font-fix">Stay (回復)</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 
          0% { transform: translateX(-100%) skewX(-15deg); } 
          100% { transform: translateX(200%) skewX(-15deg); } 
        }
        @keyframes phase-bounce-zoom {
          0% { opacity: 0; transform: scale(0); filter: brightness(2); }
          15% { opacity: 1; transform: scale(1.2); filter: brightness(1.5); }
          20% { transform: scale(0.95); }
          25% { transform: scale(1); filter: brightness(1); }
          35%, 55%, 75% { text-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 40px rgba(249, 115, 22, 0.4); }
          45%, 65% { text-shadow: 0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3); }
          85% { opacity: 1; transform: scale(1); filter: brightness(1); }
          100% { opacity: 0; transform: scale(0); filter: brightness(3); }
        }
        .phase-animation-container {
          animation: phase-bounce-zoom 3.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .holographic-text {
          text-shadow: 0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3);
        }
      `}</style>
    </div>
  );
};