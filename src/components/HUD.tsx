// src/components/HUD.tsx
import React, { useEffect, useState, useMemo, memo } from 'react';
import { useGameStore } from '../store';

type HUDProps = object;

<<<<<<< HEAD
// 🚀 島ID定数（Sidebarと統一）
const ISLAND_NAMES: Record<number, string> = {
  11: "CEBU MAINLAND",
  12: "MACTAN ISLAND",
  13: "BOHOL",
  14: "NEGROS",
  15: "SIQUIJOR"
};

const globalPhaseTracker = {
=======
// フェーズ演出の重複再生を防止するフラグ
let globalPhaseTracker = {
>>>>>>> edde3b1 (design fixxxxxxx)
  lastTurn: -1,
  played: false
};

export const HUD: React.FC<HUDProps> = memo(() => {
  // 🚀 最適化：レンダリング負荷軽減のため、必要な値のみを個別に抽出
  const districts = useGameStore(state => state.districts);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const turn = useGameStore(state => state.turn);
  const ap = useGameStore(state => state.ap);
  const maxAp = useGameStore(state => state.maxAp);
  const atk = useGameStore(state => state.atk);
  const blessing = useGameStore(state => state.blessing);
  const isSubmitted = useGameStore(state => state.isSubmitted);
  const activeBuffs = useGameStore(state => state.activeBuffs);
  const players = useGameStore(state => state.players);
  const attack = useGameStore(state => state.attack);
  const stay = useGameStore(state => state.stay);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const setErrorMessage = useGameStore(state => state.setErrorMessage);
  const lookupData = useGameStore(state => state.lookupData);

  // 🛰️ Week 5：LOD（情報の粒度）連動ロジック
  const zoomLevel = useGameStore(state => state.zoomLevel);
  // ズームアウト時は UI を透過させて視認性を確保（Strategic Mode）
  const isStrategicMode = useMemo(() => zoomLevel < 0.75, [zoomLevel]);
  // 極端なズームアウト時は演出をカットしてパフォーマンス優先
  const isPhaseAnimationEnabled = useMemo(() => zoomLevel >= 0.6, [zoomLevel]);

  const [showPhase, setShowPhase] = useState(false);

  // 🚀 GDD 4-1 準拠：最終攻撃力のリアルタイム計算
  const finalAtk = useMemo(() => Math.floor(atk * blessing), [atk, blessing]);

  // アクション実行可能判定
  const canAttack = useMemo(() => {
    return isMyTurn && !isSubmitted && ap >= 5 && selectedDistrictId !== null;
  }, [isMyTurn, isSubmitted, ap, selectedDistrictId]);

  // ✅ GDD v3.1：lookupData を使用して安全かつ高速にターゲット情報を取得
  const targetInfo = useMemo(() => {
    if (!selectedDistrictId || !lookupData || !lookupData.districts) return null;

    const district = lookupData.districts.get(selectedDistrictId);
    if (!district) return null;

    // 階層構造（District -> Area -> Island）を遡って解決
    const area = lookupData.areas?.get(district.parentAreaId);
    const island = lookupData.islands?.get(area?.parentIslandId);

    return {
      islandName: island?.name || area?.name || "UNKNOWN SECTOR",
      unit: selectedDistrictId,
      fullCode: district.name 
    };
  }, [selectedDistrictId, lookupData]);

  // 📢 "YOUR PHASE" 演出の制御
  useEffect(() => {
    if (globalPhaseTracker.lastTurn !== turn) {
      globalPhaseTracker.lastTurn = turn;
      globalPhaseTracker.played = false;
    }
    if (isMyTurn && !isSubmitted && turn > 0 && !globalPhaseTracker.played) {
      if (isPhaseAnimationEnabled) {
        globalPhaseTracker.played = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowPhase(true);
        const timer = setTimeout(() => setShowPhase(false), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [isMyTurn, isSubmitted, turn, isPhaseAnimationEnabled]);

  // 勢力分布計算
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

  // LOD 適用クラス
  const lodClasses = isStrategicMode 
    ? "opacity-30 scale-95 grayscale-[0.3] hover:opacity-100 hover:scale-100 hover:grayscale-0" 
    : "opacity-100 scale-100";

  const handleAttack = () => {
    if (ap < 5) {
      setErrorMessage("INSUFFICIENT AP (スタミナ不足)");
      return;
    }
    if (!selectedDistrictId) {
      setErrorMessage("TARGET NOT SELECTED (対象未選択)");
      return;
    }
    attack(selectedDistrictId);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-body select-none flex flex-col transition-all duration-700 ease-in-out">
      
      {/* 1. 中央上部：勢力分布バー（LOD対応） */}
      <div className={`p-8 flex justify-center items-start pointer-events-auto transition-all duration-700 ${lodClasses}`}>
        <div className="flex h-12 w-[440px] bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
          {teamStats.map((team) => (
            <div 
              key={team.id} 
              className="h-full flex items-center justify-center transition-all duration-1000 border-r border-white/5 last:border-r-0" 
              style={{ width: `${team.percent}%`, background: `linear-gradient(180deg, ${team.color}88 0%, ${team.color}44 100%)` }}
            >
              <span className="text-base font-black text-white italic px-2 font-fix drop-shadow-md">{team.percent.toFixed(0)}%</span>
            </div>
          ))}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 -translate-x-full animate-[shimmer_5s_infinite]"></div>
        </div>
      </div>

      {/* 2. 中央：YOUR PHASE アニメーション */}
      <div className="flex-grow flex items-center justify-center">
        {showPhase && (
          <div className="phase-animation-container flex flex-col items-center relative p-16">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/50"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-500/50"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-500/50"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/50"></div>
            <div className="flex items-center gap-4 mb-2">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.5em] font-fix">TACTICAL ENGAGEMENT</span>
            </div>
            <h1 className="holographic-text text-8xl md:text-9xl font-black italic tracking-tighter uppercase flex flex-col items-center font-fix">
              <span className="text-white block mt-2">YOUR</span>
              <span className="text-orange-500 -mt-4 block">PHASE</span>
            </h1>
          </div>
        )}
      </div>

      {/* 3. 下部：アクションUI（LOD対応） */}
      <div className={`p-12 w-full flex items-end justify-between transition-all duration-700 ${lodClasses}`}>
        
        {/* 左側：アクティブバフカード */}
        <div className="flex items-end -space-x-12 pointer-events-auto">
          {activeBuffs.map((buff, i) => (
            <div key={buff.id} style={{ zIndex: 10 + i }} className="group relative flex flex-col items-center justify-between p-4 bg-slate-950/80 backdrop-blur-md border border-slate-800/50 rounded-xl w-28 h-40 transition-all duration-300 hover:-translate-y-8 hover:scale-110 hover:border-orange-500 shadow-xl overflow-hidden">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30 mb-2">
                <span className="material-symbols-outlined text-orange-400 text-2xl">{buff.id % 2 === 0 ? 'fort' : 'restaurant'}</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-black text-slate-100 tracking-wider mb-1 font-fix line-clamp-1">{buff.name}</span>
                <span className="text-[8px] text-green-400 font-bold uppercase font-fix">{buff.effect}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 右側：アクションボタン群 */}
        <div className="flex flex-col items-end gap-4">
          {targetInfo && (
            <div className="bg-orange-600/10 border-r-4 border-orange-600 px-4 py-2 flex flex-col items-end backdrop-blur-md animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-orange-500 tracking-widest uppercase font-fix">Targeting Sector</span>
                <span className="text-[10px] font-mono text-white bg-orange-600 px-1.5 py-0.5 rounded-sm font-bold">{targetInfo.fullCode}</span>
              </div>
              <div className="text-sm font-black text-white italic font-fix tracking-tight">{targetInfo.islandName}</div>
            </div>
          )}

          <div className={`flex gap-5 items-end transition-all duration-500 ${isMyTurn && !isSubmitted ? 'opacity-100 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            {/* 攻撃ボタン */}
            <div className="relative group">
              <button 
                onClick={handleAttack}
                disabled={!canAttack}
                className={`relative overflow-hidden w-44 h-24 rounded-lg font-black italic tracking-tighter transition-all active:scale-95 flex flex-col items-center justify-center gap-1 text-2xl ${canAttack ? 'bg-orange-600 text-white shadow-[0_0_40px_rgba(234,88,12,0.4)] hover:bg-orange-500' : 'bg-slate-900/80 text-slate-600 border border-slate-800 cursor-not-allowed opacity-80'}`}
              >
                <span className={`material-symbols-outlined text-3xl ${canAttack ? 'animate-pulse' : ''}`} style={{ fontVariationSettings: '"FILL" 1' }}>swords</span>
                <span className="font-fix">攻撃 (ATK:{finalAtk})</span>
                {!canAttack && ap < 5 && isMyTurn && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[10px] text-red-500 font-black tracking-tighter uppercase px-2 py-0.5 border border-red-500/50 bg-black">LOW AP</span>
                  </div>
                )}
              </button>
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black border ${ap >= 5 ? 'bg-slate-950 border-cyan-500 text-cyan-400' : 'bg-red-950 border-red-500 text-red-500'}`}>
                COST: 5 AP
              </div>
            </div>

            {/* 回復ボタン */}
            <button 
              onClick={stay}
              disabled={isSubmitted}
              className="group bg-slate-900/90 backdrop-blur-xl border-2 border-slate-800 text-slate-100 rounded-lg font-bold hover:bg-slate-800 hover:border-orange-500/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-40 h-24 text-xl shadow-lg"
            >
              <span className="material-symbols-outlined text-green-400 text-2xl">vitals</span>
              <span className="font-fix text-lg">Stay (回復)</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest font-fix">HP+20 / AP+30</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(200%) skewX(-15deg); } }
        @keyframes phase-bounce-zoom {
          0% { opacity: 0; transform: scale(0); filter: brightness(2); }
          15% { opacity: 1; transform: scale(1.2); filter: brightness(1.5); }
          20% { transform: scale(0.95); }
          25% { transform: scale(1); filter: brightness(1); }
          85% { opacity: 1; transform: scale(1); filter: brightness(1); }
          100% { opacity: 0; transform: scale(0); filter: brightness(3); }
        }
        .phase-animation-container { animation: phase-bounce-zoom 3.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .holographic-text { text-shadow: 0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3); }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .font-fix { line-height: 1; }
      `}</style>
    </div>
  );
});