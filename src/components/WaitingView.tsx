import React, { useState } from 'react';
import { useGameStore } from '../store';

interface WaitingViewProps {
  onStart: () => void;
}

// 🛡️ 神の特性データマップ
const GOD_TRAITS: Record<number, { name: string; traits: string[]; role: string; img: string }> = {
  1: { name: "Lapu-Lapu", role: "WAR GOD", traits: ["Attack +25%", "Morale Boost"], img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=100" },
  2: { name: "Mactan", role: "STRATEGIST", traits: ["Defense Up", "Speed +15%"], img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=100" },
  3: { name: "Apo Laki", role: "SOLAR", traits: ["Solar Wrath", "Crit Rate +10%"], img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=100" },
  4: { name: "Mayari", role: "STEALTH", traits: ["Silent Steps", "Invisibility"], img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=100" },
  5: { name: "Lumawig", role: "HEAVY", traits: ["Earth Resilience", "Stamina +20%"], img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=100" },
  6: { name: "Hanuman", role: "SUPPORT", traits: ["Jump Boost", "Team Heal"], img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=100" },
  7: { name: "Bakunawa", role: "SHADOW", traits: ["Night Vision", "Shadow Meld"], img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=100" },
  8: { name: "Idanale", role: "RECON", traits: ["Resource Scan", "Footprint Tracker"], img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=100" },
};

export const WaitingView: React.FC<WaitingViewProps> = ({ onStart }) => {
  // 🚀 修正：maxPlayers を Store から取得
  const { players, myId, chatLogs, maxPlayers } = useGameStore();
  const [chatInput, setChatInput] = useState('');

  return (
    <div className="font-body antialiased overflow-hidden w-full h-full flex flex-col bg-slate-950 text-slate-50 selection:bg-orange-500/30">
      <style>{`
        .god-tooltip {
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease-out;
          transform: translateY(0);
        }
        .god-area:hover .god-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateY(-8px);
        }
        .primary-glow {
          box-shadow: 0 0 15px rgba(250, 112, 0, 0.2);
        }
      `}</style>

      {/* 📡 Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-950/90 border-b border-orange-900/30">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-orange-600 uppercase tracking-tight font-fix">Cebu Conquest</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-slate-400 hover:text-orange-500 cursor-pointer p-2 rounded transition-colors">settings</span>
          <span className="material-symbols-outlined text-slate-400 hover:text-orange-500 cursor-pointer p-2 rounded transition-colors">person</span>
        </div>
      </header>

      <main className="flex-1 mt-16 flex relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover opacity-20 grayscale brightness-50" 
            src="https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=1500" 
            alt="" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        </div>

        <section className="flex-1 flex flex-col p-8 z-10 overflow-y-auto max-w-7xl mx-auto w-full custom-scrollbar">
          {/* Status Header */}
          <div className="flex justify-between items-end mb-8">
            <div className="text-left">
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter font-fix">WAITING...</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></div>
                <p className="text-orange-600 font-bold uppercase tracking-widest text-sm font-fix">Waiting for players to ready up</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs uppercase tracking-widest font-bold font-fix">Room Capacity</p>
              {/* 🚀 修正：/ 4 を / {maxPlayers} に変更し、Store と同期 */}
              <p className="text-4xl font-black text-white font-fix">{players.length} <span className="text-orange-600">/ {maxPlayers}</span></p>
            </div>
          </div>

          {/* 👥 Player Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-stretch">
            {players.map((player, idx) => {
              const isMe = player.id === myId;
              const isHost = idx === 0;
              const godId = player.selectedGodId || player.godId;
              const god = godId ? GOD_TRAITS[godId] : null;

              return (
                <div 
                  key={player.id} 
                  className={`glass-panel p-4 rounded-xl border-l-4 flex flex-col gap-3 group hover:bg-slate-900/80 transition-all h-full ${
                    god ? 'border-l-orange-600 primary-glow' : 'border-l-slate-700'
                  }`}
                >
                  <div className="relative h-32 overflow-hidden rounded-lg">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.playerName || player.id}`} 
                      className={`w-full h-full object-cover bg-slate-800 transition-all ${god ? 'grayscale-0' : 'grayscale'}`}
                      alt="" 
                    />
                    {isHost && <div className="absolute top-2 right-2 px-2 py-1 bg-orange-600 text-[10px] font-black text-black rounded leading-none font-fix">HOST</div>}
                    {isMe && <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900 text-[10px] font-black text-orange-500 rounded border border-orange-500/30 leading-none font-fix">YOU</div>}
                  </div>

                  <div className="flex justify-between items-center text-left">
                    <span className="font-black text-white uppercase tracking-tight truncate font-fix">{player.playerName || "Commander"}</span>
                    <span className={`material-symbols-outlined ${god ? 'text-orange-600' : 'text-slate-700'}`} style={{ fontVariationSettings: god ? "'FILL' 1" : "" }}>
                      {god ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>

                  {/* 🛡️ God Selection Area */}
                  <div className="relative god-area mt-auto pt-3 border-t border-slate-800 text-left">
                    {god ? (
                      <>
                        <div className="flex items-center gap-3">
                          <img src={god.img} className="w-10 h-10 rounded-full border border-orange-500/50 object-cover" alt="" />
                          <div>
                            <p className="text-[9px] text-orange-500/70 font-bold uppercase tracking-widest leading-none mb-1 font-fix">Guardian God</p>
                            <p className="text-xs font-black text-white uppercase tracking-tight font-fix">{god.name}</p>
                          </div>
                        </div>
                        <div className="god-tooltip absolute bottom-full left-0 mb-3 w-56 glass-panel p-4 rounded-xl z-20 border-orange-500/30 shadow-2xl">
                          <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-2 border-b border-orange-500/20 pb-1 font-fix">神の特性 (TRAITS)</p>
                          <ul className="text-[10px] text-slate-300 space-y-1.5">
                            {god.traits.map((t, i) => (
                              <li key={i} className="flex items-center gap-2 font-fix">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span> {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 opacity-30">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700"></div>
                        <p className="text-[10px] font-bold text-slate-500 italic uppercase font-fix">Selecting God...</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💬 Chat & Actions */}
          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col h-72 border-slate-800 shadow-2xl">
              <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                {chatLogs.length > 0 ? (
                  chatLogs.map((chat, i) => (
                    <div key={i} className="flex gap-2 text-sm text-left">
                      <span className="font-bold shrink-0 font-fix" style={{ color: chat.color || '#ea580c' }}>{chat.sender}:</span>
                      <span className="text-slate-300 break-words font-fix">{chat.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 italic text-sm font-fix">No tactical messages yet.</div>
                )}
              </div>
              <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                <div className="relative">
                  <input 
                    className="w-full bg-slate-900 border-slate-800 rounded-lg py-3 px-4 text-sm focus:ring-orange-600 focus:border-orange-600 text-slate-200 outline-none transition-all font-fix" 
                    placeholder="Type a tactical message..." 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button className="absolute right-3 top-2.5 text-orange-600 hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 🗺️ Map Preview & Ready Button */}
            <div className="flex flex-col gap-4">
              <div className="glass-panel rounded-xl overflow-hidden border-slate-800 shadow-2xl">
                <div className="p-4 flex flex-col gap-3 text-left">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest font-fix">Target Location</p>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic font-fix">MACTAN ARCHIPELAGO</h3>
                  </div>
                  <div className="h-36 rounded-lg overflow-hidden relative border border-slate-800">
                    <img 
                      alt="" 
                      className="w-full h-full object-cover grayscale brightness-75" 
                      src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=500"
                    />
                    <div className="absolute inset-0 bg-orange-600/10 mix-blend-overlay"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                       <div className="w-16 h-16 border-2 border-orange-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={onStart}
                className="w-full font-black py-5 rounded-xl transition-all transform active:scale-95 uppercase text-2xl bg-orange-600 hover:bg-orange-500 text-white shadow-[0_10px_30px_rgba(234,88,12,0.3)] animate-pulse font-fix"
              >
                READY?
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 🏁 Footer */}
      <footer className="w-full py-4 px-8 flex justify-between items-center bg-slate-950 border-t border-slate-800 z-50">
        <div className="flex items-center gap-4">
          <span className="text-orange-700 text-[10px] font-black uppercase tracking-widest font-fix">Cebu Conquest Tactical Systems</span>
          <div className="h-3 w-[1px] bg-slate-800"></div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-fix">© 2024 ISSEI COMMAND CENTER</p>
        </div>
        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span className="hover:text-orange-500 cursor-pointer transition-colors font-fix">Intel</span>
          <span className="hover:text-orange-500 cursor-pointer transition-colors font-fix">Support</span>
          <span className="hover:text-orange-500 cursor-pointer transition-colors font-fix">Privacy</span>
        </div>
      </footer>
    </div>
  );
};