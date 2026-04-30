// src/components/HUD.tsx
import React, { useEffect, useState, useMemo, memo } from 'react';
import { useGameStore } from '../store';

interface HUDProps {}

// 🚀 島ID定数（Sidebarと統一）
const ISLAND_NAMES: Record<number, string> = {
  11: "CEBU MAINLAND",
  12: "MACTAN ISLAND",
  13: "BOHOL",
  14: "NEGROS",
  15: "SIQUIJOR"
};

let globalPhaseTracker = {
  lastTurn: -1,
  played: false
};

// 🚀 React.memo でラップし、不要な再レンダリングを防止
export const HUD: React.FC<HUDProps> = memo(() => {
  // 🚀 最適化：必要な値だけを個別に、最小単位でセレクト
  const districts = useGameStore(state => state.districts);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const turn = useGameStore(state => state.turn);
  const isSubmitted = useGameStore(state => state.isSubmitted);
  const activeBuffs = useGameStore(state => state.activeBuffs);
  const players = useGameStore(state => state.players);
  const attack = useGameStore(state => state.attack);
  const stay = useGameStore(state => state.stay);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);

  // 🚀 FPS安定化の鍵：数値を直接見ず、Booleanに変換して監視
  // これにより、zoomLevelが 0.8 -> 0.79 と動いても、0.75を跨がない限り再描画されない
  const isStrategicMode = useGameStore(state => state.zoomLevel < 0.75);
  const isPhaseAnimationEnabled = useGameStore(state => state.zoomLevel >= 0.6);

  const [showPhase, setShowPhase] = useState(false);

  // 🚀 ターゲット地区の情報解析
  const targetInfo = useMemo(() => {
    if (!selectedDistrictId) return null;
    const islandId = Math.floor(selectedDistrictId / 1000);
    const sequence = selectedDistrictId % 1000;
    return {
      islandName: ISLAND_NAMES[islandId] || "UNKNOWN SECTOR",
      unit: sequence,
      fullCode: `${islandId}-${sequence}`
    };
  }, [selectedDistrictId]);

  // 🚀 YOUR PHASE 演出制御（最適化：監視対象を数値からBooleanへ）
  useEffect(() => {
    if (globalPhaseTracker.lastTurn !== turn) {
      globalPhaseTracker.lastTurn = turn;
      globalPhaseTracker.played = false;
    }

    if (isMyTurn && !isSubmitted && turn > 0 && !globalPhaseTracker.played) {
      if (isPhaseAnimationEnabled) { // 🚀 0.6以上の時だけ実行
        globalPhaseTracker.played = true;
        setShowPhase(true);
        const timer = setTimeout(() => setShowPhase(false), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [isMyTurn, isSubmitted, turn, isPhaseAnimationEnabled]);

  // --- 📊 勢力計算 ---
  const teamStats = useMemo(() => {
    const totalDistricts = Object.keys(districts).length || 1;
    return (players || []).map(player => {
      const ownedCount = Object.values(districts).filter(ownerId => ownerId === player.id).length;
      return {
        id: player.id,
        color: player.color || '#f97316',
        percent: (ownedCount / totalDistricts) * 100
      };
    });
  }, [districts, players]);

  const lodClasses = isStrategicMode 
    ? "opacity-30 scale-95 grayscale-[0.3] hover:opacity-100 hover:scale-100 hover:grayscale-0" 
    : "opacity-100 scale-100";

  // ✅ 修正：攻撃ボタンのハンドラ
  // attack(0) を送っていたバグを修正。selectedDistrictId が未選択の場合はログを出してガードする。
  const handleAttack = () => {
    if (!selectedDistrictId) {
      window.dispatchEvent(new CustomEvent('gameLog', { detail: '⚠️ 攻撃対象を先にタップして選択してください' }));
      return;
    }
    attack(selectedDistrictId);
  };

  return (
    <div className={`absolute inset-0 pointer-events-none z-30 font-body select-none flex flex-col transition-all duration-700 ease-in-out`}>
      
      {/* 🚀 1. 中央上部：勢力分布バー */}
      <div className={`p-8 flex justify-center items-start pointer-events-auto transition-all duration-700 ${lodClasses}`}>
        <div className="flex h-12 w-[440px] bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl relative text-left">
          {teamStats.map((team) => (
            <div 
              key={team.id}
              className="h-full flex items-center justify-center transition-all duration-1000 border-r border-white/5 last:border-r-0"
              style={{ 
                width: `${team.percent}%`, 
                background: `linear-gradient(180deg, ${team.color}88 0%, ${team.color}44 100%)` 
              }}
            >
              <span className="text-base font-black text-white italic px-2 font-fix drop-shadow-md">
                {team.percent.toFixed(0)}%
              </span>
            </div>
          ))}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full animate-[shimmer_5s_infinite]"></div>
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
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.5em] holographic-text font-fix">TACTICAL ENGAGEMENT</span>
            </div>
            <h1 className="holographic-text text-8xl md:text-9xl font-black italic tracking-tighter uppercase flex flex-col items-center font-fix">
              <span className="text-white block mt-2">YOUR</span>
              <span className="text-orange-500 -mt-4 block">PHASE</span>
            </h1>
          </div>
        )}
      </div>

      {/* 🚀 3. 下部：カードとアクションボタン */}
      <div className={`p-12 w-full flex items-end justify-between transition-all duration-700 ${lodClasses}`}>
        
        {/* 左側：アイテムカード */}
        <div className="flex items-end -space-x-12 pointer-events-auto">
          {activeBuffs.map((buff, i) => (
            <div 
              key={buff.id} 
              className={`group relative z-[${10+i}] flex flex-col items-center justify-between p-4 bg-slate-950/80 backdrop-blur-md border border-slate-800/50 rounded-xl w-28 h-40 transition-all duration-300 hover:-translate-y-8 hover:scale-110 hover:z-50 hover:border-orange-500 shadow-xl cursor-default overflow-hidden text-left`}
            >
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 mb-2">
                <span className="material-symbols-outlined text-orange-400 text-2xl">
                  {buff.id % 2 === 0 ? 'fort' : 'restaurant'}
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-black text-slate-100 tracking-wider mb-1 font-fix line-clamp-1">{buff.name}</span>
                <span className="text-[8px] text-green-400 font-bold uppercase leading-tight font-fix">{buff.effect}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 右側：ターゲット情報 & 大型アクションボタン */}
        <div className="flex flex-col items-end gap-4 text-left">
          {targetInfo && (
            <div className="bg-orange-600/10 border-r-4 border-orange-600 px-4 py-2 flex flex-col items-end backdrop-blur-md animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-orange-500 tracking-widest uppercase font-fix">Targeting Sector</span>
                <span className="text-[10px] font-mono text-white bg-orange-600 px-1.5 py-0.5 rounded-sm font-bold">
                  {targetInfo.fullCode}
                </span>
              </div>
              <div className="text-sm font-black text-white italic font-fix tracking-tight text-right">
                {targetInfo.islandName}
              </div>
            </div>
          )}

          <div className={`flex gap-5 items-end transition-all duration-500 ${isMyTurn && !isSubmitted ? 'opacity-100 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            {/* ✅ 修正：onClick を handleAttack に変更。地区未選択時は disabled スタイルを適用 */}
            <button 
              onClick={handleAttack}
              disabled={!selectedDistrictId || isSubmitted}
              className={`group relative overflow-hidden bg-orange-600 text-white rounded-lg font-black italic tracking-tighter shadow-[0_0_40px_rgba(234,88,12,0.4)] hover:shadow-[0_0_60px_rgba(234,88,12,0.6)] active:scale-95 transition-all flex flex-col items-center justify-center gap-2 w-40 h-24 text-2xl ${!selectedDistrictId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>swords</span>
              <span className="font-fix">攻撃</span>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </button>

            <button 
              onClick={stay}
              className="group bg-slate-900/90 backdrop-blur-xl border-2 border-slate-800 text-slate-100 rounded-lg font-bold hover:bg-slate-800 hover:border-orange-500/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 w-40 h-24 text-xl shadow-lg"
            >
              <span className="material-symbols-outlined text-green-400 text-2xl">vitals</span>
              <span className="font-fix">Stay (回復)</span>
            </button>
          </div>
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
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}); 
