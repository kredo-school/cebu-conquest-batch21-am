import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';

// 🚀 プロップスの定義
interface HUDProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void; // 🚀 1. ヘルプ用のプロップスを追加
}

export const HUD: React.FC<HUDProps> = ({ onOpenSettings, onOpenHelp }) => {
  const { 
    currentDistrictName, districts, isMyTurn, 
    myId, myTeam, turn, isSubmitted, activeBuffs,
    players 
  } = useGameStore();

  const [showPhase, setShowPhase] = useState(false);

  // 🚀 自分のターン開始時の演出
  useEffect(() => {
    if (isMyTurn && !isSubmitted && turn > 0) {
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
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center font-body">
      
      {/* 🚀 TOP HUD ROW */}
      <div className="w-full flex justify-between items-start px-6 py-4">
        
        {/* 左：SECTOR & BUFFS */}
        <div className="flex flex-col gap-3 pointer-events-auto text-left">
          <div className="glass-panel px-6 py-2 rounded-br-2xl border-l-4 border-brand-500 shadow-lg" style={{ clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0 100%)' }}>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Current Sector</div>
            <div className="text-sm font-black text-white italic tracking-tighter uppercase">
              {currentDistrictName || "DEPLOYMENT PENDING"}
            </div>
          </div>

          <div className="flex gap-2">
            {(activeBuffs || []).map((buff) => (
              <div key={buff.id} className="glass-panel px-3 py-1.5 border-l-2 border-brand-500 flex flex-col animate-fadeIn text-left">
                <div className="text-[8px] font-black text-brand-500 uppercase">Specialty</div>
                <div className="text-[10px] font-bold text-white leading-none mb-1">{buff.name}</div>
                <div className="text-[8px] font-bold text-green-400 uppercase tracking-tighter">{buff.effect}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 中央：勢力バー */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="flex h-10 w-[480px] bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
            {teamStats.map((team) => (
              <div 
                key={team.id}
                className="h-full flex items-center justify-center relative transition-all duration-1000 border-r border-white/5 last:border-r-0"
                style={{ 
                  width: `${team.percent}%`, 
                  background: `linear-gradient(180deg, ${team.color}66 0%, ${team.color}33 100%)` 
                }}
              >
                <span className="text-[10px] font-black text-white italic truncate px-2">
                  {team.percent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 右：COMMANDER INFO & SETTINGS */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex gap-4 px-2 mb-1">
            {/* 🚀 2. ヘルプボタンを追加（青い光の演出） */}
            <button 
              onClick={onOpenHelp}
              className="pointer-events-auto flex items-center justify-center hover:scale-125 active:scale-90 transition-all duration-200 group cursor-pointer"
              title="TACTICAL MANUAL"
            >
              <span className="material-symbols-outlined text-cyan-400 text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] group-hover:animate-pulse">
                help
              </span>
            </button>

            {/* 設定ボタン */}
            <button 
              onClick={onOpenSettings}
              className="pointer-events-auto flex items-center justify-center hover:scale-125 active:scale-90 transition-all duration-200 group cursor-pointer"
              title="SETTINGS"
            >
              <span className="material-symbols-outlined text-primary text-2xl drop-shadow-[0_0_8px_rgba(250,112,0,0.5)] group-hover:rotate-90 transition-transform duration-500">
                settings
              </span>
            </button>

            <button className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 opacity-80 hover:opacity-100 cursor-pointer">
              <span className="material-symbols-outlined text-slate-300 text-2xl">
                person
              </span>
            </button>
          </div>

          <div className={`glass-panel px-6 py-2 rounded-bl-2xl border-r-4 shadow-lg
            ${myTeam === 'red' ? 'border-red-500' : 'border-cyan-500'}`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 100%)' }}>
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Commander ID</div>
            <div className="text-xs font-black text-white italic uppercase tracking-tighter">
              {myId ? myId.substring(0, 8) : "OFFLINE-PROTO"}
            </div>
          </div>
        </div>
      </div>

      {/* YOUR PHASE 演出 */}
      {showPhase && (
        <div className="flex-grow flex items-center justify-center">
          <div className="phase-animation-container">
            <div className="relative flex flex-col items-center px-16 py-8">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-brand-500/50"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-brand-500/50"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-brand-500/50"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-brand-500/50"></div>
              <h1 className="holographic-text text-8xl font-black italic tracking-tighter uppercase flex flex-col items-center">
                <span className="text-white leading-none">YOUR</span>
                <span className="text-brand-500 -mt-4 leading-none">PHASE</span>
              </h1>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};