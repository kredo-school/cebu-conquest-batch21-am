/// <reference types="vite/client" />
import React, { useEffect, useMemo, memo, useState, useRef } from 'react';
import { useGameStore, Player, LobbyPlayer } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/socketEvents.js';
import { useBGM } from '../hook/useBGM';

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

interface ChatData {
  sender: string;
  message: string;
  timestamp?: string | number;
}

const GOD_TRAITS: Record<number, { name: string; img: string; icon: string; role: string; desc: string }> = {
  1: { name: "Neil",       img: "/assets/images/gods/Neil.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=1", role: "High Commander", desc: "Greatly bolsters starting HP, significantly enhancing board preservation and tactical longevity." },
  2: { name: "Garry",      img: "/assets/images/gods/Garry.png",      icon: "https://api.dicebear.com/7.x/identicon/svg?seed=2", role: "War Lord", desc: "Grants overwhelming offensive power, paving a smooth path to breach hostile sectors seamlessly." },
  3: { name: "Shem",       img: "/assets/images/gods/Shem.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=3", role: "Tactical Mind", desc: "Perfectly balances HP and AP metrics, excelling in multi-action tactical combat sequences." },
  4: { name: "Quisie",     img: "/assets/images/gods/Quisie.png",     icon: "https://api.dicebear.com/7.x/identicon/svg?seed=4", role: "Berserker", desc: "A high-risk unit that sacrifices core HP matrix to unleash ultimate, volatile destructive firepower." },
  5: { name: "Eduardo",    img: "/assets/images/gods/Eduardo.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=5", role: "Iron Shield", desc: "Maxes out defensive parameters, serving as the ultimate bulwark to neutralize enemy counter-offensives." },
  6: { name: "Kurt",       img: "/assets/images/gods/Kurt.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=6", role: "Assassin", desc: "Possesses a fragile HP pool but excels in low-profile infiltration to deliver lethal, critical strikes." },
  7: { name: "Stephen",    img: "/assets/images/gods/Stephen.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=7", role: "Oracle", desc: "Passive uplink accelerates Faith regeneration, ensuring continuous divine protection and baseline stat enhancements." },
  8: { name: "Bernardine", img: "/assets/images/gods/Bernardine.png", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=8", role: "Energy Core", desc: "Substantially elevates maximum AP thresholds, unlocking complex multi-action tactical chains within a single turn phase." },
};

const PlayerCard = memo(({ player, isMe, isHost, myAvatar }: { player: ExtendedPlayer; isMe: boolean; isHost: boolean; myAvatar: string | null }) => {
  const godId = player.selectedGodId || player.godId;
  const god = godId ? GOD_TRAITS[godId] : null;
  const isPlayerReady = player.isReady === true || player.ready === true;
  const avatarUrl = isMe ? myAvatar : null;
  const [isHovered, setIsHovered] = useState(false);
  const isNpc = player.id?.includes('npc') || (!player.username && !isMe);

  return (
    <div 
      className={`glass-panel p-5 rounded-2xl border-l-4 flex flex-col gap-4 group transition-all duration-500 h-64 w-72 shrink-0 relative overflow-visible ${
        isPlayerReady ? 'border-l-[#fa7000] bg-orange-950/10 shadow-[0_0_30px_rgba(250,112,0,0.2)]' : 'border-l-slate-800 bg-slate-900/40 opacity-90'
      } ${isHovered ? 'z-50' : 'z-10'}`}
      style={{
        background: `radial-gradient(circle at top right, ${isPlayerReady ? 'rgba(250, 112, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)'}, transparent 70%), rgba(15, 23, 42, 0.8)`
      }}
    >
      <div 
        className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center border border-white/5 cursor-help"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!god ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80 pointer-events-none">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="w-full h-[2px] bg-[#fa7000]/20 absolute top-0 animate-scanline"></div>
            <span className="material-symbols-outlined text-4xl text-slate-700 mb-2 animate-pulse">fingerprint</span>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Syncing God...</p>
          </div>
        ) : (
          <img 
            className={`w-full h-full object-cover object-top transition-all duration-700 pointer-events-none ${!isPlayerReady ? 'opacity-40 grayscale blur-[1px]' : 'opacity-100 grayscale-0 blur-0'}`} 
            src={god.img} 
            alt="God Portrait"
            style={{ filter: isPlayerReady ? 'none' : undefined }}
          />
        )}
        <div className="absolute inset-0 pointer-events-none border border-white/5 m-1 rounded-lg"></div>
        {isHost && <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#fa7000] text-[9px] font-black text-black rounded uppercase shadow-lg z-10 font-fix pointer-events-none">HOST</div>}
        {isMe && <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-900/90 text-[9px] font-black text-[#fa7000] rounded border border-[#fa7000]/30 uppercase z-10 font-fix pointer-events-none">YOU</div>}
      </div>

      {isHovered && god && (
        <div className="absolute top-0 left-full ml-4 z-[100] w-64 bg-slate-950 border border-orange-500/50 p-4 rounded-xl backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] animate-fadeIn pointer-events-none text-left">
          <div className="border-l-4 border-orange-600 pl-3 py-0.5 mb-2">
            <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{god.role}</p>
            <h3 className="text-lg font-black italic text-white leading-none uppercase">{god.name}</h3>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-fix">{god.desc}</p>
        </div>
      )}

      <div className="flex justify-between items-center shrink-0">
        <div className="flex flex-col text-left">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1 font-fix">{isPlayerReady ? 'Link Confirmed' : 'Decrypting Signal'}</p>
          <span className={`font-black uppercase text-lg truncate max-w-[150px] leading-none font-fix ${isPlayerReady ? 'text-white' : 'text-slate-600'}`}>
            {isPlayerReady ? (player.username || player.playerName) : 'ANALYZING...'}
          </span>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isPlayerReady ? 'border-[#fa7000] bg-[#fa7000] shadow-[0_0_10px_rgba(250,112,0,0.5)]' : 'border-slate-800'}`}>
          {isPlayerReady && <span className="material-symbols-outlined text-black text-[16px] font-bold">check</span>}
        </div>
      </div>

      <div className="relative god-area mt-auto pt-2 border-t border-slate-800/50 shrink-0 text-left">
        <div className={`flex items-center gap-2 transition-all duration-700 ${isPlayerReady ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-1'}`}>
          {isPlayerReady ? (
             <div className="relative">
                {isNpc ? (
                  <div className="w-7 h-7 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <span className="material-symbols-outlined text-[16px] text-cyan-500">smart_toy</span>
                  </div>
                ) : (
                  <img className="w-7 h-7 rounded-full border border-[#fa7000]/50 object-cover" src={god?.icon} alt="" />
                )}
                {isMe && (
                  <div className="w-4 h-4 rounded-full border border-white absolute -bottom-1 -right-1 z-20 overflow-hidden bg-slate-800 flex items-center justify-center shadow-md">
                    {avatarUrl ? <img src={avatarUrl} alt="Me" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '10px' }}>person</span>}
                  </div>
                )}
             </div>
          ) : (
            <div className="w-7 h-7 rounded-full border border-slate-700 bg-black flex items-center justify-center text-[10px] text-slate-600">?</div>
          )}
          <div className="leading-tight">
            <p className="text-[8px] text-[#fa7000]/70 font-bold uppercase tracking-widest mb-0.5 font-fix">Guardian God</p>
            <p className="text-[11px] font-black text-white uppercase font-fix">{isPlayerReady && god ? god.name : "Waiting..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export const WaitingView: React.FC<WaitingViewProps> = ({
  onStart, onOpenSettings, onOpenHelp, onOpenRanking, onAbort
}) => {
  const { players, lobbyPlayers, myId, chatLogs, roomId, playerName, maxPlayers, selectedGodId, playerAvatar } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { playBGM } = useBGM();

  useEffect(() => {
    playBGM('waiting');
  }, [playBGM]);

  useEffect(() => {
    const handleReceiveMessage = (data: ChatData) => { 
      useGameStore.setState(state => {
        const lastMsg = state.chatLogs[state.chatLogs.length - 1];
        if (lastMsg && lastMsg.sender === data.sender && lastMsg.message === data.message && lastMsg.timestamp === data.timestamp) {
          return state;
        }
        return { chatLogs: [...state.chatLogs, data].slice(-50) };
      });
    };
    
    socket.off(SERVER_EVENTS.CHAT_MESSAGE);
    socket.on(SERVER_EVENTS.CHAT_MESSAGE, handleReceiveMessage);
    
    return () => { 
      socket.off(SERVER_EVENTS.CHAT_MESSAGE, handleReceiveMessage); 
    };
  }, []);

  useEffect(() => { if (roomId) socket.emit(CLIENT_EVENTS.READY_TO_START, { roomId, ready: false }); }, [roomId]);
  useEffect(() => { if (selectedGodId) socket.emit(CLIENT_EVENTS.SELECT_GOD, { roomId, godId: selectedGodId }); }, [selectedGodId, roomId]);

  useEffect(() => {
    const handleGameStart = () => { onStart(); };
    socket.on(SERVER_EVENTS.GAME_START, handleGameStart);
    return () => { socket.off(SERVER_EVENTS.GAME_START, handleGameStart); };
  }, [onStart]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const me = players.find(p => p.id === myId || p.playerName === playerName);
    const senderName = me?.username || me?.playerName || playerName || 'Operator';
    socket.emit(CLIENT_EVENTS.SEND_CHAT, { roomId, message: chatInput, sender: senderName });
    setChatInput(''); 
    try { SoundManager.playSe('click'); } catch {}
  };

  const handleReadyClick = () => {
    const nextLockedState = !isLocked;
    setIsLocked(nextLockedState);
    socket.emit(CLIENT_EVENTS.READY_TO_START, { roomId, ready: nextLockedState }); 
    try { SoundManager.playSe('click'); } catch {}
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

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLogs]);

  return (
    <div className="font-body antialiased overflow-hidden h-screen flex flex-col bg-[#020617] text-[#f8fafc] relative select-none">
      <style>{`
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .font-fix { line-height: 1; }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0) 70%); }
        .island-silhouette { background-image: linear-gradient(to top, #020617 10%, transparent 100%), url(https://images.unsplash.com/photo-1506466010722-395aa2bef877); background-size: cover; background-position: center bottom; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scanline { animation: scanline 3s linear infinite; }
      `}</style>
      
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} onAbort={onAbort} />

      <main className="flex-1 mt-16 flex flex-col relative overflow-hidden min-h-0">
        <section className="flex-1 flex flex-col p-8 z-10 max-w-7xl mx-auto w-full min-h-0 justify-between">
          
          <div className="flex justify-between items-end mb-6 shrink-0 text-left">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter italic uppercase font-fix">READY FOR UPLINK</h1>
              <div className="flex items-center gap-2 text-[#fa7000] font-black uppercase tracking-widest text-[11px] font-fix">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fa7000] animate-pulse shadow-[0_0_10px_#fa7000]"></div>
                SQUAD SYNCHRONIZATION ACTIVE
              </div>
            </div>
            <div className="flex items-baseline gap-10 text-right leading-none">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold font-fix whitespace-nowrap">SQUAD CAPACITY</p>
              <p className="text-3xl font-black text-white font-fix min-w-[80px]">
                {readyCount} <span className="text-[#fa7000] ml-2">/ {totalSlots} READY</span>
              </p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0 mb-8 overflow-y-auto custom-scrollbar px-4 w-full">
            <div className="flex flex-wrap justify-center gap-8 w-full max-w-6xl mx-auto content-center p-2">
              {Array.from({ length: totalSlots }).map((_, index) => {
                const lp = activeLobby[index];
                if (lp && lp.playerId) {
                  const playerData: ExtendedPlayer = { id: lp.playerId, username: lp.username || 'Unknown', playerName: lp.playerName || 'Unknown', selectedGodId: lp.godId, godId: lp.godId, isReady: lp.isReady };
                  return <PlayerCard key={lp.playerId} player={playerData} isMe={lp.playerId === myId} isHost={index === 0} myAvatar={playerAvatar} />;
                }
                return (
                  <div key={`empty-${index}`} className="glass-panel p-5 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-3 h-64 w-72 shrink-0 text-slate-600">
                    <span className="material-symbols-outlined text-5xl">person_add</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] font-fix text-center">AWAITING OPERATOR</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 shrink-0 mb-4 items-end justify-center w-full max-w-6xl mx-auto px-4">
            
            <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col h-32 border-slate-800 shadow-2xl w-full max-w-[600px]">
              <div className="flex-1 p-4 space-y-3 overflow-y-auto text-sm custom-scrollbar font-mono bg-slate-950/20 text-left">
                {chatLogs.map((log, i) => (
                  <div key={`chat-${i}`} className="flex gap-2 animate-fadeIn text-left">
                    <span className={`${log.sender === (playerName || 'Operator') ? 'text-cyan-400' : 'text-[#fa7000]'} font-bold shrink-0`}>{log.sender}:</span>
                    <span className="text-slate-300 break-words font-fix">{log.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 bg-slate-950/50 border-t border-slate-800 shrink-0">
                <div className="relative flex items-center">
                  {/* 🚀 修正ポイント: 送信ボタンとの重複を防ぐため、py-2 px-4 から py-2 pl-4 pr-10 へ右端のパディングを確保 */}
                  <input 
                    className="w-full bg-slate-900 border-slate-800 rounded-lg py-2 pl-4 pr-10 text-xs focus:ring-[#fa7000] focus:border-[#fa7000] text-slate-200 outline-none font-mono" 
                    placeholder="TRANSMIT TACTICAL DATA..." 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} className="absolute right-2 text-[#fa7000] hover:text-orange-400 transition-colors"><span className="material-symbols-outlined text-sm">send</span></button>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[400px] shrink-0">
              <button 
                onClick={handleReadyClick}
                className={`w-full h-[96px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-[2px] shadow-lg shrink-0
                ${isLocked 
                  ? 'bg-slate-800 border-slate-950 text-[#fa7000] shadow-orange-950/20 active:brightness-90' 
                  : 'bg-gradient-to-r from-orange-600 to-orange-500 border-orange-800 text-black font-black shadow-orange-500/20 hover:brightness-110 active:brightness-90'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-2xl ${isLocked ? 'animate-pulse' : ''}`}>{isLocked ? 'lock' : 'bolt'}</span>
                  <span className="text-2xl font-black italic tracking-widest leading-none font-fix whitespace-nowrap">
                    {isLocked ? 'CANCEL READY' : 'DEPLOY SQUAD'}
                  </span>
                </div>
                <div className={`text-[11px] font-mono tracking-[0.4em] mt-2 opacity-80 font-fix ${isLocked ? 'text-[#fa7000]' : 'text-orange-950'}`}>
                  {isLocked ? 'SYNC_ACTIVE_100_AUTHORIZED' : 'UPLINK_PROTOCOL_B21_INITIATED'}
                </div>
              </button>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};

export default WaitingView;