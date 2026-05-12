// src/components/GodSelectionView.tsx

import React, { useState, memo, useMemo } from 'react';
import { useGameStore, LobbyPlayer } from '../store';
import { REACT_TO_PHASER } from '../game/events/PhaserBridge';
import socket from '../socket';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';
import { GOD_SACRED_LANDS } from '../../shared/godSacredLands.js';

interface GodSelectionViewProps {
  onComplete: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onBack: () => void;
}

interface GodSlot {
  id: number;
  textureKey: string;
  name: string;
  role: string;
  bonus: string;
  img: string;
  desc: string;
}

// 修正: shared/godSacredLands.js の実態に合わせたインターフェース定義
interface GodSacredLand {
  name: string;
  sacredDistrictId: number; // districtId ではなくこちら
  spawnSpotId: number;     // spotId ではなくこちら
}

const GOD_SLOTS: GodSlot[] = [
  { id: 1, textureKey: 'god-neil',   name: "Neil", role: "WAR",        bonus: "MAX_HP +30, STAMINA -25, HP +10", img: "/assets/images/gods/Neil.png", desc: "高い耐久力を誇る戦士向けのステータス補正。" },
  { id: 2, textureKey: 'god-garry',  name: "Garry", role: "STRATEGIST", bonus: "ATK +20",    img: "/assets/images/gods/Garry.png", desc: "攻撃性能を純粋に強化するアタッカー仕様。" },
  { id: 3, textureKey: 'god-shem',   name: "Shem", role: "BURN",       bonus: "MAX_AP +15, HP +10, AP +10", img: "/assets/images/gods/Shem.png", desc: "行動回数と継戦能力のバランスを重視。" },
  { id: 4, textureKey: 'god-quisie', name: "Quisie", role: "STEALTH",    bonus: "HP -20, FAITH 100", img: "/assets/images/gods/Quisie.png", desc: "FAITHが初回から100でスタートする特殊構成。" },
  { id: 5, textureKey: 'god-eduardo', name: "Eduardo", role: "HEAVY",      bonus: "DEF +15",    img: "/assets/images/gods/Eduardo.png", desc: "防御力を高め、敵の反撃ダメージを抑える構成。" },
  { id: 6, textureKey: 'god-kurt',   name: "Kurt", role: "SUPPORT",    bonus: "STAMINA +30, HP -10", img: "/assets/images/gods/Kurt.png", desc: "スタミナ上限を大きく伸ばし、機動力を確保。" },
  { id: 7, textureKey: 'god-stephen', name: "Stephen", role: "SHADOW",     bonus: "FAITH_REGEN (5)", img: "/assets/images/gods/Stephen.png", desc: "毎ターン信仰心が5回復する、長期戦特化型。" },
  { id: 8, textureKey: 'god-bernardine', name: "Bernardine", role: "RECON",      bonus: "MAX_AP +30, AP +30", img: "/assets/images/gods/Bernardine.png", desc: "圧倒的なリソース量を活かした立ち回りが可能。" },
];

export const GodSelectionView: React.FC<GodSelectionViewProps> = memo(({ 
  onComplete, 
  onBack 
}) => {
  const players = useGameStore(state => state.players);
  const lobbyPlayers = useGameStore(state => state.lobbyPlayers);
  const myId = useGameStore(state => state.myId);
  const selectedGodId = useGameStore(state => state.selectedGodId);
  const maxPlayers = useGameStore(state => state.maxPlayers);
  const errorMessage = useGameStore(state => state.errorMessage);
  const hideError = useGameStore(state => state.hideError);
  
  const [pendingSelection, setPendingSelection] = useState<GodSlot | null>(() => {
    if (!selectedGodId) return null;
    return GOD_SLOTS.find(g => g.id === selectedGodId) || null;
  });

  const readyInfo = useMemo(() => {
    return {
      total: maxPlayers || 2,
      ready: players.filter(p => p.selectedGodId || p.godId).length
    };
  }, [players, maxPlayers]);

  const getLockInfo = (godId: number) => {
    const lobbySelector = lobbyPlayers.find(
      (p: LobbyPlayer) => p.playerId !== myId && Number(p.godId) === godId
    );
    if (lobbySelector) return { name: lobbySelector.playerName || lobbySelector.username || "Operator" };

    const selector = players.find(
      p => p.id !== myId && (Number(p.selectedGodId) === godId || Number(p.godId) === godId)
    );
    if (selector) return { name: selector.playerName || selector.username || "Operator" };
    return null;
  };

  const handleFinalSelect = () => {
    if (!pendingSelection) return;
    if (getLockInfo(pendingSelection.id)) return;
    if (selectedGodId !== null) return; 

    hideError();
    const godId = pendingSelection.id;
    
    // 修正ポイント: キャストとプロンプト上の変数名を一致させる[cite: 1]
    const masterData = GOD_SACRED_LANDS as Record<number, GodSacredLand>;
    const godData = masterData[godId];

    if (!godData) {
      console.error(`God ID ${godId} not found in master data.`);
      return;
    }

    const targetDistrictId = godData.sacredDistrictId;
    const targetSpotId = godData.spawnSpotId;

    const updatedPlayers = players.map(p => 
        p.id === myId ? { ...p, selectedGodId: godId, godId: godId } : p
    );

    useGameStore.setState({ 
      selectedGodId: godId,
      selectedDistrictId: targetDistrictId, 
      players: updatedPlayers,
      lobbyPlayers: useGameStore.getState().lobbyPlayers.map(lp =>
        lp.playerId === myId ? { ...lp, godId: godId } : lp
      ),
    });
    
    // Socket.IO への emit[cite: 1]
    socket.emit(CLIENT_EVENTS.SELECT_GOD, { 
      roomId: useGameStore.getState().roomId,
      playerName: useGameStore.getState().playerName,
      godId: godId, 
      districtId: targetDistrictId,
      spotId: targetSpotId
    });
    
    // Phaser への emit[cite: 1]
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.SET_AVATAR, { 
      detail: { 
        godKey: pendingSelection.textureKey,
        godId: godId 
      }
    }));
    
    onComplete(); 
  };

  return (
    <div className="absolute w-full h-full z-[10000] bg-slate-950 font-body text-slate-200 select-none flex items-center justify-center p-4 overflow-hidden text-left">
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]"></div>
      <div className="w-full max-w-[1400px] h-[95vh] flex flex-col bg-zinc-950/80 border border-white/10 rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fadeIn text-left">
        
        {errorMessage && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[11000] min-w-[400px] animate-bounce text-left">
            <div className="bg-red-600/90 border border-red-400 text-white px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-4 text-left">
              <span className="material-symbols-outlined text-xl">warning</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1 text-left">Signal Error</span>
                <span className="text-sm font-black font-fix text-left">{errorMessage}</span>
              </div>
              <button onClick={hideError} className="ml-auto hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="px-8 py-5 flex flex-col items-start gap-1 shrink-0 border-b border-white/5 text-left">
          <h1 className="text-2xl lg:text-3xl font-black italic tracking-tighter text-orange-500 uppercase font-fix animate-glitch-text text-left">
            Choose the god you believe in
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="w-2 h-2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-400 font-black font-fix text-left">
              Syncing Units: {readyInfo.ready} / {readyInfo.total} Ready for Deployment
            </span>
          </div>
        </div>

        <div className="flex-1 p-5 overflow-hidden">
          <div className="grid grid-cols-4 grid-rows-2 gap-4 h-full">
            {GOD_SLOTS.map((god) => {
              const lock = getLockInfo(god.id); 
              const isSelected = pendingSelection?.id === god.id;

              return (
                <div 
                  key={god.id} 
                  onClick={() => !lock && selectedGodId === null && setPendingSelection(god)} 
                  className={`group relative flex flex-col bg-zinc-900/40 border-2 transition-all duration-300 rounded-xl overflow-hidden ${
                    isSelected 
                      ? "border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.3)] scale-[1.02] z-10" 
                      : lock 
                        ? "border-transparent opacity-30 grayscale cursor-not-allowed" 
                        : selectedGodId !== null
                          ? "border-white/5 opacity-50 cursor-default"
                          : "border-white/5 hover:border-white/20 hover:bg-zinc-800/50 cursor-pointer"
                  }`}
                >
                  <div className="relative h-[45%] shrink-0 overflow-hidden bg-black flex items-center justify-center">
                    <img 
                      src={god.img} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={god.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/images/gods/fallback.png';
                      }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-orange-600/30 backdrop-blur-sm">
                        <div className="bg-orange-500 text-black text-[10px] font-black px-4 py-1 skew-x-[-15deg] border-r-4 border-black font-fix text-left">
                          LINK ESTABLISHED
                        </div>
                      </div>
                    )}
                    {lock && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                         <div className="w-10 h-10 rounded-full border-2 border-zinc-600 bg-zinc-800 mb-2 overflow-hidden flex items-center justify-center">
                            <span className="material-symbols-outlined text-zinc-500">person</span>
                         </div>
                         <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest border border-zinc-700 px-3 py-1 font-fix mb-1 bg-black/50 text-center">
                           Player Locked
                         </div>
                         <div className="text-[8px] text-orange-500 uppercase font-black font-fix animate-pulse text-center">
                           {lock.name}
                         </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 text-[8px] font-black text-cyan-400 border border-cyan-400/30 uppercase tracking-widest font-fix text-left">
                      {god.role}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-2 text-left justify-between">
                    <div>
                      <h3 className={`text-base lg:text-lg font-black tracking-tight font-fix italic ${lock ? 'text-zinc-600' : 'text-white'}`}>
                        {god.name}
                      </h3>
                      <div className="h-px w-8 bg-orange-500/50 my-1.5"></div>
                      <p className={`text-[10px] leading-snug line-clamp-3 font-fix ${lock ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        {god.desc}
                      </p>
                    </div>
                    <div className={`pt-2 flex items-center justify-between text-[9px] font-black font-fix ${lock ? 'text-zinc-700' : 'text-orange-500/80'}`}>
                       <span>BONUS: {god.bonus}</span>
                       <span className="material-symbols-outlined text-sm">bolt</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0 text-left">
          {selectedGodId === null ? (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-2.5 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all font-fix"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Abort Selection</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-6 py-2.5 text-cyan-500/40 text-[10px] font-black uppercase tracking-widest font-fix">
              <span className="material-symbols-outlined text-sm">lock</span>
              Neural Link Finalized
            </div>
          )}

          <div className={`flex flex-col items-end gap-2 transition-all duration-500 ${pendingSelection && !getLockInfo(pendingSelection.id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <p className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] font-black italic font-fix">
              Initialize synchronization with <span className="text-orange-500 underline underline-offset-4">'{pendingSelection?.name}'</span>?
            </p>
            <button 
              onClick={handleFinalSelect}
              disabled={selectedGodId !== null} 
              className={`group relative px-12 py-3 text-black text-[11px] font-black uppercase tracking-widest overflow-hidden transition-all font-fix text-left
                ${selectedGodId !== null 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.4)] active:scale-95'}`}
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-[-15deg]"></div>
              {selectedGodId !== null ? 'SYNC ESTABLISHED' : 'Confirm Neural Link'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(1.05); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes glitch-text {
          0% { text-shadow: 2px 0 #ff0000, -2px 0 #00ff00; }
          25% { text-shadow: -2px 0 #ff0000, 2px 0 #00ff00; }
          50% { text-shadow: 2px 2px #ff0000, -2px -2px #00ff00; }
          100% { text-shadow: none; }
        }
        .animate-glitch-text { animation: glitch-text 4s infinite linear alternate-reverse; }
        .font-fix { line-height: 1.2; }
      `}</style>
    </div>
  );
});

export default GodSelectionView;