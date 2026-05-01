// src/components/HUD.tsx
import React, { useEffect, useState, useMemo, memo, useRef } from 'react';
import { useGameStore } from '../store';

type HUDProps = object;

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

export const HUD: React.FC<HUDProps> = memo(() => {
  // 🚀 修正：logs をストアから取得
  const logs = useGameStore(state => state.logs);
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
  const zoomLevel = useGameStore(state => state.zoomLevel);

  const logEndRef = useRef<HTMLDivElement>(null);

  const isStrategicMode = useMemo(() => zoomLevel < 0.75, [zoomLevel]);
  const isPhaseAnimationEnabled = useMemo(() => zoomLevel >= 0.6, [zoomLevel]);
  const [showPhase, setShowPhase] = useState(false);

  const finalAtk = useMemo(() => Math.floor(atk * blessing), [atk, blessing]);

  const canAttack = useMemo(() => {
    return isMyTurn && !isSubmitted && ap >= 5 && selectedDistrictId !== null;
  }, [isMyTurn, isSubmitted, ap, selectedDistrictId]);

  const targetInfo = useMemo(() => {
    if (!selectedDistrictId || !lookupData || !lookupData.districts) return null;
    const district = lookupData.districts.get(selectedDistrictId);
    if (!district) return null;
    const area = lookupData.areas?.get(district.parentAreaId);
    const island = lookupData.islands?.get(area?.parentIslandId);
    return {
      islandName: island?.name || area?.name || "UNKNOWN SECTOR",
      unit: selectedDistrictId,
      fullCode: district.name 
    };
  }, [selectedDistrictId, lookupData]);

  // ログの自動スクロール
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (globalPhaseTracker.lastTurn !== turn) {
      globalPhaseTracker.lastTurn = turn;
      globalPhaseTracker.played = false;
    }
    if (isMyTurn && !isSubmitted && turn > 0 && !globalPhaseTracker.played) {
      if (isPhaseAnimationEnabled) {
        globalPhaseTracker.played = true;
        setShowPhase(true);
        const timer = setTimeout(() => setShowPhase(false), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [isMyTurn, isSubmitted, turn, isPhaseAnimationEnabled]);

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

  const handleAttack = () => {
    if (ap < 5) { setErrorMessage("INSUFFICIENT AP"); return; }
    if (!selectedDistrictId) { setErrorMessage("TARGET NOT SELECTED"); return; }
    attack(selectedDistrictId);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-body select-none flex flex-col transition-all duration-700 ease-in-out">
      
      {/* 1. 中央上部：勢力分布バー */}
      <div className={`p-8 flex justify-center items-start pointer-events-auto transition-all duration-700 ${lodClasses}`}>
        <div className="flex h-10 w-[400px] bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
          {teamStats.map((team) => (
            <div key={team.id} className="h-full flex items-center justify-center transition-all duration-1000 border-r border-white/5 last:border-r-0" style={{ width: `${team.percent}%`, background: `linear-gradient(180deg, ${team.color}88 0%, ${team.color}44 100%)` }}>
              <span className="text-xs font-black text-white italic px-2 font-fix drop-shadow-md">{team.percent.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 中央：YOUR PHASE アニメーション */}
      <div className="flex-grow flex items-center justify-center">
        {showPhase && (
          <div className="phase-animation-container flex flex-col items-center relative p-16">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.5em] font-fix">TACTICAL ENGAGEMENT</span>
            </div>
            <h1 className="holographic-text text-8xl md:text-9xl font-black italic tracking-tighter uppercase flex flex-col items-center font-fix">
              <span className="text-white block">YOUR</span>
              <span className="text-orange-500 -mt-4 block">PHASE</span>
            </h1>
          </div>
        )}
      </div>

      {/* 3. 下部：アクションUI */}
      <div className={`p-10 w-full flex items-end justify-between transition-all duration-700 ${lodClasses}`}>
        
        {/* 左側：タクティカルログ ＆ バフカード */}
        <div className="flex flex-col gap-6 items-start pointer-events-auto">
          {/* ✅ 修正：タクティカル・システムログ表示エリア（一行レイアウト） */}
          <div className="w-72 bg-slate-950/40 backdrop-blur-md border border-white/5 p-3 rounded-lg shadow-2xl overflow-hidden">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2 border-b border-orange-500/20 pb-1 font-fix">Tactical Feed</p>
            <div className="h-24 overflow-y-auto custom-scrollbar space-y-1 pr-2">
              {logs.map((log, i) => (
                <div key={i} className="flex items-baseline gap-2 animate-fadeIn leading-tight">
                  <span className="text-[8px] text-slate-500 font-mono shrink-0">[{log.time}]</span>
                  <span className="text-[10px] text-slate-200 font-fix flex-1">{log.text}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* アクティブバフカード */}
          <div className="flex items-end -space-x-8">
            {activeBuffs.map((buff, i) => (
              <div key={buff.id} style={{ zIndex: 10 + i }} className="group relative flex flex-col items-center justify-between p-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl w-24 h-32 transition-all duration-300 hover:-translate-y-4 hover:border-orange-500 shadow-xl overflow-hidden">
                <span className="material-symbols-outlined text-orange-400 text-xl">{buff.id % 2 === 0 ? 'fort' : 'restaurant'}</span>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-100 font-fix line-clamp-1">{buff.name}</p>
                  <p className="text-[7px] text-green-400 font-bold uppercase font-fix">{buff.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側：ターゲット ＆ アクションボタン */}
        <div className="flex flex-col items-end gap-4 pointer-events-auto">
          {targetInfo && (
            <div className="bg-orange-600/10 border-r-4 border-orange-600 px-4 py-2 flex flex-col items-end backdrop-blur-md animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-orange-500 tracking-widest uppercase font-fix">Targeting</span>
                <span className="text-[10px] font-mono text-white bg-orange-600 px-1.5 py-0.5 rounded-sm font-bold">{targetInfo.fullCode}</span>
              </div>
              <div className="text-sm font-black text-white italic font-fix tracking-tight">{targetInfo.islandName}</div>
            </div>
          )}

          <div className={`flex gap-5 items-end transition-all duration-500 ${isMyTurn && !isSubmitted ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
            <button onClick={handleAttack} disabled={!canAttack} className={`relative overflow-hidden w-40 h-20 rounded-lg font-black italic tracking-tighter transition-all active:scale-95 flex flex-col items-center justify-center gap-1 text-xl ${canAttack ? 'bg-orange-600 text-white shadow-[0_0_30px_rgba(234,88,12,0.4)]' : 'bg-slate-900/80 text-slate-600 border border-slate-800'}`}>
              <span className="material-symbols-outlined text-2xl">swords</span>
              <span className="font-fix uppercase">Attack ({finalAtk})</span>
              <div className="absolute -top-1 right-2 text-[7px] font-black text-cyan-400">5 AP</div>
            </button>

            <button onClick={stay} disabled={isSubmitted} className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 text-slate-100 rounded-lg font-bold hover:border-orange-500/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-36 h-20 text-lg shadow-lg">
              <span className="material-symbols-outlined text-green-400 text-xl">vitals</span>
              <span className="font-fix text-base">STAY (回復)</span>
              <span className="text-[7px] text-slate-500 uppercase tracking-widest font-fix">HP+20 / AP+30</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; border-radius: 10px; }
        @keyframes phase-bounce-zoom {
          0% { opacity: 0; transform: scale(0); filter: brightness(2); }
          15% { opacity: 1; transform: scale(1.1); filter: brightness(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); filter: brightness(2); }
        }
        .phase-animation-container { animation: phase-bounce-zoom 3.5s ease-in-out forwards; }
        .holographic-text { text-shadow: 0 0 10px rgba(249, 115, 22, 0.5); }
        .font-fix { line-height: 1; }
      `}</style>
    </div>
  );
});