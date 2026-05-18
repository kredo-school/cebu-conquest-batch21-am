/// <reference types="vite/client" />
import React, { useEffect, useState, useMemo, memo, useRef } from 'react';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager'; // 🚀 SE再生用にインポートを追加

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
  const isSubmitted = useGameStore(state => state.isSubmitted);
  const activeBuffs = useGameStore(state => state.activeBuffs);
  const players = useGameStore(state => state.players);
  const stay = useGameStore(state => state.stay);
  const endTurn = useGameStore(state => state.endTurn); // 🚀 ターンエンド処理を取得
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const lookupData = useGameStore(state => state.lookupData);
  const zoomLevel = useGameStore(state => state.zoomLevel);

  const logEndRef = useRef<HTMLDivElement>(null);

  const isStrategicMode = useMemo(() => zoomLevel < 0.75, [zoomLevel]);
  const isPhaseAnimationEnabled = useMemo(() => zoomLevel >= 0.6, [zoomLevel]);
  const [showPhase, setShowPhase] = useState(false);

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

  // 🚀 占領済み領地のみを100%として算出する高エネルギーせめぎ合いロジック
  const teamStats = useMemo(() => {
    const totalOccupied = Object.values(districts).filter(ownerId => ownerId && ownerId !== '').length;

    const stats = (players || []).map((player, index) => {
      const ownedCount = Object.values(districts).filter(ownerId => ownerId === player.id).length;
      const defaultColor = index === 0 ? '#0ea5e9' : '#ea580c'; 
      
      const percent = totalOccupied > 0 ? (ownedCount / totalOccupied) * 100 : 0;
      
      return {
        id: player.id,
        name: player.playerName || player.username || 'Operator',
        color: player.color || defaultColor, 
        percent: percent
      };
    });
    
    return [
      stats[0] || { id: 't0', name: 'Alpha Squad', color: '#0ea5e9', percent: 0 },
      stats[1] || { id: 't1', name: 'Beta Squad', color: '#ea580c', percent: 0 }
    ];
  }, [districts, players]);

  const team0 = teamStats[0];
  const team1 = teamStats[1];

  const lodClasses = isStrategicMode 
    ? "opacity-30 scale-95 hover:opacity-100 hover:scale-100 pointer-events-auto" 
    : "opacity-100 scale-100 pointer-events-auto";

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono select-none flex flex-col transition-all duration-700">
      
      {/* 📊 勢力分布：次世代ナワバリ・タクティカルゲージ */}
      <div className={`pt-6 flex flex-col items-center gap-3 transition-all duration-700 ${lodClasses}`}>
        {/* タイトルバッジ */}
        <div className="flex items-center gap-2 mb-[-12px] z-10">
          <span className="px-5 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-[10px] font-black italic uppercase tracking-[0.3em] text-slate-400 shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-fix">
            TURF INFLULINE
          </span>
        </div>

        {/* 洗練された極太シームレスゲージ本体 */}
        <div 
          className="relative w-[650px] h-11 bg-slate-900 rounded-full border-2 border-slate-950 overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.7)] flex"
          style={{ backgroundColor: team1.percent > 0 ? team1.color : '#1e293b' }}
        >
          {/* 右側チーム (Team 1) の背景ストライプ演出 */}
          {team1.percent > 0 && (
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,transparent,transparent_12px,rgba(255,255,255,0.3)_12px,rgba(255,255,255,0.3)_24px)] animate-ink-flow-reverse" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              {/* 2P パーセンテージ表示 */}
              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-baseline z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                <span className="text-xl font-black italic tracking-tighter text-white font-fix">
                  {team1.percent.toFixed(1)}
                </span>
                <span className="text-xs font-black italic text-white ml-0.5 opacity-80 font-fix">
                  %
                </span>
              </div>
            </div>
          )}

          {/* 左側チーム (Team 0) ：上に重ねて右端を斜めにカット */}
          <div 
            className="h-full relative transition-all duration-1000 ease-out z-10" 
            style={{ 
              width: `${team0.percent}%`, 
              backgroundColor: team0.color,
              clipPath: 'polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0 100%)' 
            }}
          >
            <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(-45deg,transparent,transparent_12px,rgba(255,255,255,0.3)_12px,rgba(255,255,255,0.4)_24px)] animate-ink-flow" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
            
            {/* 1P パーセンテージ表示 */}
            {team0.percent > 0 && (
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-baseline z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                <span className="text-xl font-black italic tracking-tighter text-white font-fix">
                  {team0.percent.toFixed(1)}
                </span>
                <span className="text-xs font-black italic text-white ml-0.5 opacity-80 font-fix">
                  %
                </span>
              </div>
            )}
          </div>

          {/* 衝突点：雷状のパルス発光エフェクトライン */}
          {team0.percent > 0 && team0.percent < 100 && (
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white z-20 shadow-[0_0_15px_#fff,0_0_30px_rgba(255,255,255,0.8)] transition-all duration-1000 ease-out skew-x-[-18deg] animate-pulse"
              style={{ left: `calc(${team0.percent}% - 7px)` }}
            />
          )}

          {/* 全体のインナーシャドウ効果 */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)] z-30 rounded-full" />
        </div>
      </div>

      <div className="flex-grow pointer-events-none" />

      {/* 🚀 中央：YOUR PHASE ホログラフィック・グリッチアニメーション */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
        {showPhase && (
          <div className="phase-animation-container">
            <div className="phase-container flex flex-col items-center">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/50"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-500/50"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-500/50"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/50"></div>
              
              <div className="flex items-center gap-4 mb-2">
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-orange-500"></div>
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.5em] holographic-text" data-text="TACTICAL ENGAGEMENT">
                  TACTICAL ENGAGEMENT
                </span>
                <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-orange-500"></div>
              </div>
              
              <h1 className="holographic-text text-[140px] md:text-[200px] font-black italic tracking-tighter uppercase flex flex-col items-center leading-none" data-text="YOUR PHASE">
                <span className="text-white">YOUR</span>
                <span className="text-orange-500 -mt-8 md:-mt-12">PHASE</span>
              </h1>
              
              <div className="mt-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400 text-sm animate-pulse">radar</span>
                <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Awaiting Command Input...</span>
              </div>
            </div>
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

        {/* 右側：アクションパネル統合エリア */}
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

          <div className={`flex gap-5 items-end transition-all duration-500 ${isMyTurn ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            
            {/* 🚀 修正ポイント: 暗いサイバーブルー(bg-blue-950)のせいでグレーアウトに誤認されていた配色を完全リプレイス。
                活性時はハッキリ目立つ高輝度ブルー(bg-blue-600/90)と鮮明な白文字(text-white)で点点灯させます */}
            <button
              onClick={() => {
                try { SoundManager.playSe("click"); } catch {}
                endTurn();
              }}
              disabled={!isMyTurn}
              className={`relative overflow-hidden w-40 h-20 rounded-lg font-black italic tracking-tighter transition-all active:scale-95 flex flex-col items-center justify-center gap-1 text-xl
                ${(!isMyTurn)
                  ? 'bg-slate-900/80 text-slate-600 border border-slate-800'
                  : 'bg-blue-600/90 border-2 border-blue-400 text-white hover:bg-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.5)]'
                }`}
            >
              <span className={`material-symbols-outlined text-xl ${!isMyTurn ? 'text-slate-600' : 'text-blue-200'}`}>logout</span>
              <span className="font-fix text-base">TURN END</span>
            </button>

            <button onClick={stay} disabled={!isMyTurn} className={`bg-slate-900/90 backdrop-blur-xl border border-slate-700 text-slate-100 rounded-lg font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-1 w-36 h-20 text-lg shadow-lg`}>
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
        .font-fix { line-height: 1; }
        
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

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes holographic-flicker {
          0% { opacity: 0.85; transform: scaleY(1); }
          5% { opacity: 0.9; transform: scaleY(1.005); }
          10% { opacity: 0.85; transform: scaleY(1); }
          15% { opacity: 1; transform: scaleY(1); }
          20% { opacity: 0.9; transform: scaleY(1.01); }
          25% { opacity: 0.85; transform: scaleY(1); }
          100% { opacity: 0.85; transform: scaleY(1); }
        }
        @keyframes glitch-slice {
          0% { clip-path: inset(10% 0 30% 0); transform: translateX(-2px); }
          2% { clip-path: inset(50% 0 10% 0); transform: translateX(2px); }
          4% { clip-path: inset(0% 0 80% 0); transform: translateX(-1px); }
          6% { clip-path: none; transform: translateX(0); }
          100% { clip-path: none; transform: translateX(0); }
        }
        @keyframes phase-bounce-zoom {
          0% { opacity: 0; transform: scale(0); filter: brightness(2); }
          15% { opacity: 1; transform: scale(1.2); filter: brightness(1.5); }
          20% { transform: scale(0.95); }
          25% { transform: scale(1); filter: brightness(1); }
          35% { text-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 40px rgba(249, 115, 22, 0.4); }
          45% { text-shadow: 0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3); }
          55% { text-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 40px rgba(249, 115, 22, 0.4); }
          65% { text-shadow: 0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3); }
          75% { text-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 40px rgba(249, 115, 22, 0.4); }
          85% { opacity: 1; transform: scale(1); filter: brightness(1); }
          95% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(0); filter: brightness(3); }
        }

        .holographic-text {
          text-shadow: 
            0 0 10px rgba(249, 115, 22, 0.5),
            0 0 20px rgba(249, 115, 22, 0.3),
            0 0 40px rgba(255, 255, 255, 0.2);
          animation: holographic-flicker 4s infinite linear;
          position: relative;
        }
        .holographic-text::before {
          content: attr(data-text);
          position: absolute;
          left: 0; top: 0; width: 100%; height: 100%;
          color: #fb923c;
          opacity: 0.5;
          z-index: -1;
          animation: glitch-slice 8s infinite linear;
        }

        .phase-animation-container {
          animation: phase-bounce-zoom 3.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .phase-container {
          position: relative;
          padding: 2rem 4rem;
        }
        .phase-container::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(transparent, rgba(249, 115, 22, 0.05), transparent);
          animation: scanline 3s linear infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
});

export default HUD;