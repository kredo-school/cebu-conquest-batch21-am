/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, memo } from 'react'; 
import socket from '../socket';
import { useGameStore, Player } from '../store';
import SoundManager from '../game/SoundManager';
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/socketEvents.js';

interface LobbyPlayer extends Player {
  ready?: boolean;
}

/**
 * 🚀 PlayerCard: 「未割り当て」から「リンク確立」へのドラマチックな演出
 */
const PlayerCard = memo(({ player, isMe, isHost, myAvatar }: { player: LobbyPlayer; isMe: boolean; isHost: boolean; myAvatar: string | null }) => {
  const isPlayerReady = player.isReady === true || player.ready === true;
  const avatarUrl = isMe ? myAvatar : null;

  return (
    <div className={`glass-panel p-4 rounded-xl border-l-4 flex flex-col gap-3 group transition-all duration-500 h-48 w-64 shrink-0 ${
      isPlayerReady 
        ? 'border-l-[#fa7000] bg-orange-950/20 shadow-[0_0_25px_rgba(250,112,0,0.15)]' 
        : 'border-l-slate-800 bg-slate-900/40 opacity-80'
    }`}>
      
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center border border-white/5">
        {!isPlayerReady ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="w-full h-[2px] bg-[#fa7000]/20 absolute top-0 animate-scanline"></div>
            <span className="material-symbols-outlined text-4xl text-slate-700 mb-1 animate-pulse">fingerprint</span>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Awaiting Link</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="avatar" 
                className="w-full h-full object-cover animate-fadeIn" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center animate-fadeIn opacity-40">
                <span className="material-symbols-outlined text-slate-400 text-5xl">person</span>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">No Image</p>
              </div>
            )}
          </div>
        )}
        
        <div className="absolute inset-0 pointer-events-none border border-white/5 m-1"></div>
        {isHost && <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#fa7000] text-[8px] font-black text-black rounded uppercase shadow-lg z-10 font-fix">HOST</div>}
        {isMe && <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-900/90 text-[8px] font-black text-[#fa7000] rounded border border-[#fa7000]/30 uppercase z-10 font-fix">YOU</div>}
      </div>

      <div className="flex justify-between items-center mt-auto">
        <div className="flex flex-col text-left">
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1 font-fix">
            {isPlayerReady ? 'Authentication Confirmed' : 'Signal Detected'}
          </p>
          <span className={`font-bold uppercase text-sm truncate max-w-[140px] leading-none font-fix ${isPlayerReady ? 'text-white' : 'text-slate-600'}`}>
            {isPlayerReady ? (player.playerName || player.username) : 'DECRYPTING...'}
          </span>
        </div>

        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
          isPlayerReady ? 'border-[#fa7000] bg-[#fa7000] shadow-[0_0_15px_rgba(250,112,0,0.6)]' : 'border-slate-800'
        }`}>
          {isPlayerReady ? (
            <span className="material-symbols-outlined text-black text-[16px] font-bold">check</span>
          ) : (
            <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-ping"></div>
          )}
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
    try { SoundManager.playBgm('lobby'); } catch (_e) {} 
  }, []);

  useEffect(() => {
    const currentCount = players.length;
    const isRoomFull = currentCount > 0 && currentCount === maxPlayers;
    const allReady = currentCount > 0 && players.every((p) => p.isReady === true || p.ready === true);

    if (isRoomFull && allReady) {
      addLog("🚀 分隊全員のリンク承認。神託フェーズへ移行します。");
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
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddNPC = () => {
    socket.emit(CLIENT_EVENTS.ADD_NPC_REQUEST, { roomId });
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
        /* 🚀 追加：タクティカル・ボタンのデザイン */
        .tactical-btn { 
          clip-path: polygon(8% 0, 100% 0, 100% 75%, 92% 100%, 0 100%, 0 25%);
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .tactical-btn::before {
          content: ''; position: absolute; top: -100%; left: -100%; width: 300%; height: 300%;
          background: linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.15) 50%, transparent 55%);
          transition: all 0.6s ease;
        }
        .tactical-btn:hover::before { top: -50%; left: -50%; }
        .tactical-btn:hover { transform: scale(1.02); filter: brightness(1.2); }
      `}</style>
      
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} onAbort={onAbort} />

      <main className="flex-1 mt-16 flex relative overflow-hidden min-h-0">
        <section className="flex-1 flex flex-col p-8 z-10 max-w-7xl mx-auto w-full min-h-0 justify-between">
          <div className="flex justify-between items-end mb-6 shrink-0 text-left">
            <div className="text-left">
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic leading-none font-fix">SQUAD WAITING...</h1>
              <div className="flex items-center gap-2 text-[#fa7000] font-black uppercase tracking-widest text-[11px] font-fix">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fa7000] animate-pulse"></div>
                Tactical link synchronization active
              </div>
            </div>
            
            <div className="flex gap-12 items-end">
              <div className="text-right leading-none border-r border-white/10 pr-10 cursor-pointer group" onClick={handleCopyId}>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1 font-fix">Network Room ID</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-3xl font-black text-[#f8fafc] tracking-wider uppercase font-mono">{roomId}</p>
                  <span className={`material-symbols-outlined text-sm ${copied ? 'text-green-500' : 'text-slate-500 group-hover:text-[#fa7000]'}`}>{copied ? 'check' : 'content_copy'}</span>
                </div>
              </div>
              
              {/* 🚀 修正：Squad Capacity ラベルと数字の距離を確保 */}
              <div className="flex items-baseline gap-10 text-right leading-none">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold font-fix whitespace-nowrap">Squad Capacity</p>
                <p className="text-3xl font-black text-white font-fix min-w-[80px]">
                  {players.length} <span className="text-[#fa7000] ml-2">/ {maxPlayers}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0 mb-6 overflow-x-auto custom-scrollbar px-4">
            <div className="flex lg:grid lg:grid-cols-4 gap-8 w-fit mx-auto content-center p-2 shrink-0">
              {players.map((p, idx) => (
                <PlayerCard key={p.id || `player-${idx}`} player={p} isMe={p.id === myId} isHost={idx === 0} myAvatar={playerAvatar} />
              ))}
              {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
                <button key={`empty-${i}`} onClick={handleAddNPC} className="glass-panel p-4 rounded-xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center h-48 w-64 shrink-0 text-slate-600 hover:text-[#fa7000] hover:border-[#fa7000]/50 transition-all group">
                  <span className="material-symbols-outlined text-4xl mb-2 group-hover:scale-110 transition-transform">person_add</span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] font-fix">Deploy NPC</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 mb-2 items-end">
            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col h-64 border-slate-800 shadow-2xl">
              <div ref={scrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto text-sm custom-scrollbar text-left font-mono bg-slate-950/20">
                {chatLogs.map((log, i) => (
                  <div key={`chat-${i}`} className="flex gap-2 animate-fadeIn">
                    <span className={`${log.sender === (playerName || 'Operator') ? 'text-cyan-400' : 'text-[#fa7000]'} font-bold`}>{log.sender}:</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-950/50 border-t border-slate-800 shrink-0">
                <div className="relative flex items-center">
                  <input className="w-full bg-slate-900 border-slate-800 rounded-lg py-2 px-4 text-sm focus:ring-[#fa7000] focus:border-[#fa7000] text-slate-200 outline-none font-mono" placeholder="Transmit tactical data..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}/>
                  <button onClick={handleSendMessage} className="absolute right-2 text-[#fa7000] hover:text-orange-400 transition-colors">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-panel rounded-xl overflow-hidden flex flex-col border-slate-800 shadow-2xl shrink-0">
                <div className="p-4 flex flex-col gap-3 text-left">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none font-fix">Mission Sector</p>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none font-fix italic">Cebu Island</h3>
                  <div className="h-32 w-full rounded-lg overflow-hidden relative border border-white/5 bg-slate-950 shrink-0 shadow-inner">
                    
                    {/* 🚀 修正：マップ画像を 100% 表示に固定 */}
                    <img 
                      alt="Tactical Map" 
                      className="w-full h-full object-cover opacity-100" 
                      src="https://images.unsplash.com/photo-1518107616385-ad302215a9a8" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-[1px] bg-[#fa7000]/30 absolute top-1/2"></div>
                      <div className="h-full w-[1px] bg-[#fa7000]/30 absolute left-1/2"></div>
                      <span className="text-[10px] font-mono text-[#fa7000] font-black uppercase drop-shadow-lg bg-black/40 px-2 py-0.5 rounded">Link Active</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* 🚀 修正：タクティカル・デザインにアップグレードされたボタン */}
              <button 
                onClick={handleReady}
                className={`tactical-btn w-full h-[64px] font-black text-2xl uppercase transition-all transform active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] shrink-0 font-fix flex flex-col items-center justify-center border-l-4 ${
                  isReady 
                    ? 'bg-slate-900 text-[#fa7000] border-l-[#fa7000] shadow-[0_0_20px_rgba(250,112,0,0.2)]' 
                    : 'bg-[#fa7000] text-black border-l-white shadow-[0_0_30px_rgba(250,112,0,0.4)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isReady && <span className="material-symbols-outlined animate-pulse text-lg">lock</span>}
                  <span>{isReady ? 'LINK LOCKED' : 'ESTABLISH LINK'}</span>
                </div>
                <div className={`text-[8px] font-mono tracking-[0.4em] mt-0.5 opacity-60 ${isReady ? 'text-[#fa7000]' : 'text-black'}`}>
                  {isReady ? 'SYNC_ACTIVE_100' : 'UPLINK_PROTOCOL_B21'}
                </div>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LobbyView;