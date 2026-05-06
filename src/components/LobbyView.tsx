// src/views/LobbyView.tsx

import React, { useState, useEffect, useRef, memo } from 'react'; // 💡 useMemo を削除
import socket from '../socket';
import { useGameStore, Player } from '../store';
import SoundManager from '../game/SoundManager';
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../../shared/socketEvents.js';

// 💡 データの揺れを安全に扱うための定義
interface LobbyPlayer extends Player {
  ready?: boolean;
}

/**
 * 🚀 PlayerCard: デザインをタクティカルに固定
 */
const PlayerCard = memo(({ player, isMe, isHost }: { player: LobbyPlayer; isMe: boolean; isHost: boolean }) => {
  const isPlayerReady = player.isReady === true || player.ready === true;

  return (
    <div className={`glass-panel p-4 rounded-xl border-l-4 flex flex-col gap-3 group transition-all duration-300 h-48 w-64 shrink-0 ${
      isPlayerReady ? 'border-l-[#fa7000] bg-orange-950/10' : 'border-l-slate-700 opacity-90'
    }`}>
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center">
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-700 opacity-70">
          <span className="material-symbols-outlined text-4xl text-slate-600 mb-1">person_search</span>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Unassigned</span>
        </div>

        {isHost && <div className="absolute top-2 right-2 px-2 py-1 bg-[#fa7000] text-[10px] font-bold text-black rounded uppercase leading-none">HOST</div>}
        {isMe && <div className="absolute top-2 right-2 px-2 py-1 bg-slate-900 text-[10px] font-bold text-[#fa7000] rounded border border-[#fa7000]/30 uppercase leading-none">YOU</div>}
      </div>

      <div className="flex justify-between items-center mt-auto">
        <span className="font-bold text-white uppercase text-sm truncate max-w-[140px] leading-none">
          {player.playerName || player.username || 'Unknown'}
        </span>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isPlayerReady ? 'border-[#fa7000] bg-[#fa7000]' : 'border-slate-700'
        }`}>
          {isPlayerReady && <span className="material-symbols-outlined text-black text-[14px] font-bold">check</span>}
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
  const { myId, addLog, maxPlayers = 4, chatLogs, playerName } = useGameStore(); 
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    // 💡 修正: エラー変数が未使用の場合、アンダースコア（_）を付けるか省略する
    try { SoundManager.playBgm('lobby'); } catch (_e) {} 
  }, []);

  useEffect(() => {
    const currentCount = players.length;
    const isRoomFull = currentCount > 0 && currentCount === maxPlayers;
    const allReady = currentCount > 0 && players.every((p) => p.isReady === true || p.ready === true);
    
    if (isRoomFull && allReady) {
      addLog("🚀 分隊全員のリンク承認。神託フェーズへ移行します。");
      onStart(); 
    }
  }, [players, maxPlayers, onStart, addLog]);

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
    
    socket.emit(CLIENT_EVENTS.READY_TO_START, { 
      roomId, 
      ready: nextReadyState 
    });
  };

  const handleCopyId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddNPC = () => {
    socket.emit(CLIENT_EVENTS.ADD_NPC || 'add_npc_request', { roomId });
  };

  return (
    <div className="font-body antialiased overflow-hidden h-screen flex flex-col bg-[#020617] text-[#f8fafc] relative">
      <style>{`
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
      
      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} onAbort={onAbort} />

      <main className="flex-1 mt-16 flex relative overflow-hidden min-h-0">
        <section className="flex-1 flex flex-col p-8 z-10 max-w-7xl mx-auto w-full min-h-0 justify-between">
          
          <div className="flex justify-between items-end mb-6 shrink-0">
            <div className="text-left">
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic leading-none">WAITING...</h1>
              <div className="flex items-center gap-2 text-[#fa7000] font-black uppercase tracking-widest text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fa7000] animate-pulse"></div>
                Tactical link synchronization
              </div>
            </div>
            
            <div className="flex gap-10">
              <div className="text-right leading-none border-r border-white/10 pr-10 cursor-pointer group" onClick={handleCopyId}>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Network ID</p>
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-3xl font-black text-[#f8fafc] tracking-wider uppercase font-mono">{roomId}</p>
                  <span className={`material-symbols-outlined text-sm ${copied ? 'text-green-500' : 'text-slate-500 group-hover:text-[#fa7000]'}`}>{copied ? 'check' : 'content_copy'}</span>
                </div>
              </div>
              <div className="text-right leading-none">
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Squad Capacity</p>
                <p className="text-3xl font-black text-white">{players.length} <span className="text-[#fa7000]">/ {maxPlayers}</span></p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-0 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-fit mx-auto content-center p-2 shrink-0">
              {players.map((p, idx) => (
                <PlayerCard key={p.id || `player-${idx}`} player={p} isMe={p.id === myId} isHost={idx === 0} />
              ))}
              {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
                <button key={`empty-${i}`} onClick={handleAddNPC} className="glass-panel p-4 rounded-xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center h-48 w-64 shrink-0 text-slate-600 hover:text-[#fa7000] hover:border-[#fa7000]/50 transition-all group">
                  <span className="material-symbols-outlined text-4xl mb-2 group-hover:scale-110 transition-transform">add</span>
                  <p className="text-xs font-bold uppercase tracking-widest">Deploy NPC</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 mb-2 items-end">
            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col h-64 border-slate-800 shadow-2xl">
              <div ref={scrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto text-sm custom-scrollbar text-left font-mono">
                {chatLogs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className={`${log.sender === (playerName || 'Operator') ? 'text-cyan-400' : 'text-[#fa7000]'} font-bold`}>{log.sender}:</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-950/50 border-t border-slate-800 shrink-0">
                <div className="relative flex items-center">
                  <input className="w-full bg-slate-900 border-slate-800 rounded-lg py-2 px-4 text-sm focus:ring-[#fa7000] focus:border-[#fa7000] text-slate-200 outline-none" placeholder="Transmit tactical data..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}/>
                  <button onClick={handleSendMessage} className="absolute right-2 text-[#fa7000] hover:text-orange-400 transition-colors">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="glass-panel rounded-xl overflow-hidden flex flex-col border-slate-800 shadow-2xl shrink-0">
                <div className="p-4 flex flex-col gap-3 text-left">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Map Sector</p>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">Cebu Island</h3>
                  <div className="h-32 w-full rounded-lg overflow-hidden relative border border-slate-800 bg-slate-950 shrink-0">
                    <img alt="Map" className="w-full h-full object-cover grayscale brightness-75 opacity-50" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBirgWsIn47L0BozujaAOP9MPDSEj8eEqOD5ehGypotryAQyqA3LP7lycOy2aqSikaVPBmPBSUc0dM925SZitvjIXt5w4Af_Rg1AhwYS6kF2STerNUC5_iMPz_J3UbNW9cwmiLBMcMg3Y8VEL-erCj5K55O7sQ9mtBGNeWpbh7MWURfLi2TPY5VBElxvM4f7A7fHG7C_6MiywcCoGzxjY-ONOK9E5GLIhM0PTnlqbdpTXWiXxFZEvg4SVjeivIEAixwp29-eA3k9r8" />
                  </div>
                </div>
              </div>
              <button 
                onClick={handleReady}
                className={`w-full h-[52px] rounded-xl font-black text-xl uppercase transition-all transform active:scale-95 shadow-lg shrink-0 ${
                  isReady ? 'bg-slate-800 text-[#fa7000] border-2 border-[#fa7000]' : 'bg-[#fa7000] hover:bg-orange-600 text-black'
                }`}
              >
                {isReady ? 'LINK LOCKED' : 'READY UP'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LobbyView;