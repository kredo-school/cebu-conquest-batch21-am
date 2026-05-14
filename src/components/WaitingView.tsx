/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useGameStore, Player, LobbyPlayer } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';
// 🚀 修正：useBGM は AudioController が担当するため不要
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CustomButton } from './common/CustomButton';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/socketEvents.js';

interface WaitingViewProps {
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void;
  onAbort: () => void;
}

interface ExtendedPlayer extends Player {
  ready?: boolean;
}

type UnifiedPlayer = {
  id?: string;
  playerId?: string;
  username?: string;
  playerName?: string;
  godId?: number | null;
  selectedGodId?: number | null;
  isReady?: boolean;
  ready?: boolean;
};

const GOD_TRAITS: Record<number, { name: string; img: string; icon: string }> = {
  1: { name: "Neil",       img: "/assets/images/gods/Neil.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=1" },
  2: { name: "Garry",      img: "/assets/images/gods/Garry.png",      icon: "https://api.dicebear.com/7.x/identicon/svg?seed=2" },
  3: { name: "Shem",       img: "/assets/images/gods/Shem.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=3" },
  4: { name: "Quisie",     img: "/assets/images/gods/Quisie.png",     icon: "https://api.dicebear.com/7.x/identicon/svg?seed=4" },
  5: { name: "Eduardo",    img: "/assets/images/gods/Eduardo.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=5" },
  6: { name: "Kurt",       img: "/assets/images/gods/Kurt.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=6" },
  7: { name: "Stephen",    img: "/assets/images/gods/Stephen.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=7" },
  8: { name: "Bernardine", img: "/assets/images/gods/Bernardine.png", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=8" },
};

const PlayerCard = memo(({ player, isMe, isHost, myAvatar }: { player: ExtendedPlayer; isMe: boolean; isHost: boolean; myAvatar: string | null }) => {
  const godId = player.selectedGodId || player.godId;
  const god = godId ? GOD_TRAITS[godId] : null;
  const isPlayerReady = player.isReady === true || player.ready === true;
  const avatarUrl = isMe ? myAvatar : null;

  return (
    <div className={`glass-panel p-4 rounded-xl border-l-4 flex flex-col gap-3 group transition-all duration-500 h-48 w-full shrink-0 ${
      isPlayerReady ? 'border-l-[#fa7000] bg-orange-950/10 shadow-[0_0_20px_rgba(250,112,0,0.1)]' : 'border-l-slate-800 bg-slate-900/40 opacity-90'
    }`}>
      <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center border border-white/5">
        {!god ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="w-full h-[2px] bg-[#fa7000]/20 absolute top-0 animate-scanline"></div>
            <span className="material-symbols-outlined text-3xl text-slate-700 mb-1 animate-pulse">fingerprint</span>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Syncing God...</p>
          </div>
        ) : (
          <img 
            className={`w-full h-full object-cover object-top transition-all duration-700 ${!isPlayerReady ? 'opacity-40 grayscale blur-[1px]' : 'opacity-100 grayscale-0 blur-0'}`} 
            src={god.img} 
            alt="God Portrait" 
            onError={(e) => { (e.target as HTMLImageElement).src = '/assets/images/gods/fallback.png'; }}
          />
        )}
        {isHost && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#fa7000] text-[7px] font-black text-black rounded uppercase shadow-lg z-10 font-fix">HOST</div>}
        {isMe && <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/90 text-[7px] font-black text-[#fa7000] rounded border border-[#fa7000]/30 uppercase z-10 font-fix">YOU</div>}
      </div>

      <div className="flex justify-between items-center shrink-0">
        <div className="flex flex-col text-left">
          <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1 font-fix">{isPlayerReady ? 'Link Confirmed' : 'Decrypting Signal'}</p>
          <span className={`font-bold uppercase text-xs truncate max-w-[120px] leading-none font-fix ${isPlayerReady ? 'text-white' : 'text-slate-600'}`}>
            {isPlayerReady ? (player.username || player.playerName) : 'ANALYZING...'}
          </span>
        </div>
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isPlayerReady ? 'border-[#fa7000] bg-[#fa7000]' : 'border-slate-800'}`}>
          {isPlayerReady && <span className="material-symbols-outlined text-black text-[12px] font-bold">check</span>}
        </div>
      </div>

      <div className="relative god-area mt-auto pt-2 border-t border-slate-800/50 shrink-0 text-left">
        <div className={`flex items-center gap-2 transition-all duration-700 ${isPlayerReady ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-1'}`}>
          {isPlayerReady ? (
             <div className="relative">
                <img className="w-6 h-6 rounded-full border border-[#fa7000]/50 object-cover" src={god?.icon} alt="" />
                {isMe && (
                  <div className="w-3 h-3 rounded-full border border-white absolute -bottom-0.5 -right-0.5 z-20 overflow-hidden bg-slate-800 flex items-center justify-center shadow-md">
                    {avatarUrl ? <img src={avatarUrl} alt="Me" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '8px' }}>person</span>}
                  </div>
                )}
             </div>
          ) : (
            <div className="w-6 h-6 rounded-full border border-slate-700 bg-black flex items-center justify-center text-[8px] text-slate-600">?</div>
          )}
          <div className="leading-tight">
            <p className="text-[7px] text-[#fa7000]/70 font-bold uppercase tracking-widest mb-0.5 font-fix">Guardian God</p>
            <p className="text-[10px] font-black text-white uppercase font-fix">{isPlayerReady && god ? god.name : "Waiting..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export const WaitingView: React.FC<WaitingViewProps> = ({
  onStart, onOpenSettings, onOpenHelp, onOpenRanking, onAbort
}) => {
  const { players, lobbyPlayers, myId, chatLogs, roomId, playerName, maxPlayers, selectedGodId, addLog, playerAvatar } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 🚀 修正：BGM再生の useEffect は AudioController が担当するため削除

  useEffect(() => { if (roomId) socket.emit(CLIENT_EVENTS.READY_TO_START, { roomId, ready: false }); }, [roomId]);
  useEffect(() => { if (selectedGodId) socket.emit(CLIENT_EVENTS.SELECT_GOD, { roomId, godId: selectedGodId }); }, [selectedGodId, roomId]);

  useEffect(() => {
    const handleGameStart = () => { onStart(); };
    socket.on(SERVER_EVENTS.GAME_START, handleGameStart);
    socket.on('GAME_START', handleGameStart); 
    return () => { 
      socket.off(SERVER_EVENTS.GAME_START, handleGameStart); 
      socket.off('GAME_START', handleGameStart);
    };
  }, [onStart]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const me = players.find(p => p.id === myId || p.playerName === playerName);
    const senderName = me?.username || me?.playerName || playerName || 'Operator';
    socket.emit(CLIENT_EVENTS.SEND_CHAT, { roomId, message: chatInput, sender: senderName });
    addLog({ sender: senderName, message: chatInput, timestamp: Date.now() });
    setChatInput(''); try { SoundManager.playSe('click'); } catch {}
  };

  const handleReadyClick = () => {
    const nextLockedState = !isLocked;
    setIsLocked(nextLockedState);
    socket.emit(CLIENT_EVENTS.READY_TO_START, { roomId, ready: nextLockedState }); 
    try { SoundManager.playSe('click'); } catch {}
    
    if (nextLockedState) {
      addLog("🚀 降下準備完了。味方の承認を待機しています...");
    } else {
      addLog("🔄 準備解除。待機状態に戻ります。");
    }
  };

  const totalSlots = maxPlayers || 2;
  const activeLobby = useMemo(() => {
    const base = (lobbyPlayers.length > 0 ? lobbyPlayers : players) as UnifiedPlayer[];
    return base.map(p => {
      const pId = p.playerId || p.id || '';
      const isMe = pId === myId || (playerName && p.playerName?.toLowerCase() === playerName.toLowerCase());
      const playerReady = isMe ? isLocked : (p.isReady === true || p.ready === true);
      return { playerId: pId, username: p.username, playerName: p.playerName || p.username, godId: (isMe ? selectedGodId : p.selectedGodId) || p.godId || null, isReady: playerReady } as LobbyPlayer;
    });
  }, [lobbyPlayers, players, myId, selectedGodId, playerName, isLocked]);

  const readyCount = useMemo(() => activeLobby.filter(p => p.isReady === true).length, [activeLobby]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLocked && readyCount < totalSlots) {
      interval = setInterval(() => {
        socket.emit(CLIENT_EVENTS.READY_TO_START, { roomId, ready: true });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLocked, readyCount, totalSlots, roomId]);

  useEffect(() => {
    if (isLocked && readyCount > 0 && readyCount >= totalSlots) {
      addLog("🚀 全員の最終承認を確認。作戦領域へ降下します！");
      const timer = setTimeout(() => { onStart(); }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [readyCount, totalSlots, onStart, addLog, isLocked]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLogs]);

  return (
    <div className="font-body antialiased overflow-hidden h-screen flex flex-col bg-[#020617] text-[#f8fafc] relative select-none">
      <style>{`
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        @keyframes scanline { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scanline { animation: scanline 3s linear infinite; }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; filter: blur(10px); } to { opacity: 1; filter: blur(0); } }
        .font-fix { line-height: 1; }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0) 70%); }
        .island-silhouette { background-image: linear-gradient(to top, #020617 10%, transparent 100%), url(https://images.unsplash.com/photo-1506466010722-395aa2bef877); background-size: cover; background-position: center bottom; }
      `}</style>
      
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} onAbort={onAbort} />

      <main className="flex-1 mt-16 flex flex-col relative overflow-hidden min-h-0">
        <section className="flex-1 flex flex-col py-4 px-6 md:px-8 z-10 max-w-7xl mx-auto w-full min-h-0 gap-4">
          <div className="flex justify-between items-end shrink-0 text-left">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-white mb-1 tracking-tighter italic uppercase font-fix">Waiting for Link...</h1>
              <div className="flex items-center gap-2 text-[#fa7000] font-black uppercase tracking-widest text-[10px] lg:text-[11px] font-fix">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fa7000] animate-pulse shadow-[0_0_10px_#fa7000]"></div>
                Squad Synchronization active
              </div>
            </div>
            <div className="flex items-baseline gap-4 lg:gap-10 text-right leading-none">
              <p className="hidden sm:block text-slate-400 text-[10px] uppercase tracking-widest font-bold font-fix whitespace-nowrap">Link Status</p>
              <p className="text-2xl lg:text-3xl font-black text-white font-fix min-w-[120px]">
                {readyCount} <span className="text-[#fa7000] ml-1 lg:ml-2">/ {totalSlots} READY</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 px-2">
            {Array.from({ length: totalSlots }).map((_, index) => {
              const lp = activeLobby[index];
              if (lp && lp.playerId) {
                const playerData: ExtendedPlayer = { id: lp.playerId, username: lp.username || 'Unknown', playerName: lp.playerName || 'Unknown', selectedGodId: lp.godId, godId: lp.godId, isReady: lp.isReady };
                return <PlayerCard key={lp.playerId} player={playerData} isMe={lp.playerId === myId} isHost={index === 0} myAvatar={playerAvatar} />;
              }
              return (
                <div key={`empty-${index}`} className="glass-panel rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 h-48 w-full opacity-40">
                  <span className="material-symbols-outlined text-4xl text-slate-700">person_add</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-fix">Awaiting Signal</span>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-2 text-left">
            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col h-full border-slate-800 shadow-2xl">
              <div className="flex-1 p-4 space-y-3 overflow-y-auto text-sm custom-scrollbar text-left font-mono bg-slate-950/20">
                {chatLogs.map((log, i) => (
                  <div key={`chat-${i}`} className="flex gap-2 leading-tight animate-fadeIn">
                    <span className={`${log.sender === (playerName || 'Operator') ? 'text-cyan-400' : 'text-[#fa7000]'} font-bold shrink-0`}>{log.sender}:</span>
                    <span className="text-slate-300 break-words font-fix">{log.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 bg-slate-950/50 border-t border-slate-800 shrink-0">
                <div className="relative flex items-center">
                  <input className="w-full bg-slate-900 border-slate-800 rounded-lg py-2 px-4 text-sm focus:ring-[#fa7000] focus:border-[#fa7000] text-slate-200 outline-none font-mono" placeholder="Transmit tactical data..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}/>
                  <button onClick={handleSendMessage} className="absolute right-2 text-[#fa7000] hover:text-orange-400 transition-colors"><span className="material-symbols-outlined">send</span></button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 h-full">
              <div className="glass-panel rounded-xl flex flex-col border-slate-800 shadow-2xl flex-1 min-h-0 p-4">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none font-fix mb-2">Mission Sector</p>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none font-fix mb-3 italic">Cebu Island</h3>
                  <div className="flex-1 min-h-[80px] w-full rounded-lg overflow-hidden relative border border-white/5 bg-slate-950">
                    <img alt="Map" className="w-full h-full object-cover opacity-100" src="https://images.unsplash.com/photo-1518107616385-ad302215a9a8" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-[1px] bg-[#fa7000]/30 absolute top-1/2"></div>
                      <div className="h-full w-[1px] bg-[#fa7000]/30 absolute left-1/2"></div>
                      <span className="text-[9px] font-mono text-[#fa7000] font-black uppercase drop-shadow-lg bg-black/40 px-2 py-0.5 rounded">Tactical Link Established</span>
                    </div>
                  </div>
              </div>
              
              <button 
                onClick={handleReadyClick}
                className={`w-full h-[64px] flex flex-col items-center justify-center rounded-xl transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-[2px] shadow-lg shrink-0
                ${isLocked 
                  ? 'bg-slate-800 border-slate-950 text-[#fa7000] shadow-orange-950/20 opacity-80 active:brightness-90' 
                  : 'bg-gradient-to-r from-orange-600 to-brand-500 border-orange-800 text-black font-black shadow-orange-500/20 hover:brightness-110 active:brightness-90'}`}
              >
                <div className="flex items-center gap-3">
                  {isLocked ? (
                    <>
                      <span className="material-symbols-outlined text-lg">lock_open</span>
                      <span className="text-xl font-black italic tracking-widest leading-none font-fix">CANCEL READY</span>
                    </>
                  ) : (
                    <span className="text-2xl font-black italic tracking-widest leading-none font-fix">DEPLOY SQUAD</span>
                  )}
                </div>
                {!isLocked && (
                  <div className={`text-[9px] font-mono tracking-[0.4em] mt-1 opacity-80 font-fix text-orange-950`}>
                    UPLINK_PROTOCOL_B21
                  </div>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WaitingView;