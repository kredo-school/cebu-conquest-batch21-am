import React from 'react';
import { useGameStore } from '../store';

interface LobbyViewProps {
  roomId: string;
  players: any[];
}

export const LobbyView: React.FC<LobbyViewProps> = ({ roomId, players }) => {
  const setView = useGameStore((state) => (state as any).setView); // 画面遷移用

  return (
    <div className="bg-slate-950 font-body text-slate-200 antialiased overflow-hidden h-screen flex flex-col relative">
      {/* 🚀 背景画像エフェクト */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1506466010722-395aa2bef877?auto=format&fit=crop&q=80&w=2000" 
          alt="Cebu Night Jungle" 
          className="w-full h-full object-cover opacity-20 grayscale brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-950/90 shadow-2xl border-b border-orange-900/30">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-primary uppercase tracking-tight">Cebu Conquest</span>
        </div>
        <div className="flex items-center gap-6 text-slate-400">
          <span className="material-symbols-outlined cursor-pointer hover:text-primary">settings</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-primary">person</span>
        </div>
      </header>

      <main className="flex-1 mt-16 flex relative z-10 overflow-hidden max-w-7xl mx-auto w-full">
        <section className="flex-1 flex flex-col p-8 overflow-y-auto">
          {/* Status Header */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">Waiting...</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <p className="text-primary font-bold uppercase tracking-widest text-sm">Waiting for players to ready up</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">Room Capacity</p>
              <p className="text-3xl font-black text-white">{players.length} <span className="text-primary">/ 4</span></p>
            </div>
          </div>

          {/* 🚀 Player Grid: 動的にプレイヤーを表示 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {players.map((player, index) => (
              <div key={player.id} className="glass-panel p-4 rounded-xl border-l-4 border-l-primary flex flex-col gap-3 group hover:bg-slate-900/80 transition-all">
                <div className="relative">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`} 
                    alt="Tactical Portrait" 
                    className="w-full h-32 object-cover rounded-lg grayscale group-hover:grayscale-0 transition-all bg-slate-800"
                  />
                  {index === 0 && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-[10px] font-bold text-black rounded">HOST</div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <span className="font-bold text-white uppercase">{player.username}</span>
                  <span className={`material-symbols-outlined ${player.isReady ? 'text-primary' : 'text-slate-600'}`}>
                    {player.isReady ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
              </div>
            ))}
            {/* Empty Slots */}
            {Array.from({ length: 4 - players.length }).map((_, i) => (
              <div key={i} className="glass-panel p-4 rounded-xl border-2 border-dashed border-slate-800 h-48 opacity-50"></div>
            ))}
          </div>

          {/* Bottom Area: Chat & Map Info */}
          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tactical Chat */}
            <div className="lg:col-span-2 glass-panel rounded-xl overflow-hidden flex flex-col h-64 border-slate-800">
              <div className="flex-1 p-4 space-y-3 overflow-y-auto text-sm">
                <div className="flex gap-2 text-slate-300">
                  <span className="text-primary font-bold">HQ_Cebu:</span> Everyone ready? Initiating operation.
                </div>
                <div className="flex gap-2 text-slate-300 italic opacity-50">
                  System: Tactical link established.
                </div>
              </div>
              <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                <input 
                  className="w-full bg-slate-900 border-slate-800 rounded-lg py-2 px-4 text-sm text-slate-200 outline-none focus:border-primary transition-all" 
                  placeholder="Type a tactical message..." 
                  type="text" 
                />
              </div>
            </div>

            {/* Map Preview & Action */}
            <div className="flex flex-col gap-4">
              <div className="glass-panel rounded-xl p-4 border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Target Location</p>
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-3 italic">Metro Cebu Archipelagos</h3>
                <div className="h-28 rounded-lg overflow-hidden relative border border-slate-800">
                  <img 
                    src="https://images.unsplash.com/photo-1542662565-7e4b66bae529?auto=format&fit=crop&q=80&w=1000" 
                    className="w-full h-full object-cover grayscale brightness-50" 
                    alt="Tactical Map" 
                  />
                  <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
                </div>
              </div>
              <button 
                onClick={() => setView('selection')} 
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-xl border border-slate-700 transition-all active:scale-95 uppercase text-xl shadow-lg"
              >
                Choose God
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-8 flex justify-between items-center bg-slate-950 border-t border-slate-800 text-[10px] uppercase tracking-widest text-slate-600 font-bold">
        <span>Cebu Conquest Tactical Systems // 2026 Batch21</span>
        <div className="flex gap-6">
          <span className="hover:text-primary cursor-pointer">Intel</span>
          <span className="hover:text-primary cursor-pointer">Support</span>
        </div>
      </footer>
    </div>
  );
};