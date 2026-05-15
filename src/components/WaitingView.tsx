/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useGameStore, Player, LobbyPlayer } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';
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

// 🚀 修正1：チャットメッセージの型を明示的に定義（any 回避）
interface ChatData {
  sender: string;
  message: string;
  timestamp?: string | number;
}

const GOD_TRAITS: Record<number, { name: string; img: string; icon: string; role: string; desc: string }> = {
  1: { name: "Neil",       img: "/assets/images/gods/Neil.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=1", role: "High Commander", desc: "初期HPを大幅に強化し、盤面の維持能力を高める。" },
  2: { name: "Garry",      img: "/assets/images/gods/Garry.png",      icon: "https://api.dicebear.com/7.x/identicon/svg?seed=2", role: "War Lord", desc: "圧倒的な攻撃力を付与し、敵陣地への侵攻を容易にする。" },
  3: { name: "Shem",       img: "/assets/images/gods/Shem.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=3", role: "Tactical Mind", desc: "HPとAPのバランスを整え、手数を増やす戦術に長ける。" },
  4: { name: "Quisie",     img: "/assets/images/gods/Quisie.png",     icon: "https://api.dicebear.com/7.x/identicon/svg?seed=4", role: "Berserker", desc: "HPを犠牲に、極限の火力を引き出すハイリスク・ハイリターン型。" },
  5: { name: "Eduardo",    img: "/assets/images/gods/Eduardo.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=5", role: "Iron Shield", desc: "防御力を極限まで高め、敵の反撃を無力化する守備の要。" },
  6: { name: "Kurt",       img: "/assets/images/gods/Kurt.png",       icon: "https://api.dicebear.com/7.x/identicon/svg?seed=6", role: "Assassin", desc: "低HPながら隠密性に優れ、隙を突いた一撃を得意とする。" },
  7: { name: "Stephen",    img: "/assets/images/gods/Stephen.png",    icon: "https://api.dicebear.com/7.x/identicon/svg?seed=7", role: "Oracle", desc: "信仰心の回復を促進し、神の加護を常に受け続けるパッシブを持つ。" },
  8: { name: "Bernardine", img: "/assets/images/gods/Bernardine.png", icon: "https://api.dicebear.com/7.x/identicon/svg?seed=8", role: "Energy Core", desc: "最大APを大幅に底上げし、1ターン内での連続行動を可能にする。" },
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
      className={`glass-panel p-4 rounded-xl border-l-4 flex flex-col gap-3 group transition-all duration-500 h-48 w-full shrink-0 relative overflow-visible ${
        isPlayerReady ? 'border-l-[#fa7000] bg-orange-950/10 shadow-[0_0_20px_rgba(250,112,0,0.1)]' : 'border-l-slate-800 bg-slate-900/40 opacity-90'
      }`}
      style={{
        background: `radial-gradient(circle at top right, ${isPlayerReady ? 'rgba(250, 112, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)'}, transparent 70%), rgba(15, 23, 42, 0.8)`
      }}
    >
      <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center border border-white/5">
        {!god ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80">
            <span className="material-symbols-outlined text-3xl text-slate-700 mb-1 animate-pulse">fingerprint</span>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] font-fix">Syncing God...</p>
          </div>
        ) : (
          <img 
            className={`w-full h-full object-cover object-top transition-all duration-700 cursor-help ${!isPlayerReady ? 'opacity-40 grayscale blur-[1px]' : 'opacity-100 grayscale-0 blur-0'}`} 
            src={god.img} 
            alt="God Portrait"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ filter: isPlayerReady ? 'none' : undefined }}
          />
        )}
        {isHost && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#fa7000] text-[7px] font-black text-black rounded uppercase shadow-lg z-10 font-fix">HOST</div>}
        {isMe && <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/90 text-[7px] font-black text-[#fa7000] rounded border border-[#fa7000]/30 uppercase z-10 font-fix">YOU</div>}
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
                {isNpc ? (
                  <div className="w-6 h-6 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px] text-cyan-500">smart_toy</span>
                  </div>
                ) : (
                  <img className="w-6 h-6 rounded-full border border-[#fa7000]/50 object-cover" src={god?.icon} alt="" />
                )}
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
  const { players, lobbyPlayers, myId, chatLogs, roomId, playerName, maxPlayers, selectedGodId, addChatLog, playerAvatar } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 🚀 修正2：ChatData 型を使用し、any 警告を解消
  useEffect(() => {
    const handleReceiveMessage = (data: ChatData) => {
      addChatLog(data); 
    };
    socket.on(SERVER_EVENTS.CHAT_MESSAGE, handleReceiveMessage);
    return () => {
      socket.off(SERVER_EVENTS.CHAT_MESSAGE, handleReceiveMessage);
    };
  }, [addChatLog]);

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
    
    // 🚀 チャット2重送信防止のため emit のみ行う
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
      `}</style>
      
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} onAbort={onAbort} />

      <main className="flex-1 mt-16 flex flex-col relative overflow-hidden min-h-0">
        <section className="flex-1 flex flex-col py-4 px-6 md:px-8 z-10 max-w-7xl mx-auto w-full min-h-0 gap-4">
          
          <div className="flex justify-between items-end shrink-0 text-left">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-white mb-1 tracking-tighter italic uppercase font-fix">Ready for Uplink</h1>
              <div className="flex items-center gap-2 text-[#fa7000] font-black uppercase tracking-widest text-[10px] lg:text-[11px] font-fix">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fa7000] animate-pulse shadow-[0_0_10px_#fa7000]"></div>
                Squad Synchronization active
              </div>
            </div>
            <div className="flex items-baseline gap-4 lg:gap-10 text-right leading-none">
              <p className="text-2xl lg:text-3xl font-black text-white font-fix">
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
                <div key={`empty-${index}`} className="glass-panel rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2 h-48 w-full opacity-30">
                  <span className="material-symbols-outlined text-4xl text-slate-700">person_add</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-fix">Awaiting Operator</span>
                </div>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2 text-left">
            <div className="lg:col-span-8 flex flex-col gap-4 h-full">
               <div className="glass-panel rounded-xl flex flex-col border-slate-800 shadow-2xl flex-1 min-h-0 p-4">
                  <SectionHeader title="Mission Sector" sub="Deployment Area Details" />
                  <div className="flex-1 min-h-[100px] w-full rounded-lg overflow-hidden relative border border-white/5 bg-slate-950">
                    <img alt="Map" className="w-full h-full object-cover opacity-60" src="https://images.unsplash.com/photo-1518107616385-ad302215a9a8" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-[10px] font-mono text-[#fa7000] font-black uppercase bg-black/60 px-4 py-1 rounded border border-[#fa7000]/30 shadow-xl">Tactical Map Alpha-21</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-full border-slate-800 shadow-2xl">
                <div className="p-3 border-b border-white/5 bg-slate-950/50 text-left flex justify-between items-center">
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Tactical Comms</span>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto text-xs custom-scrollbar font-mono bg-slate-950/20 text-left">
                  {chatLogs.map((log, i) => (
                    <div key={`chat-${i}`} className="flex flex-col gap-1 animate-fadeIn">
                      <span className={`${log.sender === (playerName || 'Operator') ? 'text-cyan-400' : 'text-[#fa7000]'} font-black text-[10px]`}>{log.sender}:</span>
                      <span className="text-slate-300 break-words leading-relaxed pl-1">{log.message}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 bg-slate-950/50 border-t border-white/5">
                  <div className="relative flex items-center">
                    <input className="w-full bg-slate-900 border-slate-800 rounded-lg py-2 px-4 text-xs focus:ring-[#fa7000] text-slate-200 outline-none font-mono" placeholder="Send signal..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}/>
                    <button onClick={handleSendMessage} className="absolute right-2 text-[#fa7000] hover:text-orange-400 transition-colors"><span className="material-symbols-outlined text-sm">send</span></button>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleReadyClick}
                className={`w-full h-[70px] flex flex-col items-center justify-center rounded-xl transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-[2px] shadow-lg shrink-0
                ${isLocked 
                  ? 'bg-slate-800 border-slate-950 text-[#fa7000] opacity-80' 
                  : 'bg-gradient-to-r from-orange-600 to-orange-500 border-orange-800 text-black font-black hover:brightness-110'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{isLocked ? 'lock_open' : 'bolt'}</span>
                  <span className="text-2xl font-black italic tracking-tighter uppercase font-fix">{isLocked ? 'CANCEL READY' : 'DEPLOY SQUAD'}</span>
                </div>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const SectionHeader = ({ title, sub }: { title: string, sub: string }) => (
  <div className="mb-3 text-left">
    <h3 className="text-lg font-black text-white uppercase italic leading-none">{title}</h3>
    <p className="text-[#fa7000] text-[8px] font-bold uppercase tracking-widest mt-1 opacity-70">{sub}</p>
  </div>
);

export default WaitingView;