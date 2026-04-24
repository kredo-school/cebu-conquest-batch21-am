import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import socket from '../socket'; // ソケット通信用

interface GodSelectionViewProps {
  onComplete: () => void;
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

export const GodSelectionView: React.FC<GodSelectionViewProps> = ({ onComplete }) => {
  const { setStatus, players, myId, selectedGodId } = useGameStore();
  const [isDeploying, setIsDeploying] = useState(false);

  // 🚀 他のプレイヤーの選択状態をチェック
  const getLockInfo = (godId: number) => {
    const selector = players.find(p => p.id !== myId && p.selectedGodId === godId);
    if (selector) {
      return { 
        name: selector.name || "Operator", 
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${selector.name}` 
      };
    }
    return null;
  };

  // 🚀 選択をサーバーに即時通知（ここではまだ遷移しない）
  const handleSelect = (godId: number) => {
    if (selectedGodId) return; // 既に選択済みならガード
    socket.emit('SELECT_GOD', { godId });
    setStatus({ selectedGodId: godId });
  };

  // 🚀 全員の準備が整ったか監視
  useEffect(() => {
    // 全員が selectedGodId を持っているか判定
    const allReady = players.length > 0 && players.every(p => p.selectedGodId);

    if (allReady && selectedGodId && !isDeploying) {
      setIsDeploying(true);
      // 演出を見せてから完了通知
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [players, selectedGodId, isDeploying, onComplete]);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 font-body text-slate-200 antialiased overflow-hidden select-none flex items-center justify-center">
      
      {/* 🚀 出撃時のオーバーレイ演出 */}
      <div className={`fixed inset-0 z-[10001] bg-slate-950 transition-opacity duration-1000 pointer-events-none flex items-center justify-center ${isDeploying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-center">
          <div className="text-brand-500 text-sm font-black tracking-[0.5em] uppercase mb-4 animate-pulse">All Operators Synchronized</div>
          <div className="text-5xl font-black text-white italic tracking-tighter uppercase">Initiating Deployment...</div>
        </div>
      </div>

      {/* 背景エフェクト */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80"></div>
        <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
      </div>

      <main className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="glass-panel w-full max-w-[96%] h-[92vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] border-t border-brand-500/50 rounded-2xl overflow-hidden bg-slate-900/40 backdrop-blur-md">
          
          <div className="flex items-center justify-between px-12 py-8 border-b border-white/5 bg-white/5">
            <div className="flex flex-col">
              <h1 className="text-4xl lg:text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
                Choose your <span className="text-brand-500">Divine Blessing</span>
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className={`w-3 h-3 rounded-full animate-pulse ${selectedGodId ? 'bg-orange-500' : 'bg-cyan-400'}`}></span>
                <span className={`text-xs uppercase tracking-[0.4em] font-bold italic ${selectedGodId ? 'text-orange-500' : 'text-cyan-400'}`}>
                    {selectedGodId 
                      ? "Awaiting squad synchronization..." 
                      : `${players.length} Operators Connected - First Come, First Served!`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 min-h-full">
              {GOD_SLOTS.map((god) => {
                const lock = getLockInfo(god.id);
                const isSelectedByMe = selectedGodId === god.id;
                const isOtherSelected = selectedGodId && !isSelectedByMe;

                return (
                  <div 
                    key={god.id} 
                    className={`group relative flex flex-col transition-all duration-500 tactical-border h-full shadow-xl border ${
                      lock || isOtherSelected
                        ? "bg-red-950/20 border-red-900/50 opacity-40 scale-[0.98] grayscale pointer-events-none" 
                        : isSelectedByMe
                        ? "bg-brand-500/10 border-brand-500 shadow-[0_0_30px_rgba(250,112,0,0.3)] scale-[1.02]"
                        : "bg-slate-900/60 border-slate-800/50 hover:border-brand-500 hover:bg-slate-800/80 hover:-translate-y-2 cursor-pointer"
                    }`}
                  >
                    <div className="relative h-44 lg:h-52 overflow-hidden border-b border-white/10 shrink-0">
                      <img src={god.img} className="w-full h-full object-cover" alt={god.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-80"></div>
                      
                      {lock && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-sm">
                          <img src={lock.avatar} className="w-12 h-12 rounded-full border-2 border-red-500 p-0.5 mb-2 bg-slate-900 shadow-lg" alt="locked by" />
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-slate-950 px-2 py-1">CLAIMED BY {lock.name}</span>
                        </div>
                      )}

                      <div className="absolute top-3 right-3 bg-cyan-950/80 px-3 py-1 text-[9px] font-black text-cyan-400 border border-cyan-400/30 uppercase tracking-widest">
                        {god.role}
                      </div>
                    </div>

                    <div className="p-6 flex flex-col justify-between flex-1 gap-4">
                      <div>
                        <h3 className={`text-2xl font-black tracking-tighter uppercase mb-1 ${lock ? 'text-red-900' : 'text-white'}`}>
                          {god.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${lock ? 'bg-red-950/40 text-red-900' : 'bg-brand-500/10 text-brand-500 border border-brand-500/20'}`}>
                            {god.bonus}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed mt-4 font-medium italic ${lock ? 'text-red-900/60' : 'text-slate-400'}`}>
                          {god.desc}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => !lock && !selectedGodId && handleSelect(god.id)}
                        disabled={!!lock || !!selectedGodId}
                        className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                          isSelectedByMe
                            ? "bg-brand-500 text-slate-950 border-brand-500 animate-pulse"
                            : lock || isOtherSelected
                            ? "bg-transparent text-slate-700 border border-slate-800/30 cursor-not-allowed" 
                            : "bg-slate-800 text-white border border-slate-700 group-hover:bg-brand-500 group-hover:text-slate-950 group-hover:border-brand-500 shadow-lg"
                        }`}
                      >
                        {isSelectedByMe ? "WAITING FOR OTHERS..." : lock ? "UNAVAILABLE" : "Synchronize"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-12 py-6 border-t border-white/5 bg-black/40 flex items-center justify-between">
             <span className={`text-[10px] font-black uppercase tracking-[0.5em] ${selectedGodId ? 'text-brand-500 animate-pulse' : 'text-slate-500'}`}>
                {selectedGodId ? "SYSTEM:// UPLINK_ESTABLISHED. AWAITING_ALL_OPERATORS..." : "System:// Awaiting_Squad_Synchronization..."}
             </span>
             <div className="flex items-center gap-4 text-brand-500 font-black text-[10px] italic">
                BE QUICK. POWER IS FINITE.
             </div>
          </div>
        </div>
      </main>

      <style>{`
        .tactical-border {
          clip-path: polygon(0 0, 100% 0, 100% 92%, 92% 100%, 0 100%, 0 8%);
        }
        .scanline {
          background: linear-gradient(to bottom, rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%);
          background-size: 100% 4px;
        }
      `}</style>
    </div>
  );
};