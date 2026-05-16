import React, { useEffect, useState, useMemo, memo, useRef } from 'react';
import { useGameStore } from '../store';

type HUDProps = object;

type ExtendedBuff = {
  id: number;
  name: string;
  effect: string;
  value?: number;
  icon?: string;
};

const globalPhaseTracker = {
  lastTurn: -1,
  played: false
};

export const HUD: React.FC<HUDProps> = memo(() => {
  const logs = useGameStore(state => state.logs);
  const districts = useGameStore(state => state.districts);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const turn = useGameStore(state => state.turn);
  const ap = useGameStore(state => state.ap);
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

  const finalAtk = useMemo(() => {
    const buffValue = activeBuffs.reduce((acc, b) => acc + ((b as ExtendedBuff).value || 0), 0);
    return Math.floor((atk + buffValue) * blessing);
  }, [atk, blessing, activeBuffs]);

  const canAttack = useMemo(() => {
    return isMyTurn && !isSubmitted && ap >= 5 && selectedDistrictId !== null;
  }, [isMyTurn, isSubmitted, ap, selectedDistrictId]);

  const targetInfo = useMemo(() => {
    if (selectedDistrictId === null || typeof selectedDistrictId === 'undefined' || !lookupData?.districts) return null;
    const district = lookupData.districts.get(selectedDistrictId);
    if (!district) return null;
    const areaId = district.parentAreaId;
    const area = (typeof areaId === 'number') ? lookupData.areas?.get(areaId) : null;
    const islandId = area?.parentIslandId;
    const island = (typeof islandId === 'number') ? lookupData.islands?.get(islandId) : null;
    return {
      islandName: island?.name || area?.name || "UNKNOWN SECTOR",
      unit: selectedDistrictId,
      fullCode: district.name 
    };
  }, [selectedDistrictId, lookupData]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (globalPhaseTracker.lastTurn !== turn) {
      globalPhaseTracker.lastTurn = turn;
      globalPhaseTracker.played = false;
    }
    if (isMyTurn && !isSubmitted && turn > 0 && !globalPhaseTracker.played) {
      globalPhaseTracker.played = true; 
      if (isPhaseAnimationEnabled) {
        const startTimer = setTimeout(() => setShowPhase(true), 50);
        const endTimer = setTimeout(() => setShowPhase(false), 3500);
        return () => {
          clearTimeout(startTimer);
          clearTimeout(endTimer);
        };
      }
    }
  }, [isMyTurn, isSubmitted, turn, isPhaseAnimationEnabled]);

  // 🚀 スプラトゥーン風ゲージのために「必ず2チーム」の配列としてマッピング
  const teamStats = useMemo(() => {
    const totalMapSize = lookupData?.districts?.size || 18; 
    const stats = (players || []).map(player => {
      const ownedCount = Object.values(districts).filter(ownerId => ownerId === player.id).length;
      return {
        id: player.id,
        name: player.playerName || player.username || 'Operator',
        color: player.color || '#0ea5e9', // 未設定ならデフォルトブルー
        percent: (ownedCount / totalMapSize) * 100
      };
    });
    // プレイヤーが足りない場合でもUIが崩れないようにダミーを補完
    return [
      stats[0] || { id: 't0', name: 'Alpha Squad', color: '#0ea5e9', percent: 0 },
      stats[1] || { id: 't1', name: 'Beta Squad', color: '#f97316', percent: 0 }
    ];
  }, [districts, players, lookupData]);

  const team0 = teamStats[0];
  const team1 = teamStats[1];
  const neutralPercent = Math.max(0, 100 - team0.percent - team1.percent);

  const lodClasses = isStrategicMode 
    ? "opacity-30 scale-95 hover:opacity-100 hover:scale-100 pointer-events-auto" 
    : "opacity-100 scale-100 pointer-events-auto";

  const handleAttack = () => {
    if (ap < 5) { setErrorMessage("INSUFFICIENT AP"); return; }
    if (typeof selectedDistrictId !== 'number') { setErrorMessage("TARGET NOT SELECTED"); return; }
    attack(selectedDistrictId);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono select-none flex flex-col transition-all duration-700">
      
      {/* 🦑 勢力分布：スプラトゥーン風 ナワバリバトルゲージ */}
      <div className={`pt-6 flex flex-col items-center gap-3 transition-all duration-700 ${lodClasses}`}>
        {/* タイトルバッジ */}
        <div className="flex items-center gap-2 mb-[-12px] z-10">
          <span className="px-5 py-1.5 bg-slate-950 border-2 border-slate-800 rounded-full text-[11px] font-black italic uppercase tracking-[0.3em] text-white shadow-[0_0_20px_rgba(0,0,0,0.8)] font-fix">
            TURF CONTROL
          </span>
        </div>

        {/* 極太ゲージ本体 */}
        <div className="relative w-[700px] h-14 bg-slate-950 rounded-2xl border-4 border-slate-950 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex p-1 gap-1">
          
          {/* 左側チーム (Team 0) */}
          <div 
            className="h-full relative transition-all duration-1000 ease-out flex items-center rounded-xl overflow-hidden" 
            style={{ width: `${team0.percent}%`, backgroundColor: team0.color }}
          >
            {/* 流れるインク風ストライプ */}
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(-45deg,transparent,transparent_15px,rgba(255,255,255,0.4)_15px,rgba(255,255,255,0.4)_30px)] animate-ink-flow" />
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]" />
            <span className="absolute left-4 text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] z-10 font-fix">
              {team0.percent.toFixed(1)}<span className="text-lg ml-0.5">%</span>
            </span>
          </div>

          {/* 未占領 (Neutral) */}
          <div 
            className="h-full relative transition-all duration-1000 ease-out flex items-center rounded-md overflow-hidden bg-slate-800" 
            style={{ width: `${neutralPercent}%` }}
          >
            {/* 未占領の網掛け */}
            <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,#000_6px,#000_12px)]" />
          </div>

          {/* 右側チーム (Team 1) */}
          <div 
            className="h-full relative transition-all duration-1000 ease-out flex items-center rounded-xl overflow-hidden" 
            style={{ width: `${team1.percent}%`, backgroundColor: team1.color }}
          >
            {/* 逆向きに流れるインク風ストライプ */}
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_15px,rgba(255,255,255,0.4)_15px,rgba(255,255,255,0.4)_30px)] animate-ink-flow-reverse" />
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]" />
            <span className="absolute right-4 text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] z-10 font-fix">
              {team1.percent.toFixed(1)}<span className="text-lg ml-0.5">%</span>
            </span>
          </div>

        </div>

        {/* プレイヤー名ラベル */}
        <div className="flex w-[680px] justify-between text-[11px] font-black uppercase tracking-[0.2em] font-fix mt-1">
          <div style={{ color: team0.color }} className="drop-shadow-md truncate max-w-[200px]">{team0.name}</div>
          <div className="text-slate-600">UNOCCUPIED</div>
          <div style={{ color: team1.color }} className="drop-shadow-md truncate max-w-[200px] text-right">{team1.name}</div>
        </div>
      </div>

      {/* 中央：YOUR TURN アニメーション */}
      <div className="flex-grow flex items-center justify-center">
        {showPhase && (
          <div className="phase-animation-container flex flex-col items-center relative p-16">
            <h1 className="holographic-text text-8xl md:text-9xl font-black italic tracking-tighter uppercase flex flex-col items-center font-fix text-center leading-none">
              <span className="text-white block">YOUR</span>
              <span className="text-orange-500 -mt-4 block">TURN</span>
            </h1>
          </div>
        )}
      </div>

      <div className={`p-10 w-full flex items-end justify-between transition-all duration-700 ${lodClasses}`}>
        {/* 左側：タクティカルログ ＆ バフ */}
        <div className="flex flex-col gap-6 items-start pointer-events-auto">
          <div className="w-72 bg-slate-950/40 backdrop-blur-md border border-white/5 p-3 rounded-lg shadow-2xl overflow-hidden">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2 border-b border-orange-500/20 pb-1 font-fix text-left">Tactical Feed</p>
            <div className="h-24 overflow-y-auto custom-scrollbar space-y-1 pr-2 text-left">
              {logs.map((log, i) => (
                <div key={i} className="flex items-baseline gap-2 animate-fadeIn leading-tight text-left">
                  <span className="text-[8px] text-slate-500 font-mono shrink-0">[{log.time}]</span>
                  <span className="text-[10px] text-slate-200 font-fix flex-1 text-left">{log.text}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="flex items-end -space-x-8">
            {activeBuffs.map((buff, i) => (
              <div key={buff.id} style={{ zIndex: 10 + i }} className="group relative flex flex-col items-center justify-between p-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl w-24 h-32 transition-all duration-300 hover:-translate-y-4 hover:border-orange-500 shadow-xl overflow-hidden">
                <span className="material-symbols-outlined text-orange-400 text-xl">{(buff as ExtendedBuff).icon || 'star'}</span>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-100 font-fix line-clamp-1">{buff.name}</p>
                  <p className="text-[7px] text-green-400 font-bold uppercase font-fix">{buff.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側：アクションパネル */}
        <div className="flex flex-col items-end gap-4 pointer-events-auto">
          <div className={`flex flex-col items-end transition-all duration-500 ${isMyTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-[11px] font-black text-orange-500 uppercase tracking-[0.2em] font-fix">Your Neural Turn</span>
            </div>
            {targetInfo && (
              <div className="bg-orange-600/10 border-r-4 border-orange-600 px-4 py-2 flex flex-col items-end backdrop-blur-md animate-fadeIn">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[9px] font-black text-orange-500 tracking-widest uppercase font-fix">Targeting</span>
                  <span className="text-[10px] font-mono text-white bg-orange-600 px-1.5 py-0.5 rounded-sm font-bold">{targetInfo.fullCode}</span>
                </div>
                <div className="text-sm font-black text-white italic font-fix tracking-tight text-right">{targetInfo.islandName}</div>
              </div>
            )}
          </div>

          <div className={`flex gap-5 items-end transition-all duration-500 ${isMyTurn && !isSubmitted ? 'opacity-100' : 'opacity-30'}`}>
            <button onClick={handleAttack} disabled={!canAttack} className={`relative overflow-hidden w-40 h-20 rounded-lg font-black italic tracking-tighter transition-all active:scale-95 flex flex-col items-center justify-center gap-1 text-xl ${canAttack ? 'bg-orange-600 text-white shadow-[0_0_30px_rgba(234,88,12,0.4)]' : 'bg-slate-900/80 text-slate-600 border border-slate-800'}`}>
              <span className="material-symbols-outlined text-2xl">swords</span>
              <span className="font-fix uppercase text-base">Attack ({finalAtk})</span>
              <div className="absolute top-1 right-2 text-[7px] font-black text-cyan-400">5 AP</div>
            </button>

            <button onClick={stay} disabled={!isMyTurn || isSubmitted} className={`bg-slate-900/90 backdrop-blur-xl border border-slate-700 text-slate-100 rounded-lg font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-36 h-20 text-lg shadow-lg`}>
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
          0% { opacity: 0; transform: scale(0.4); filter: brightness(2); }
          15% { opacity: 1; transform: scale(1.1); filter: brightness(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.4); filter: brightness(2); }
        }
        .phase-animation-container { animation: phase-bounce-zoom 3.5s ease-in-out forwards; }
        .holographic-text { text-shadow: 0 0 15px rgba(249, 115, 22, 0.6); }
        .font-fix { line-height: 1; }
        
        /* 🦑 スプラトゥーン風 ゲージアニメーション */
        @keyframes ink-flow {
          from { background-position: 0% 0%; }
          to { background-position: 60px 0%; }
        }
        @keyframes ink-flow-reverse {
          from { background-position: 60px 0%; }
          to { background-position: 0% 0%; }
        }
        .animate-ink-flow {
          animation: ink-flow 4s linear infinite;
          background-size: 60px 100%;
        }
        .animate-ink-flow-reverse {
          animation: ink-flow-reverse 4s linear infinite;
          background-size: 60px 100%;
        }
      `}</style>
    </div>
  );
});

export default HUD;