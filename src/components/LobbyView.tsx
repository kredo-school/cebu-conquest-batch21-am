/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, memo } from 'react'; 
import socket from '../socket';
import { useGameStore, Player } from '../store';
import SoundManager from '../game/SoundManager';
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CustomButton } from './common/CustomButton';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

interface LobbyPlayer extends Player {
  ready?: boolean;
}

const PlayerCard = memo(({ player, isMe, isHost, myAvatar }: { player: LobbyPlayer; isMe: boolean; isHost: boolean; myAvatar: string | null }) => {
  const isPlayerReady = player.isReady === true || player.ready === true;
  const avatarUrl = isMe ? myAvatar : null;
  const isNpc = player.id?.includes('npc') || (!player.username && !isMe);

  return (
    <div className={`glass-panel p-5 rounded-2xl border-l-4 flex flex-col gap-4 group transition-all duration-500 h-64 w-72 shrink-0 ${
      isPlayerReady 
        ? 'border-l-[#fa7000] bg-orange-950/20 shadow-[0_0_30px_rgba(250,112,0,0.2)]' 
        : 'border-l-slate-800 bg-slate-950/40 opacity-90 shadow-md'
    }`}>
      
      {/* アバターコンテナ */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center border border-white/5">
        <div className="w-full h-full flex items-center justify-center bg-slate-950/50">
          <div className={`w-full h-full flex items-center justify-center transition-all duration-500 mix-blend-screen ${
            !isPlayerReady ? 'filter brightness-[0.65] contrast-[1.1] saturate-[0.8] bg-slate-900/40' : 'opacity-100'
          }`}>
            {isMe && avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover animate-fadeIn" />
            ) : isNpc ? (
              <div className="flex flex-col items-center justify-center animate-fadeIn">
                <span className="material-symbols-outlined text-cyan-500 text-6xl drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">smart_toy</span>
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-2 font-mono">AI UNIT</p>
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center animate-fadeIn transition-opacity ${!isPlayerReady ? 'opacity-65' : 'opacity-100'}`}>
                <span className="material-symbols-outlined text-slate-400 text-6xl">person</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 font-mono">NO IMAGE</p>
              </div>
            )}
          </div>
        </div>

        {!isPlayerReady && (
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] pointer-events-none opacity-60" />
        )}

        <div className="absolute inset-0 pointer-events-none border border-white/5 m-1 rounded-lg"></div>
        {isHost && <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#fa7000] text-[9px] font-black text-black rounded uppercase shadow-lg z-10 font-fix">HOST</div>}
        {isMe && <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-950/90 text-[9px] font-black text-[#fa7000] rounded border border-[#fa7000]/30 uppercase z-10 font-fix">YOU</div>}
      </div>

      <div className="flex justify-between items-center mt-auto">
        <div className="flex flex-col text-left">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1 font-fix">
            {isPlayerReady ? 'Authentication Confirmed' : 'Signal Detected'}
          </p>
          <span className={`font-black uppercase text-lg truncate max-w-[150px] leading-none font-fix ${isPlayerReady ? 'text-white' : 'text-slate-400'}`}>
            {player.playerName || player.username || 'OPERATOR'}
          </span>
        </div>
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
          isPlayerReady ? 'border-[#fa7000] bg-[#fa7000] shadow-[0_0_15px_rgba(250,112,0,0.6)]' : 'border-slate-800 bg-slate-900/50'
        }`}>
          {isPlayerReady ? <span className="material-symbols-outlined text-black text-[20px] font-bold">check</span> : <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse"></div>}
        </div>
      </div>
    </div>
  );
});

interface LobbyViewProps {
  roomId: string;
  players: LobbyPlayer[];
  onStart: () => void; 
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void; 
  onAbort: () => void; 
}

export const LobbyView: React.FC<LobbyViewProps> = ({ 
  roomId, players, onStart, onOpenSettings, onOpenHelp, onOpenRanking, onAbort 
}) => {
  const { myId, addLog, maxPlayers = 4, chatLogs, playerName, playerAvatar } = useGameStore(); 
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (socket && roomId) {
        socket.emit('leave_room', { roomId });
      }
    };
  }, [roomId]);

  useEffect(() => {
    const currentCount = players.length;
    const isRoomFull = currentCount > 0 && currentCount === maxPlayers;
    const allReady = currentCount > 0 && players.every((p) => p.isReady === true || p.ready === true);
    if (isRoomFull && allReady) {
      addLog("🚀 Squad links synchronized. Initiating Oracle Phase.");
      if (socket) socket.emit(CLIENT_EVENTS.ENTER_GOD_SELECTION, { roomId });
      onStart(); 
    }
  }, [players, maxPlayers, onStart, addLog, roomId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatLogs]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const me = players.find(p => p.id === myId);
    const senderName = me?.playerName || me?.username || playerName || 'Operator';
    socket.emit(CLIENT_EVENTS.SEND_CHAT, { roomId, message: chatInput, sender: senderName });
    setChatInput(''); 
    try { SoundManager.playSe('click'); } catch (_e) {}
  };

  const handleReady = () => {
    const nextReadyState = !isReady;
    setIsReady(nextReadyState);
    try { SoundManager.playSe('click'); } catch (_e) {}
    socket.emit(CLIENT_EVENTS.READY_TO_START, { roomId, ready: nextReadyState });
  };

  const handleCopyId = () => {
    if (!roomId) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = roomId;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (_error) {
        addLog("❌ Copy failed due to security constraints.");
      } finally {
        textArea.remove();
      }
    }
  };

  return (
    <div className="font-body antialiased overflow-hidden h-screen flex flex-col bg-[#020617] text-[#f8fafc] relative select-none">
      <style>{`
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        @keyframes scanline { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scanline { animation: scanline 3s linear infinite; }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; filter: blur(10px); } to { opacity: 1; filter: blur(0); } }
        .font-fix { line-height: 1; }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0) 70%); }
        .island-silhouette { 
          background-image: linear-gradient(to top, #020617 10%, transparent 100%), url(https://images.unsplash.com/photo-1506466010722-395aa2bef877?auto=format&fit=crop&w=1920&q=80);
          background-size: cover; background-position: center bottom;
        }
        
        @keyframes dotFlow {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-1px); }
        }
        .animate-dotFlow { display: inline-block; animation: dotFlow 1.2s infinite ease-in-out; }

        @keyframes shine { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .group:hover .animate-shineEffect { animation: shine 0.6s ease-in-out forwards; }
      `}</style>
      
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} onAbort={onAbort} />

      <main className="relative z-20 flex-1 mt-16 flex relative overflow-hidden min-h-0">
        <section className="flex-1 flex flex-col p-8 z-10 max-w-7xl mx-auto w-full min-h-0 justify-between">
          
          <div className="flex justify-between items-end mb-6 shrink-0 text-left">
            <div className="text-left">
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic leading-none font-fix inline-flex items-center">
                SQUAD WAITING
                <span className="inline-flex ml-1 tracking-tighter not-italic">
                  <span className="animate-dotFlow" style={{ animationDelay: '0s' }}>.</span>
                  <span className="animate-dotFlow" style={{ animationDelay: '0.2s' }}>.</span>
                  <span className="animate-dotFlow" style={{ animationDelay: '0.4s' }}>.</span>
                </span>
              </h1>
            </div>
            
            <div className="flex gap-12 items-end">
              <div className="text-right leading-none border-r border-white/10 pr-10 cursor-pointer group" onClick={handleCopyId}>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1 font-fix">NETWORK ROOM ID</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-3xl font-black text-[#f8fafc] tracking-wider uppercase font-mono">{roomId}</p>
                  <span className={`material-symbols-outlined text-sm ${copied ? 'text-green-500' : 'text-slate-500 group-hover:text-[#fa7000]'}`}>{copied ? 'check' : 'content_copy'}</span>
                </div>
              </div>
              
              <div className="flex items-baseline gap-10 text-right leading-none">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold font-fix whitespace-nowrap">ROOM CAPACITY</p>
                <p className="text-3xl font-black text-white font-fix min-w-[80px]">
                  {players.length} <span className="text-[#fa7000] ml-2">/ {maxPlayers}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-start md:justify-center min-h-0 mb-8 overflow-x-auto overflow-y-hidden custom-scrollbar px-4 w-full">
            <div className="flex flex-row justify-start md:justify-center items-center gap-8 w-auto mx-auto p-2 shrink-0">
              {players.map((p, idx) => (
                <PlayerCard key={p.id || `player-${idx}`} player={p} isMe={p.id === myId} isHost={idx === 0} myAvatar={playerAvatar} />
              ))}
              {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
                <button key={`empty-${i}`} onClick={() => socket.emit(CLIENT_EVENTS.ADD_NPC_REQUEST, { roomId })} className="glass-panel p-4 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center h-64 w-72 shrink-0 text-slate-600 hover:text-[#fa7000] hover:border-[#fa7000]/50 transition-all group">
                  <span className="material-symbols-outlined text-5xl mb-3 group-hover:scale-110 transition-transform">person_add</span>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] font-fix text-center">DEPLOY AI UNIT</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 shrink-0 mb-4 items-end justify-center w-full max-w-6xl mx-auto">
            
            <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col h-36 border-slate-800 shadow-2xl w-full">
              <div ref={scrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto text-sm custom-scrollbar text-left font-mono bg-slate-950/20">
                {chatLogs.map((log, i) => (
                  <div key={`chat-${i}`} className="flex gap-2 animate-fadeIn text-left">
                    <span className="text-slate-500 font-bold shrink-0">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                    <span className={`${log.sender === (playerName || 'Operator') ? 'text-cyan-400' : 'text-[#fa7000]'} font-bold shrink-0`}>{log.sender}:</span>
                    <span className="text-slate-300 break-words font-fix">{log.message}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-950/50 border-t border-slate-800 shrink-0">
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-slate-900 border-slate-800 rounded-lg py-2 pl-4 pr-10 text-xs focus:ring-[#fa7000] focus:border-[#fa7000] text-slate-200 outline-none font-mono" 
                    placeholder="TRANSMIT TACTICAL DATA..." 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} className="absolute right-2 text-[#fa7000] hover:text-orange-400 transition-colors">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ⚡ 出撃準備ボタン */}
            {/* 🚀 修正ポイント: 左右のアイコンを完全カットし、下部のテキストを「LANDING ON CEBU ISLAND」にリプレイス */}
            <div className="w-full lg:w-[400px] shrink-0">
              <button 
                onClick={handleReady}
                className={`w-full h-[96px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-[2px] shadow-lg shrink-0 relative overflow-hidden group
                ${isReady 
                  ? 'bg-slate-800 border-slate-950 text-[#fa7000] shadow-orange-950/20 active:brightness-90' 
                  : 'bg-gradient-to-r from-orange-600 to-brand-500 border-orange-800 text-black font-black shadow-orange-500/20 hover:brightness-110 active:brightness-90'}`}
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_8px] pointer-events-none"></div>
                
                <div className="flex items-center relative z-10 font-fix">
                  <span className="text-3xl font-black italic tracking-[0.15em] leading-none whitespace-nowrap">
                    {isReady ? 'UNREADY' : 'READY'}
                  </span>
                </div>

                <div className={`text-[9px] font-mono tracking-[0.3em] mt-2 font-fix opacity-80 flex items-center gap-1.5 ${isReady ? 'text-[#fa7000]/80' : 'text-orange-950/80'}`}>
                  <span className="inline-block w-1 h-1 rounded-full bg-current animate-pulse"></span>
                  LANDING ON CEBU ISLAND
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shineEffect pointer-events-none"></div>
              </button>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};

export default LobbyView;