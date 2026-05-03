import React, { useState, useEffect, useRef, memo } from 'react';
import socket from '../socket';
import { useGameStore, Player } from '../store';
import SoundManager from '../game/SoundManager';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

/**
 * 🚀 PlayerCard: デザインを [image_51c74f.jpg] に完全固定
 */
const PlayerCard = memo(({ player, isMe, isHost }: { player: Player; isMe: boolean; isHost: boolean }) => {
  return (
    <div className={`glass-panel p-5 rounded-2xl border-l-4 flex flex-col gap-4 group transition-all duration-300 h-[280px]
      ${player.isReady ? 'border-l-[#fa7000] bg-orange-950/20 shadow-[0_0_30px_rgba(250,112,0,0.1)]' : 'border-l-slate-700 opacity-90'}`}>
      
      <div className="relative overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center flex-1 border border-white/5 shadow-inner">
        <img 
          className={`h-full w-full object-cover transition-all duration-700 ${player.isReady ? 'grayscale-0 scale-100' : 'grayscale opacity-30 scale-110'}`} 
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.playerName || player.id}`} 
          alt="Avatar" 
        />
        {isHost && <div className="absolute top-3 right-3 px-3 py-1 bg-[#fa7000] text-[10px] font-black text-black rounded-full uppercase shadow-lg font-fix">HOST</div>}
        {isMe && <div className="absolute top-3 left-3 px-3 py-1 bg-cyan-600 text-[10px] font-black text-white rounded-full border border-cyan-400/30 uppercase shadow-lg font-fix">YOU</div>}
      </div>

      <div className="flex justify-between items-center text-left">
        <div className="flex flex-col text-left">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#fa7000] leading-none mb-1 font-fix">Operator ID</span>
          <span className="font-black text-white uppercase text-lg truncate max-w-[180px] font-fix">
            {player.playerName || player.username || "Unknown"}
          </span>
        </div>
        <span className={`material-symbols-outlined text-2xl ${player.isReady ? 'text-[#fa7000] animate-pulse' : 'text-slate-700'}`}>
          {player.isReady ? 'verified_user' : 'radio_button_unchecked'}
        </span>
      </div>
    </div>
  );
});

interface LobbyViewProps {
  roomId: string;
  players: Player[];
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

  useEffect(() => { SoundManager.playBgm('lobby'); }, []);

  useEffect(() => {
    const allReady = players.length >= 2 && players.every((p) => p.isReady);
    if (allReady) {
      addLog("🚀 分隊全員のリンク承認。出撃フェーズへ移行。");
      onStart(); 
    }
  }, [players, onStart, addLog]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatLogs]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      // 🚀 修正: 送信時に store の playerName が空なら、フォールバックとして localStorage や "Operator" を使用
      const senderName = playerName || localStorage.getItem('cebu_player_name') || 'Operator';
      socket.emit(CLIENT_EVENTS.SEND_CHAT, { roomId, message: chatInput, sender: senderName });
      setChatInput(''); 
      try { SoundManager.playSe('click'); } catch {}
    }
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

  const handleAddNPC = () => {
    socket.emit('add_npc_request', { roomId });
  };

  const emptySlotsCount = Math.max(0, maxPlayers - players.length);

  return (
    <div className="font-body antialiased overflow-hidden h-screen flex flex-col bg-[#020617] text-slate-100 text-left">
      <style>{`
        .glass-panel { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fa7000; border-radius: 10px; }
        .font-fix { line-height: 1.1; }
        .scanning-line {
          height: 1px; background: #fa7000; box-shadow: 0 0 10px #fa7000;
          position: absolute; width: 100%; top: 0; animation: scan 3s linear infinite; opacity: 0.3;
        }
        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      
      {/* 🚀 Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-6 bg-transparent">
        <div className="flex items-center gap-6">
          <span className="text-2xl font-black text-[#fa7000] uppercase tracking-tighter font-fix">CEBU CONQUEST</span>
          <div className={`flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-full border border-orange-500/20`}>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isServerOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-[9px] font-black tracking-widest uppercase opacity-80 font-fix">Link Status: {isServerOnline ? 'Established' : 'Lost'}</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={onOpenRanking} className="text-slate-500 hover:text-white p-2 transition-all"><span className="material-symbols-outlined">leaderboard</span></button>
          <button onClick={onOpenHelp} className="text-slate-500 hover:text-white p-2 transition-all"><span className="material-symbols-outlined">help</span></button>
          <button onClick={onOpenSettings} className="text-slate-500 hover:text-white p-2 transition-all"><span className="material-symbols-outlined">settings</span></button>
          <button onClick={onAbort} className="text-red-500 hover:text-red-400 font-black text-[10px] tracking-widest px-4 py-2 border border-red-900/30 rounded-lg transition-all font-fix uppercase">Abort</button>
        </div>
      </header>

      <main className="flex-1 mt-20 flex relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img className="w-full h-full object-cover opacity-20 grayscale brightness-50" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy79U2oxPTl4h3kZSWKBEFllpGrV2hx-9--QwNRhAdbZOpbuBUDQGi7F5z4r9WZ2BhDY2W8x7BHtKuQAoPjpEqhCG49WD5ZVmHtDHtVz4mkXQ_MaGKxtbY3VyhOqKg4ZNbTKqK7k9_nJtIaXs8rewZF7yv3o_mKGro-VDW3C1sbwTN7iKo_zDSU9gaVr7nMuRqg1wqeF9kqq7DOHmufijY6N2h37obz4xHVriUUAqhp7Sj-T511Me2vCq28cg80c-km6f_4mEkk70" alt=""/>
        </div>

        <section className="flex-1 flex flex-col p-8 z-10 overflow-y-auto w-full custom-scrollbar">
          <div className="flex justify-between items-end mb-12 max-w-7xl mx-auto w-full">
            <div className="text-left">
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase italic font-fix">LOBBY...</h1>
              <div className="flex items-center gap-2 text-[#fa7000] font-black uppercase tracking-[0.3em] text-[10px] animate-pulse font-fix">
                <div className="w-2 h-2 rounded-full bg-[#fa7000]"></div>
                Waiting for tactical synchronization
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-4 mb-3 px-6 py-2 rounded-xl bg-orange-950/20 border border-[#fa7000]/30 cursor-pointer group transition-all hover:border-[#fa7000] shadow-2xl" onClick={handleCopyId}>
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-[-2px]">Network ID</span>
                    <span className="text-2xl font-black text-white tracking-[0.2em] font-mono">{roomId || "------"}</span>
                </div>
                <span className={`material-symbols-outlined text-xl ${copied ? 'text-green-500' : 'text-slate-600 group-hover:text-[#fa7000]'}`}>{copied ? 'check' : 'content_copy'}</span>
              </div>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black font-fix">Capacity: <span className="text-white text-lg ml-2">{players.length} / {maxPlayers}</span></p>
            </div>
          </div>

          <div className={`grid gap-6 mb-12 items-stretch mx-auto w-full
            ${maxPlayers <= 2 ? 'max-w-4xl grid-cols-2' : maxPlayers === 3 ? 'max-w-6xl grid-cols-3' : 'max-w-7xl grid-cols-4'}`}>
            {players.map((p, idx) => (
              <PlayerCard key={p.id} player={p} isMe={p.id === myId} isHost={idx === 0} />
            ))}
            {Array.from({ length: emptySlotsCount }).map((_, i) => (
              <div key={`empty-${i}`} className="glass-panel p-5 rounded-2xl border-2 border-dashed border-slate-800 h-[280px] flex flex-col items-center justify-center gap-4 opacity-40 group hover:opacity-100 hover:border-orange-500/40 transition-all">
                <span className="text-slate-600 font-black text-[10px] tracking-widest uppercase font-fix group-hover:text-orange-500/70">Awaiting Operator...</span>
                <button onClick={handleAddNPC} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-black text-slate-500 hover:text-[#fa7000] hover:border-[#fa7000] transition-all font-fix">
                  <span className="material-symbols-outlined text-sm">smart_toy</span>
                  ADD NEURAL BOT
                </button>
              </div>
            ))}
          </div>

          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
            <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden flex flex-col h-72 border-white/5 shadow-2xl relative">
              <div className="scanning-line"></div>
              <div ref={scrollRef} className="flex-1 p-6 space-y-3 overflow-y-auto text-[12px] custom-scrollbar font-mono text-left">
                {chatLogs.length === 0 ? (
                  <p className="text-slate-700 italic">{'>> '} Tactical channel initialized. Encryption active...</p>
                ) : (
                  chatLogs.map((msg, i) => (
                    <div key={i} className="flex gap-3 leading-tight animate-fadeIn">
                      {/* 🚀 修正箇所: 受信した msg.sender を表示し、空なら "Unknown" と出す */}
                      <span className={`font-black uppercase shrink-0 ${msg.sender === (playerName || localStorage.getItem('cebu_player_name')) ? 'text-cyan-400' : 'text-[#fa7000]'}`}>
                        {(msg.sender || "Unknown")}:
                      </span>
                      <span className="text-slate-300 break-words font-fix text-left">{msg.message}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-slate-950/80 border-t border-white/5 flex gap-3">
                <input className="flex-1 bg-transparent border-none text-sm text-slate-200 outline-none focus:ring-0 font-fix text-left" placeholder="Transmit tactical data..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}/>
                <button onClick={handleSendMessage} className="text-[#fa7000] material-symbols-outlined text-3xl">send</button>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 border-white/5 shadow-2xl">
                <div className="text-left">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Target Sector</span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic font-fix">CEBU ARCHIPELAGO</h3>
                </div>
                <div className="h-28 rounded-xl overflow-hidden relative border border-white/5">
                  <img className="w-full h-full object-cover grayscale brightness-75 contrast-125" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBirgWsIn47L0BozujaAOP9MPDSEj8eEqOD5ehGypotryAQyqA3LP7lycOy2aqSikaVPBmPBSUc0dM925SZitvjIXt5w4Af_Rg1AhwYS6kF2STerNUC5_iMPz_J3UbNW9cwmiLBMcMg3Y8VEL-erCj5K55O7sQ9mtBGNeWpbh7MWURfLi2TPY5VBElxvM4f7A7fHG7C_6MiywcCoGzxjY-ONOK9E5GLIhM0PTnlqbdpTXWiXxFZEvg4SVjeivIEAixwp29-eA3k9r8" alt="" />
                  <div className="absolute inset-0 bg-orange-600/10 mix-blend-overlay animate-pulse"></div>
                </div>
              </div>
              <button 
                onClick={handleReady} 
                className={`w-full font-black py-5 rounded-2xl transition-all transform active:scale-95 uppercase text-2xl tracking-widest border-b-4 shadow-2xl font-fix
                  ${isReady 
                    ? 'bg-slate-800 text-[#fa7000] border-[#fa7000] shadow-orange-900/20' 
                    : 'bg-[#fa7000] text-slate-950 border-orange-800 hover:bg-orange-500 hover:border-orange-700 shadow-orange-950/40'}`}
              >
                {isReady ? 'LINK LOCKED' : 'READY UP'}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-4 px-10 flex justify-between items-center bg-slate-950 border-t border-white/5 z-50">
        <div className="flex items-center gap-4 font-fix">
          <span className="text-[#fa7000] text-[10px] font-black uppercase tracking-widest">Cebu Conquest Tac-Net v3.1</span>
          <div className="h-3 w-[1px] bg-slate-800"></div>
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">© 2026 Batch21-AM Deployment</p>
        </div>
      </footer>
    </div>
  );
};