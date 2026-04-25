import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';

interface GodSelectionViewProps {
  onComplete: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

const GOD_SLOTS = [
  { id: 1, name: "LAPU-LAPU", role: "WAR GOD", bonus: "ATK +20", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=400", desc: "近接攻撃ダメージを25%上昇させる。" },
  { id: 2, name: "SEBUNA", role: "HARVEST", bonus: "MAX AP +30", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=400", desc: "タクティカル・スタミナの最大値を増加。" },
  { id: 3, name: "KREDO", role: "WISDOM", bonus: "AP REGEN", img: "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?q=80&w=400", desc: "毎ターンのAP回復スピードを向上させる。" },
  { id: 4, name: "MAYARI", role: "STEALTH", bonus: "SILENT", img: "https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=400", desc: "足音を消し、敵の探知範囲を縮小させる。" },
  { id: 5, name: "LUMAWIG", role: "HEAVY", bonus: "ARMOR +40", img: "https://images.unsplash.com/photo-1584281722573-0f723675017e?q=80&w=400", desc: "アーマー耐久値を大幅に強化する。" },
  { id: 6, name: "HANUMAN", role: "SUPPORT", bonus: "SPEED +15", img: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400", desc: "移動速度と回避率を上昇させる。" },
  { id: 7, name: "BAKUNAWA", role: "SHADOW", bonus: "INVIS", img: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=400", desc: "夜間フェーズ中に一時的に姿を消す。" },
  { id: 8, name: "IDANALE", role: "RECON", bonus: "SCAN", img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?q=80&w=400", desc: "障害物越しの敵をハイライト表示する。" },
];

export const GodSelectionView: React.FC<GodSelectionViewProps> = ({ onComplete, onOpenSettings, onOpenHelp }) => {
  const { selectGod, players, myId, selectedGodId } = useGameStore();
  const [isDeploying, setIsDeploying] = useState(false);
  const targetTimeRef = useRef(0);

  // 🚀 修正：サーバーからのキー名(godId)とStoreのキー名(selectedGodId)の両方に対応
  const humanPlayers = players.filter(p => !p.isNpc);
  const totalCount = humanPlayers.length;
  const readyCount = humanPlayers.filter(p => p.selectedGodId || p.godId).length;

  const getLockInfo = (godId: number) => {
    // 🚀 修正：他プレイヤーがそのGodを選んでいるかチェック (godId も確認)
    const selector = players.find(p => p.id !== myId && (p.selectedGodId === godId || p.godId === godId));
    if (selector) return { 
      name: selector.playerName || selector.username || "Operator", 
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selector.playerName || selector.id}` 
    };
    return null;
  };

  const handleSelect = (godId: number) => {
    if (selectedGodId) return; 
    selectGod(godId); 
  };

  useEffect(() => {
    // 🚀 修正：全員準備完了のロジック
    const allReady = totalCount > 0 && readyCount >= totalCount;

    if (allReady && (selectedGodId || isDeploying)) {
      if (!isDeploying) setIsDeploying(true);
      if (targetTimeRef.current === 0) {
        targetTimeRef.current = Date.now() + 2500;
      }
      const delay = Math.max(0, targetTimeRef.current - Date.now());
      const timer = setTimeout(() => {
        onComplete();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [totalCount, readyCount, selectedGodId, isDeploying, onComplete]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 font-body text-slate-200 antialiased overflow-hidden select-none flex items-center justify-center">
      
      {/* 📡 Top UI Controls */}
      <div className="absolute top-8 right-12 z-[10002] flex gap-6 items-center">
        <button onClick={onOpenHelp} className="group transition-all active:scale-90" title="TACTICAL MANUAL">
          <span className="material-symbols-outlined text-slate-500 group-hover:text-cyan-400 text-3xl">help</span>
        </button>
        <button onClick={onOpenSettings} className="group transition-all active:scale-90" title="SETTINGS">
          <span className="material-symbols-outlined text-slate-500 group-hover:text-brand-500 text-3xl">settings</span>
        </button>
      </div>

      {/* Deploy Overlay */}
      <div className={`fixed inset-0 z-[10001] bg-slate-950 transition-opacity duration-1000 pointer-events-none flex flex-col items-center justify-center ${isDeploying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center">
          <div className="text-brand-500 text-sm font-black tracking-[0.6em] uppercase mb-6 animate-pulse">Neural Link Established</div>
          <div className="text-6xl font-black text-white italic tracking-tighter uppercase mb-2">Deploying Squad...</div>
          <div className="h-1 w-64 bg-slate-800 mx-auto overflow-hidden rounded-full">
            <div className="h-full bg-brand-500 animate-progressBar"></div>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80"></div>
        <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
      </div>

      <main className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="glass-panel w-full max-w-[96%] h-[92vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] border-t border-brand-500/50 rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-md">
          
          <div className="flex items-center justify-between px-12 py-8 border-b border-white/5 bg-white/5 text-left">
            <div className="flex flex-col">
              <h1 className="text-4xl lg:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
                Choose your <span className="text-brand-500">Divine Blessing</span>
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className={`w-3 h-3 rounded-full animate-pulse ${selectedGodId ? 'bg-brand-500' : 'bg-cyan-400'}`}></span>
                <span className={`text-[10px] uppercase tracking-[0.4em] font-bold italic ${selectedGodId ? 'text-brand-500' : 'text-cyan-400'}`}>
                    {selectedGodId 
                      ? "Awaiting other operators to finalize link..." 
                      : `Priority Protocol Active - [ ${readyCount} / ${totalCount} READY ]`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 min-h-full">
              {GOD_SLOTS.map((god) => {
                const lock = getLockInfo(god.id);
                const isSelectedByMe = selectedGodId === god.id;
                const isOtherSelected = selectedGodId && !isSelectedByMe;

                return (
                  <div 
                    key={god.id} 
                    onClick={() => !lock && !selectedGodId && handleSelect(god.id)}
                    className={`group relative flex flex-col transition-all duration-500 tactical-border h-full border ${
                      lock 
                        ? "bg-red-950/10 border-red-900/30 opacity-40 grayscale cursor-not-allowed" 
                        : isSelectedByMe
                        ? "bg-brand-500/10 border-brand-500 shadow-[0_0_30px_rgba(250,112,0,0.2)] scale-[1.02] z-10"
                        : isOtherSelected
                        ? "bg-slate-900/20 border-slate-800/30 opacity-50 pointer-events-none"
                        : "bg-slate-900/60 border-slate-800/50 hover:border-brand-500/50 hover:bg-slate-800/80 hover:-translate-y-1 cursor-pointer"
                    }`}
                  >
                    <div className="relative h-44 overflow-hidden border-b border-white/5 shrink-0">
                      <img src={god.img} className={`w-full h-full object-cover transition-transform duration-700 ${isSelectedByMe ? 'scale-110' : 'group-hover:scale-105'}`} alt={god.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>
                      
                      {lock && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/60 backdrop-blur-[2px]">
                          <img src={lock.avatar} className="w-10 h-10 rounded-full border-2 border-red-500 p-0.5 mb-2 bg-slate-900" alt="locked" />
                          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest bg-slate-950 px-2 py-1 text-center">CLAIMED BY {lock.name}</span>
                        </div>
                      )}

                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 text-[8px] font-black text-cyan-400 border border-cyan-400/20 uppercase tracking-widest">
                        {god.role}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col justify-between flex-1 gap-4 text-left">
                      <div>
                        <h3 className={`text-xl font-black tracking-tighter uppercase mb-1 ${lock ? 'text-slate-600' : 'text-white'}`}>
                          {god.name}
                        </h3>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded inline-block ${lock ? 'bg-slate-900 text-slate-700' : 'bg-brand-500/10 text-brand-500 border border-brand-500/20'}`}>
                          {god.bonus}
                        </span>
                        <p className={`text-[10px] leading-relaxed mt-3 font-medium italic ${lock ? 'text-slate-700' : 'text-slate-400'}`}>
                          {god.desc}
                        </p>
                      </div>
                      
                      <button 
                        disabled={!!lock || !!selectedGodId}
                        className={`w-full py-3 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 border text-center
                          ${isSelectedByMe
                            ? "bg-brand-500 text-slate-950 border-brand-500 animate-pulse"
                            : lock
                            ? "bg-transparent text-slate-700 border-slate-800/30" 
                            : isOtherSelected
                            ? "bg-transparent text-slate-800 border-transparent"
                            : "bg-slate-800 text-white border-slate-700 group-hover:bg-brand-500 group-hover:text-slate-950 group-hover:border-brand-500 shadow-lg"
                        }`}
                      >
                        {isSelectedByMe ? "LINK ESTABLISHED" : lock ? "UNAVAILABLE" : "Synchronize Link"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-12 py-6 border-t border-white/5 bg-black/40 flex items-center justify-between">
             <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${selectedGodId || isDeploying ? 'text-brand-500' : 'text-slate-500'}`}>
                {selectedGodId || isDeploying
                  ? `SYSTEM:// UPLINK_ESTABLISHED. [ ${readyCount} / ${totalCount} READY ]` 
                  : "System:// Neural_Link_Pending..."}
             </span>
             
             <div className="flex gap-4 items-center">
                {(selectedGodId || isDeploying) && (
                  <button
                    onClick={() => onComplete()}
                    className="text-[10px] font-black tracking-widest bg-red-900/40 text-red-400 border border-red-500/50 px-4 py-2 hover:bg-red-600 hover:text-white transition-all rounded pointer-events-auto shadow-lg"
                  >
                    FORCE DEPLOY
                  </button>
                )}
                <div className="text-brand-500 font-black text-[9px] flex gap-8 italic">
                   <span>ENCRYPTION: AES-256</span>
                   <span>STATUS: OPERATIONAL</span>
                </div>
             </div>
          </div>
        </div>
      </main>

      <style>{`
        .tactical-border { clip-path: polygon(0 0, 100% 0, 100% 92%, 92% 100%, 0 100%, 0 8%); }
        .scanline { background: linear-gradient(to bottom, rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%); background-size: 100% 4px; }
        @keyframes progressBar { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-progressBar { animation: progressBar 2.5s ease-in-out forwards; }
      `}</style>
    </div>
  );
};