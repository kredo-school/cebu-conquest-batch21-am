// src/components/WaitingView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
// ✅ 修正：ソケット通信とイベント定数を確実にインポート
import socket from '../socket';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

interface WaitingViewProps {
  onStart: () => void;
}

// 🛡️ 神の特性データマップ (UI表示用)
const GOD_TRAITS: Record<number, { name: string; traits: string[]; role: string; img: string }> = {
  1: { name: "Lapu-Lapu", role: "WAR GOD", traits: ["Attack +25%", "Morale Boost"], img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=100" },
  2: { name: "Sebuna", role: "STRATEGIST", traits: ["Defense Up", "Speed +15%"], img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=100" },
  3: { name: "Kredo", role: "WISDOM", traits: ["Solar Wrath", "Crit Rate +10%"], img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=100" },
  4: { name: "Mayari", role: "STEALTH", traits: ["Silent Steps", "Invisibility"], img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=100" },
  5: { name: "Lumawig", role: "HEAVY", traits: ["Earth Resilience", "Stamina +20%"], img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=100" },
  6: { name: "Hanuman", role: "SUPPORT", traits: ["Jump Boost", "Team Heal"], img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=100" },
  7: { name: "Bakunawa", role: "SHADOW", traits: ["Night Vision", "Shadow Meld"], img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=100" },
  8: { name: "Idanale", role: "RECON", traits: ["Resource Scan", "Footprint Tracker"], img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=100" },
};

export const WaitingView: React.FC<WaitingViewProps> = ({ onStart }) => {
  const { players, myId, chatLogs, maxPlayers, roomId, playerName } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 🚀 自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  // チャット送信処理
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit(CLIENT_EVENTS.SEND_CHAT, { 
      roomId: roomId, 
      message: chatInput 
    });
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleSendMessage();
    }
  };

  return (
    <div className="font-body antialiased overflow-hidden w-full h-full flex flex-col bg-slate-950 text-slate-50 selection:bg-orange-500/30">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; border-radius: 10px; }
        .font-fix { line-height: 1.1; }
      `}</style>

      {/* 📡 Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-950/90 border-b border-orange-900/30 shadow-2xl">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-orange-600 uppercase tracking-tight font-fix">Cebu Conquest</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{playerName} <span className="text-orange-600 font-black">Connected</span></span>
          <span className="material-symbols-outlined text-slate-400 hover:text-orange-500 cursor-pointer p-2 transition-colors">settings</span>
        </div>
      </header>

      <main className="flex-1 mt-16 flex relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 z-0">
          <img className="w-full h-full object-cover opacity-20 grayscale brightness-50" src="https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=1500" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        </div>

        <section className="flex-1 flex flex-col p-8 z-10 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
          {/* Status Header */}
          <div className="flex justify-between items-end mb-8">
            <div className="text-left">
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter font-fix uppercase">Tactical Lobby</h1>
              <p className="text-orange-600 font-bold uppercase tracking-widest text-sm font-fix italic animate-pulse">Syncing Squad Data...</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-white font-fix">{players.length} <span className="text-orange-600">/ {maxPlayers}</span></p>
            </div>
          </div>

          {/* 👥 Player Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {players.map((player) => {
              const isMe = player.id === myId;
              const godId = player.selectedGodId || player.godId;
              const god = godId ? GOD_TRAITS[godId] : null;

              return (
                <div key={player.id} className={`glass-panel p-4 rounded-xl border-l-4 flex flex-col gap-3 h-full shadow-2xl backdrop-blur-md transition-all ${god ? 'border-l-orange-600 bg-slate-900/40' : 'border-l-slate-700 bg-slate-900/20'}`}>
                  <div className="relative h-24 overflow-hidden rounded-lg bg-slate-950 border border-white/5">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.playerName || player.id}`} className={`w-full h-full object-cover ${god ? 'grayscale-0' : 'grayscale opacity-40'}`} alt="" />
                    {isMe && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-orange-600 text-[8px] font-black text-black rounded leading-none">YOU</div>}
                  </div>
                  <div className="flex justify-between items-center text-left">
                    <span className="font-black text-white uppercase tracking-tight truncate font-fix">
                      {player.playerName || player.username || "Unknown Op"}
                    </span>
                    <span className={`material-symbols-outlined text-sm ${god ? 'text-orange-600' : 'text-slate-700'}`}>check_circle</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💬 Chat Area：横一行のスタイリッシュ・レイアウト */}
          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col h-80 border border-slate-800 bg-slate-900/40 shadow-2xl">
              <div className="flex-1 p-5 space-y-1.5 overflow-y-auto custom-scrollbar bg-slate-950/20">
                <div className="border-b border-orange-500/10 pb-2 mb-3">
                  <p className="text-orange-500 font-black uppercase text-[10px] tracking-widest font-fix animate-pulse">[Neural Link: Established]</p>
                </div>
                {chatLogs && chatLogs.length > 0 ? (
                  chatLogs.map((chat, i) => {
                    const isMe = chat.sender === playerName;
                    return (
                      // ✅ 修正ポイント：flex items-baseline を使い、横一行にスッキリ配置
                      <div key={i} className="flex items-baseline gap-2 animate-fadeIn leading-tight group">
                        {/* タイムスタンプ */}
                        <span className="text-[9px] text-slate-600 font-mono shrink-0">
                          [{chat.timestamp || 'SYNC'}]
                        </span>
                        
                        {/* 名前：自分ならオレンジ、相手ならグレー */}
                        <span className={`text-[10px] font-black uppercase shrink-0 font-fix ${isMe ? 'text-orange-500' : 'text-slate-400'}`}>
                          {chat.sender || "Commander"} {isMe ? "(YOU)" : ""}:
                        </span>

                        {/* メッセージ本文：読みやすさ重視 */}
                        <span className="text-[11px] text-slate-200 break-words font-fix flex-1 min-w-0">
                          {chat.message}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 italic text-sm font-fix uppercase tracking-widest">Awaiting tactical data...</div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-slate-950/80 border-t border-slate-800">
                <div className="relative">
                  <input 
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-3 px-4 text-sm focus:ring-1 focus:ring-orange-600 text-slate-200 outline-none transition-all font-fix" 
                    placeholder="Broadcast to all units..." 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button onClick={handleSendMessage} className="absolute right-3 top-2.5 text-orange-600 hover:text-orange-400 active:scale-90 transition-all">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 🕹️ Button Area */}
            <div className="flex flex-col gap-4 justify-end">
              <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-left">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest font-fix">Neural Link</p>
                <h3 className="text-xl font-black text-white uppercase tracking-tight italic font-fix">Sector 07 Synchronized</h3>
              </div>
              <button 
                onClick={onStart}
                className="w-full font-black py-6 rounded-xl transition-all transform active:scale-95 uppercase text-3xl bg-orange-600 hover:bg-orange-500 text-white shadow-[0_10px_40px_rgba(234,88,12,0.4)] animate-pulse font-fix border-b-4 border-orange-800"
              >
                Deploy
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-2 px-8 flex justify-center bg-slate-950 border-t border-slate-800 text-[9px] text-slate-700 tracking-[0.4em] uppercase font-fix">
        Cebu Conquest System // Tactical Synchronization Active
      </footer>
    </div>
  );
};