// src/components/WaitingView.tsx
// (いっせいさんの提示したコードをそのまま採用)
import React, { useState, useEffect, useRef, memo } from 'react';
import { useGameStore, Player } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

/**
 * 🛡️ 内部定数：画像のデザインに合わせた神々のデータ
 */
const GOD_TRAITS: Record<number, { name: string; img: string; icon: string }> = {
  1: { name: "LAPU-LAPU", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDM6_rZpC_4I_U-rSInUoYVreK68Y_OqPof_8S07hKnd6H4n7Y7-4rYVvP7W5_R9Zz-eZ2_f4R8E6h7V_r_v6P_Qz-R_z-e", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=1" },
  2: { name: "MACTAN",    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC7_Y7-4rYVvP7W5_R9Zz-eZ2_f4R8E6h7V_r_v6P_Qz-R_z-e", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=2" },
  3: { name: "APO LAKI",  img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8E6h7V_r_v6P_Qz-R_z-eR6z-eZ2_f4R8E6h7V_r_v6P_Qz-R_z-e", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=3" },
  4: { name: "LUMAWIG",   img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_v6P_Qz-R_z-eR6z-eZ2_f4R8E6h7V_r_v6P_Qz-R_z-e", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=4" },
  5: { name: "EDUARDO",   img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=600", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=5" },
  6: { name: "KURT",      img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=600", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=6" },
  7: { name: "STEPHEN",   img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=600", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=7" },
  8: { name: "BERNARDINE", img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=600", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=8" },
};

const PlayerCard = memo(({ player, isMe, isHost }: { player: Player; isMe: boolean; isHost: boolean }) => {
  const godId = player.selectedGodId || player.godId;
  const god = godId ? GOD_TRAITS[godId] : null;
  const isReady = !!godId;

  return (
    <div className={`relative flex flex-col bg-[#0f172a]/60 border-t-2 rounded-xl overflow-hidden transition-all duration-500 h-[300px] w-full
      ${isReady ? 'border-orange-500 shadow-[0_10px_30px_rgba(249,115,22,0.15)]' : 'border-slate-800 opacity-60'}`}>
      <div className="relative h-44 w-full overflow-hidden bg-slate-950">
        <img 
          className={`h-full w-full object-cover transition-all duration-1000 ${isReady ? 'grayscale-0 scale-100' : 'grayscale brightness-50 scale-110'}`} 
          src={god ? god.img : `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`} 
          alt="Visual" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60"></div>
        {isHost && <div className="absolute top-3 right-3 px-2 py-0.5 bg-orange-500 text-[9px] font-black text-black rounded uppercase tracking-tighter shadow-lg font-fix text-center">HOST</div>}
        {isMe && <div className="absolute top-3 right-3 px-2 py-0.5 bg-cyan-500 text-[9px] font-black text-white rounded uppercase tracking-tighter shadow-lg font-fix text-center">YOU</div>}
      </div>

      <div className="p-5 flex flex-col flex-1 bg-[#0f172a]/80">
        <div className="flex justify-between items-center mb-4">
          <span className="font-black text-white uppercase text-sm tracking-widest font-fix text-left">{player.playerName || player.username || "UNKNOWN"}</span>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isReady ? 'border-orange-500 bg-orange-500' : 'border-slate-700'}`}>
            {isReady && <span className="material-symbols-outlined text-[12px] text-black font-black">check</span>}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full border border-white/10 overflow-hidden bg-black shadow-inner">
            {god && <img src={god.icon} className="w-full h-full object-cover animate-fadeIn" alt="" />}
            {!god && <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-700">?</div>}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em] leading-none mb-1 opacity-80 text-left">Guardian God</span>
            <span className="text-[11px] font-black text-white uppercase tracking-wider font-fix truncate max-w-[120px] text-left">
              {god ? god.name : "Awaiting..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

interface WaitingViewProps {
  onStart: () => void;
}

export const WaitingView: React.FC<WaitingViewProps> = ({ onStart }) => {
  const { players, myId, chatLogs, roomId, playerName, maxPlayers } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleReadyClick = () => {
    setIsLocked(true);
    onStart(); 
    try { SoundManager.playSe('click'); } catch {}
  };

  const totalSlots = maxPlayers || 2;
  const readyCount = players.filter(p => p.selectedGodId || p.godId).length;
  const syncPercentage = Math.floor((readyCount / totalSlots) * 100);
  const isAllReady = readyCount >= totalSlots && totalSlots > 0;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const senderName = playerName || localStorage.getItem('cebu_player_name') || 'Operator';
    socket.emit(CLIENT_EVENTS.SEND_CHAT, { roomId, message: chatInput, sender: senderName });
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSendMessage();
  };

  return (
    <div className="font-body antialiased overflow-hidden h-screen flex flex-col bg-[#050814] text-slate-100 text-left">
      <style>{`
        .font-fix { line-height: 1; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .sync-pulse { animation: sync-pulse 2s infinite; }
        @keyframes sync-pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      `}</style>

      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-10 py-8 bg-transparent">
        <span className="text-2xl font-black text-[#fa7000] uppercase tracking-tighter font-fix">CEBU CONQUEST</span>
        <div className="flex items-center gap-6">
          <div className="px-3 py-1 bg-cyan-950/30 border border-cyan-500/30 rounded-full text-[10px] font-black text-cyan-400 tracking-widest uppercase flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
            Neural Link: Stable
          </div>
        </div>
      </header>

      <main className="flex-1 mt-24 flex relative overflow-hidden">
        <section className="flex-1 flex flex-col p-10 z-10 overflow-y-auto w-full custom-scrollbar text-left">
          <div className="flex justify-between items-end mb-4 max-w-7xl mx-auto w-full text-left">
            <div className="text-left">
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase italic font-fix text-left">
                {isAllReady ? "DEPLOYMENT READY" : "TACTICAL SYNC"}
              </h1>
              <p className="text-orange-500 text-[11px] font-black uppercase tracking-[0.4em] animate-pulse font-fix text-left">
                ● {isAllReady ? "All Units Linked. Awaiting Signal..." : "Synchronizing neural link to squad..."}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black mb-1 text-right">Squad Connectivity</p>
              <p className={`text-4xl font-black ${isAllReady ? 'text-cyan-400' : 'text-white'} text-right`}>
                {readyCount} / {totalSlots} <span className="text-cyan-500 text-sm ml-1 font-fix tracking-normal text-right">UNITS</span>
              </p>
            </div>
          </div>

          <div className="w-full max-w-7xl mx-auto h-1.5 bg-slate-900 rounded-full mb-12 overflow-hidden border border-white/5 text-left">
            <div className={`h-full transition-all duration-1000 shadow-[0_0_15px] ${isAllReady ? 'bg-cyan-400 shadow-cyan-500' : 'bg-orange-500 shadow-orange-500'}`} style={{ width: `${syncPercentage}%` }}></div>
          </div>

          <div className={`grid gap-6 mb-12 items-stretch mx-auto w-full text-left
            ${totalSlots <= 2 ? 'max-w-4xl grid-cols-2' : totalSlots === 3 ? 'max-w-6xl grid-cols-3' : 'max-w-7xl grid-cols-4'}`}>
            {players.map((player: Player) => (
              <PlayerCard key={player.id} player={player} isMe={player.id === myId} isHost={player.id === players[0]?.id} />
            ))}
          </div>

          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full text-left">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden flex flex-col h-64 border border-white/5 shadow-2xl relative bg-slate-950/40 backdrop-blur-md text-left">
              <div className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar font-mono text-[12px] text-left">
                {chatLogs?.length === 0 ? (
                  <p className="text-slate-700 italic text-left">{'>> '} Tactical link established. Encryption active.</p>
                ) : (
                  chatLogs.map((chat, i) => {
                    const myStoredName = localStorage.getItem('cebu_player_name');
                    const isMeMsg = chat.sender === playerName || chat.sender === myStoredName;
                    return (
                      <div key={i} className="flex gap-3 leading-tight animate-fadeIn text-left">
                        <span className={`font-black uppercase shrink-0 ${isMeMsg ? 'text-cyan-400' : 'text-[#fa7000]'} text-left`}>
                          {chat.sender}:
                        </span>
                        <span className="text-slate-300 break-words tracking-tight text-left">{chat.message}</span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-black/40 border-t border-white/5 text-left">
                <input className="w-full bg-transparent border-none text-sm text-slate-200 outline-none focus:ring-0 font-fix placeholder:text-slate-800 text-left" placeholder="TRANSMIT MESSAGE..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown}/>
              </div>
            </div>

            <div className="flex flex-col gap-6 text-left">
              <div className="rounded-2xl p-6 flex flex-col gap-4 bg-slate-900/60 border border-white/5 h-full text-left">
                <div className="text-left">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix text-left">Location</span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic font-fix text-left">Around Cebu</h3>
                </div>
                <div className="h-24 rounded-xl overflow-hidden relative border border-white/5 bg-black text-left">
                  <img className="w-full h-full object-cover grayscale brightness-50 contrast-125 opacity-40 text-left" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy79U2oxPTl4h3kZSWKBEFllpGrV2hx-9--QwNRhAdbZOpbuBUDQGi7F5z4r9WZ2BhDY2W8x7BHtKuQAoPjpEqhCG49WD5ZVmHtDHtVz4mkXQ_MaGKxtbY3VyhOqKg4ZNbTKqK7k9_nJtIaXs8rewZF7yv3o_mKGro-VDW3C1sbwTN7iKo_zDSU9gaVr7nMuRqg1wqeF9kqq7DOHmufijY6N2h37obz4xHVriUUAqhp7Sj-T511Me2vCq28cg80c-km6f_4mEkk70" alt="" />
                </div>
                
                {!isLocked ? (
                  <button 
                    onClick={handleReadyClick} 
                    disabled={!isAllReady}
                    className={`w-full py-5 rounded-xl font-black uppercase tracking-[0.3em] text-sm transition-all transform active:scale-95 shadow-2xl font-fix text-center
                    ${isAllReady 
                        ? 'bg-orange-600 text-white shadow-orange-950/40 hover:bg-orange-500' 
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
                  >
                    {isAllReady ? 'READY?' : 'WAITING...'}
                  </button>
                ) : (
                  <div className="w-full py-5 rounded-xl bg-cyan-950/20 border border-cyan-500/50 flex flex-col items-center justify-center sync-pulse shadow-2xl text-center">
                    <span className="text-cyan-400 font-black uppercase tracking-[0.3em] text-sm text-center">LOCKED & LOADING</span>
                    <span className="text-[8px] text-cyan-400/60 font-bold uppercase mt-1 tracking-widest text-center">Finalizing War-Net Sync</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-5 px-10 flex justify-between items-center bg-black/80 border-t border-white/5 z-50 text-left">
        <div className="flex items-center gap-4 text-left">
          <span className="text-cyan-600 text-[10px] font-black uppercase tracking-widest font-fix text-left">CEBU CONQUEST TACTICAL SYSTEMS</span>
          <div className="h-3 w-[1px] bg-slate-800 text-left"></div>
          <p className="text-slate-700 text-[10px] font-bold uppercase font-fix text-left">© 2026 Batch21-AM Deployment Authority</p>
        </div>
      </footer>
    </div>
  );
};