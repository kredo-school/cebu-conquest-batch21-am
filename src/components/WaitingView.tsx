// src/components/WaitingView.tsx

import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useGameStore, Player, LobbyPlayer } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

interface ExtendedPlayer extends Player {
  ready?: boolean;
}

const GOD_TRAITS: Record<number, { name: string; img: string; icon: string }> = {
  1: { name: "Neil",       img: "/assets/images/gods/Neil.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=1" },
  2: { name: "Garry",      img: "/assets/images/gods/Garry.png",      icon: "https://api.dicebear.com/7.x/identicon/svg?seed=2" },
  3: { name: "Shem",       img: "/assets/images/gods/Shem.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=3" },
  4: { name: "Quisie",     img: "/assets/images/gods/Quesie.png",     icon: "https://api.dicebear.com/7.x/identicon/svg?seed=4" },
  5: { name: "Eduardo",    img: "/assets/images/gods/Eduardo.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=5" },
  6: { name: "Kurt",       img: "/assets/images/gods/Kurt.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=6" },
  7: { name: "Stephen",    img: "/assets/images/gods/Stephen.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=7" },
  8: { name: "Bernardine", img: "/assets/images/gods/Bernardine.png", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=8" },
};

/**
 * 🚀 PlayerCard: ダサいアバターを廃止し、未選択時はタクティカルなプレースホルダーを表示
 */
const PlayerCard = memo(({ player, isMe, isHost }: { player: ExtendedPlayer; isMe: boolean; isHost: boolean }) => {
  const godId = player.selectedGodId || player.godId;
  const god = godId ? GOD_TRAITS[godId] : null;
  const isPlayerReady = player.isReady === true || player.ready === true;

  return (
    <div className={`glass-panel p-4 rounded-xl border-l-4 flex flex-col gap-3 group hover:bg-slate-900/80 transition-all h-[240px] w-full shrink-0 ${
      isPlayerReady ? 'border-l-[#fa7000]' : 'border-l-slate-700 opacity-90'
    }`}>
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-950">
        
        {/* 💡 修正箇所：神が選択されている場合はその画像を、無い場合はタクティカルなシルエットを表示 */}
        {god ? (
          <img 
            className={`w-full h-full object-cover object-top transition-all duration-500 ${isPlayerReady ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} 
            src={god.img} 
            alt="God Avatar" 
            onError={(e) => { (e.target as HTMLImageElement).src = '/assets/images/gods/fallback.png'; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-700 opacity-70">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-1">person_search</span>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Unassigned</span>
          </div>
        )}

        {isHost && <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#fa7000] text-[9px] font-bold text-black rounded leading-none">HOST</div>}
        {isMe && <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-900 text-[9px] font-bold text-[#fa7000] rounded border border-[#fa7000]/30 leading-none">YOU</div>}
      </div>

      <div className="flex justify-between items-center shrink-0">
        <span className="font-bold text-white uppercase text-sm truncate max-w-[120px]">{player.username || player.playerName || "UNKNOWN"}</span>
        {isPlayerReady ? (
          <span className="material-symbols-outlined text-[#fa7000] text-lg" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
        ) : (
          <span className="material-symbols-outlined text-slate-600 text-lg">radio_button_unchecked</span>
        )}
      </div>

      <div className="relative god-area mt-auto pt-2 border-t border-slate-800 shrink-0 text-left">
        <div className="flex items-center gap-3">
          {god ? (
            <img className="w-8 h-8 rounded-full border border-[#fa7000]/50 object-cover" src={god.icon} alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-slate-700 bg-black flex items-center justify-center text-[10px] text-slate-600">?</div>
          )}
          <div className="leading-tight">
            <p className="text-[8px] text-[#fa7000]/70 font-bold uppercase tracking-widest mb-0.5">Guardian God</p>
            <p className="text-[11px] font-black text-white uppercase">{god ? god.name : "Awaiting..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

interface WaitingViewProps {
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void;
  onAbort: () => void;
}

export const WaitingView: React.FC<WaitingViewProps> = ({ 
  onStart, onOpenSettings, onOpenHelp, onOpenRanking, onAbort 
}) => {
  const { players, lobbyPlayers, myId, chatLogs, roomId, playerName, maxPlayers } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    // 💡 修正箇所：ZustandのplayerNameが空の場合に備え、players配列から確実に名前を取得する
    const me = players.find(p => p.id === myId);
    const senderName = me?.username || me?.playerName || playerName || localStorage.getItem('cebu_player_name') || 'Operator';
    
    socket.emit(CLIENT_EVENTS.SEND_CHAT, { roomId, message: chatInput, sender: senderName });
    setChatInput('');
  };

  const handleReadyClick = () => {
    setIsLocked(true);
    socket.emit(CLIENT_EVENTS.READY_TO_START); 
    try { SoundManager.playSe('click'); } catch {}
  };

  const totalSlots = maxPlayers || 2;
  
  const activeLobby = useMemo(() => {
    const base = (lobbyPlayers.length > 0 ? lobbyPlayers : players) as ExtendedPlayer[];
    return base.map(p => ({
      playerId: p.id,
      username: p.username,
      playerName: p.playerName || p.username,
      godId: p.selectedGodId || p.godId || null,
      isReady: p.isReady === true || p.ready === true, 
    } as LobbyPlayer));
  }, [lobbyPlayers, players]);

  const readyCount = useMemo(() => activeLobby.filter(p => p.isReady === true).length, [activeLobby]);

  useEffect(() => {
    const isRoomFull = activeLobby.length > 0 && activeLobby.length === totalSlots;
    const allReady = activeLobby.length > 0 && activeLobby.every((p) => p.isReady);

    if (isRoomFull && allReady) {
      onStart();
    }
  }, [activeLobby, totalSlots, onStart]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  return (
    <div className="font-body antialiased overflow-hidden h-screen flex flex-col bg-[#020617] text-[#f8fafc] relative">
      <style>{`
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(250, 112, 0, 0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} onAbort={onAbort} />

      <main className="flex-1 mt-16 flex flex-col relative overflow-hidden min-h-0">
        
        <section className="flex-1 flex flex-col py-6 px-8 z-10 max-w-7xl mx-auto w-full min-h-0 justify-between">
          
          <div className="flex justify-between items-end mb-4 shrink-0 text-left">
            <div>
              <h1 className="text-4xl font-black text-white mb-1.5 tracking-tighter italic">WAITING...</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fa7000] animate-pulse"></div>
                <p className="text-[#fa7000] font-bold uppercase tracking-widest text-sm">Waiting for players to ready up</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Room Capacity</p>
              <p className="text-3xl font-black text-white">{readyCount} <span className="text-[#fa7000]">/ {totalSlots}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 shrink-0">
            {Array.from({ length: totalSlots }).map((_, index) => {
              const lp = activeLobby[index];
              if (lp) {
                const playerData: ExtendedPlayer = players.find(p => p.id === lp.playerId) || {
                  id: lp.playerId,
                  username: lp.username || 'Unknown',
                  playerName: lp.playerName || lp.username || 'Unknown',
                  selectedGodId: lp.godId,
                  godId: lp.godId,
                  isReady: lp.isReady,
                };
                return <PlayerCard key={lp.playerId} player={playerData} isMe={lp.playerId === myId} isHost={index === 0} />;
              } else {
                return (
                  <div key={`empty-${index}`} className="glass-panel rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 h-52 w-full opacity-40">
                    <span className="material-symbols-outlined text-4xl text-slate-600">add</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">WAITING...</span>
                  </div>
                );
              }
            })}
          </div>

          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 text-left h-60 pb-2">
            
            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col h-full border-slate-800 shadow-2xl">
              <div className="flex-1 p-4 space-y-3 overflow-y-auto text-sm custom-scrollbar text-left font-mono">
                {chatLogs?.length === 0 ? (
                  <div className="flex gap-2">
                    <span className="text-[#fa7000] font-bold">System:</span>
                    <span className="text-slate-300">Tactical link established. Encryption active.</span>
                  </div>
                ) : (
                  chatLogs.map((log, i) => (
                    <div key={i} className="flex gap-2 leading-tight">
                      <span className={`${log.sender === (playerName || localStorage.getItem('cebu_player_name')) ? 'text-cyan-400' : 'text-[#fa7000]'} font-bold shrink-0`}>{log.sender}:</span>
                      <span className="text-slate-300 break-words">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-4 bg-slate-950/50 border-t border-slate-800 shrink-0">
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-4 pr-10 text-sm focus:ring-[#fa7000] focus:border-[#fa7000] text-slate-200 outline-none" 
                    placeholder="Transmit tactical data..." 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#fa7000] hover:text-orange-400 transition-colors">
                    <span className="material-symbols-outlined text-xl">send</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between h-full">
              <div className="glass-panel rounded-xl overflow-hidden flex flex-col border-slate-800 shadow-2xl">
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Location</p>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight mt-1 leading-none">Around Cebu</h3>
                    </div>
                  </div>
                  <div className="h-28 w-full rounded-lg overflow-hidden relative border border-slate-800 bg-slate-950">
                    <img alt="Map" className="w-full h-full object-cover grayscale brightness-75 opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBirgWsIn47L0BozujaAOP9MPDSEj8eEqOD5ehGypotryAQyqA3LP7lycOy2aqSikaVPBmPBSUc0dM925SZitvjIXt5w4Af_Rg1AhwYS6kF2STerNUC5_iMPz_J3UbNW9cwmiLBMcMg3Y8VEL-erCj5K55O7sQ9mtBGNeWpbh7MWURfLi2TPY5VBElxvM4f7A7fHG7C_6MiywcCoGzxjY-ONOK9E5GLIhM0PTnlqbdpTXWiXxFZEvg4SVjeivIEAixwp29-eA3k9r8" />
                    <div className="absolute inset-0 bg-[#fa7000]/10 mix-blend-overlay"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                      <span className="material-symbols-outlined text-5xl">grid_4x4</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleReadyClick}
                disabled={activeLobby.length < totalSlots || isLocked}
                className={`w-full py-3.5 rounded-xl font-black text-xl uppercase transition-all transform active:scale-95 shadow-lg shrink-0 ${
                  isLocked 
                    ? 'bg-slate-800 text-[#fa7000] border-2 border-[#fa7000] animate-pulse' 
                    : activeLobby.length >= totalSlots 
                      ? 'bg-[#fa7000] hover:bg-orange-600 text-black shadow-[0_0_20px_rgba(250,112,0,0.3)]' 
                      : 'bg-[#fa7000] text-black cursor-not-allowed opacity-80'
                }`}
              >
                {isLocked ? 'LINK LOCKED' : 'READY?'}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-2 px-8 flex justify-between items-center bg-slate-950 border-t border-slate-800 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-orange-600 text-[9px] font-bold uppercase tracking-widest">Cebu Conquest Tactical Systems</span>
          <div className="h-2.5 w-[1px] bg-slate-800"></div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">© 2026 Batch21-AM Deployment Authority</p>
        </div>
      </footer>
    </div>
  );
};