// src/components/LobbyView.tsx
import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

/**
 * 🚀 プレイヤー/NPCカード・コンポーネント
 */
const PlayerCard = ({ player, isMe, isHost }: { player: any; isMe: boolean; isHost: boolean }) => {
  const isNPC = player.isNPC;
  
  return (
    <div className={`p-4 rounded-xl border-l-4 backdrop-blur-md transition-all h-full shadow-2xl flex flex-col 
      ${player.isReady ? 'border-brand-500 shadow-brand-500/10' : 'border-slate-800 opacity-60'}
      ${isNPC ? 'bg-red-950/20 border-red-900' : 'bg-slate-900/60'} 
      relative overflow-hidden`}>
      
      <div className="relative mb-4 text-left overflow-hidden rounded-lg bg-slate-950">
        <img 
          className={`w-full aspect-video object-cover transition-transform duration-500 ${player.isReady ? 'scale-105' : 'grayscale'}`} 
          src={isNPC 
            ? 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=400' 
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.playerName || player.name || player.id}`} 
          alt="" 
        />
        {isHost && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-600 text-[9px] font-black text-black rounded shadow-lg font-fix italic">
            HOST
          </div>
        )}
        {isMe && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-brand-500 text-[9px] font-black text-slate-950 rounded shadow-lg font-fix">
            YOU
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-auto px-1">
        <div className="flex flex-col text-left">
          <span className={`text-[10px] font-bold uppercase tracking-widest leading-none mb-1 font-fix ${isNPC ? 'text-red-500' : 'text-brand-500'}`}>
            {isNPC ? 'Neural Bot (System Logic)' : 'Operator (Human)'}
          </span>
          <span className="font-black text-white uppercase text-sm truncate max-w-[140px] font-fix">
            {isNPC && <span className="text-red-500 mr-1">[BOT]</span>}
            {player.playerName || player.name || player.username || "Unknown Operator"}
          </span>
        </div>
        {(player.isReady || isHost) && (
          <span className="material-symbols-outlined text-brand-500 text-lg" style={{ fontVariationSettings: '"FILL" 1' }}>
            check_circle
          </span>
        )}
      </div>
    </div>
  );
};

interface LobbyViewProps {
  roomId: string;
  players: any[];
  onStart: () => void; 
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void; 
  onAbort: () => void; 
}

export const LobbyView: React.FC<LobbyViewProps> = ({ 
  roomId, players, onStart, onOpenSettings, onOpenHelp, onOpenRanking, onAbort 
}) => {
  const { myId, addLog, maxPlayers = 4, isServerOnline, chatLogs, playerName } = useGameStore(); 
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentCount = Math.max(players.length, 1);

  useEffect(() => {
    SoundManager.playBgm('lobby');
  }, []);

  useEffect(() => {
    const allReady = players.length > 0 && players.every((p, idx) => idx === 0 || p.isReady);
    if (allReady && players.length >= 2) {
      addLog("🚀 全員の準備が整いました。ニューラル接続を開始します。");
      onStart(); 
    }
  }, [players, onStart, addLog]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLogs]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      socket.emit(CLIENT_EVENTS.SEND_CHAT, { roomId, message: chatInput });
      setChatInput(''); 
      try { SoundManager.playSe('click'); } catch {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const handleReady = () => {
    const nextReadyState = !isReady;
    setIsReady(nextReadyState);
    try { SoundManager.playSe('click'); } catch {}
    socket.emit(CLIENT_EVENTS.PLAYER_READY, { roomId, ready: nextReadyState });
  };

  const handleCopyId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAbort = () => {
    if (window.confirm("ABORT MISSION?")) {
      socket.emit(CLIENT_EVENTS.LEAVE_ROOM, { roomId });
      onAbort(); 
    }
  };

  const handleAddNPC = () => {
    socket.emit('add_npc_request', { roomId });
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 font-body text-slate-100 overflow-hidden select-none">
      
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-950/90 border-b border-orange-900/30 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-brand-500 uppercase tracking-tighter text-left font-fix">Cebu Conquest</span>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isServerOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
            <span className={`text-[8px] font-black tracking-widest uppercase font-fix ${isServerOnline ? 'text-green-500' : 'text-red-500'}`}>
              Server: {isServerOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={onOpenRanking} className="text-slate-400 hover:text-orange-500"><span className="material-symbols-outlined">leaderboard</span></button>
          <button onClick={onOpenSettings} className="text-slate-400 hover:text-brand-500"><span className="material-symbols-outlined">settings</span></button>
          <button onClick={handleAbort} className="text-red-500 hover:text-red-400 font-black text-xs tracking-widest font-fix">ABORT</button>
        </div>
      </header>

      <main className="flex-1 mt-16 flex relative overflow-hidden">
        <div className="absolute inset-0 z-0 text-left">
          <img className="w-full h-full object-cover opacity-20 grayscale brightness-50" src="https://images.unsplash.com/photo-1540206395-6880f94903af?q=80&w=2000" alt=""/>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        </div>

        <section className="flex-1 flex flex-col p-8 z-10 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
          <div className="flex justify-between items-start mb-8 text-left">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none font-fix">Tactical Lobby</h1>
              <div className="flex items-center gap-2 text-brand-500 font-bold uppercase tracking-[0.3em] text-sm animate-pulse mt-2 font-fix">
                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                Awaiting Squad Synchronization
              </div>
            </div>

            <div onClick={handleCopyId} className="cursor-pointer bg-slate-900/80 border border-brand-500/20 px-6 py-2 rounded-xl flex items-center gap-4 transition-all hover:border-brand-500">
              <span className="text-2xl font-black text-white tracking-[0.4em] font-mono font-fix">{roomId || "------"}</span>
              <span className="text-[10px] text-slate-500 uppercase font-black font-fix">{copied ? 'COPIED' : 'COPY'}</span>
            </div>

            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black font-fix">Capacity</p>
              <p className="text-3xl font-black text-white font-fix">
                {currentCount} <span className="text-brand-500">/ {maxPlayers}</span>
              </p>
            </div>
          </div>

          <div className={`grid gap-6 mb-8 ${maxPlayers === 2 ? 'grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {players.map((player, idx) => (
              <PlayerCard key={player.id} player={player} isMe={player.id === myId} isHost={idx === 0} />
            ))}
            {players.length < maxPlayers && (
              <button onClick={handleAddNPC} className="p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-brand-500 hover:bg-brand-500/5 transition-all flex flex-col items-center justify-center gap-2 group min-h-[200px]">
                <span className="material-symbols-outlined text-3xl text-slate-700 group-hover:text-brand-500">smart_toy</span>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-fix group-hover:text-brand-500">Add Neural Bot</span>
              </button>
            )}
          </div>

          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 💬 チャットエリア：スタイリッシュ横一行レイアウト */}
            <div className="lg:col-span-2 p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 h-64 flex flex-col overflow-hidden font-mono text-left">
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 mb-4 custom-scrollbar pr-2">
                <div className="border-b border-white/5 pb-2 mb-2">
                  <p className="text-brand-500 font-black uppercase text-[10px] tracking-widest animate-pulse font-fix">System: [Encrypted Link Established]</p>
                </div>
                {chatLogs.map((msg, i) => {
                  const isMe = msg.sender === playerName;
                  return (
                    <div key={i} className="flex items-baseline gap-2 animate-fadeIn leading-tight">
                      {/* タイムスタンプ：控えめなサイズ */}
                      <span className="text-[9px] text-slate-600 font-mono shrink-0">[{msg.timestamp || 'SYNC'}]</span>
                      
                      {/* 名前：ボールド＆カラー。自分ならブランドカラー */}
                      <span className={`text-[10px] font-black uppercase shrink-0 font-fix ${isMe ? 'text-brand-500' : 'text-slate-400'}`}>
                        {msg.sender || "Commander"} {isMe ? "(YOU)" : ""}:
                      </span>

                      {/* メッセージ：可読性重視 */}
                      <span className="text-[11px] text-slate-200 break-words font-fix flex-1">{msg.message}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 focus-within:border-brand-500 transition-colors pointer-events-auto">
                <input className="flex-1 bg-transparent py-2 px-4 text-[11px] text-white focus:outline-none font-fix" placeholder="Input tactical message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown}/>
                <button onClick={handleSendMessage} className="bg-brand-500 hover:bg-brand-400 text-slate-950 px-6 py-1.5 rounded-md font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 font-fix">SEND</button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 text-left">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1 font-fix">Operation Zone</p>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic font-fix">Cebu Archipelago</h3>
              </div>
              <button 
                onClick={handleReady}
                className={`w-full font-black py-5 rounded-xl transition-all active:scale-95 shadow-2xl uppercase tracking-widest text-xl pointer-events-auto font-fix
                  ${isReady ? 'bg-slate-800 text-brand-500 border border-brand-500 shadow-[0_0_20px_rgba(250,112,0,0.2)]' : 'bg-brand-500 text-slate-950 hover:bg-brand-400'}`}
              >
                {isReady ? 'LOCKED' : 'READY'}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-4 px-8 flex justify-between items-center bg-slate-950 border-t border-slate-800 z-50">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 text-left font-fix">Cebu Conquest Tactical Systems</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right font-fix">© 2026 Batch21-AM Deployment</p>
      </footer>
    </div>
  );
};