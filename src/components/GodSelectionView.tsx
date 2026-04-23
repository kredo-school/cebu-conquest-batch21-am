import React from 'react';
import { useGameStore } from '../store';

// 🚀 8つの神様（加護）スロット定義
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

export const GodSelectionView: React.FC = () => {
  const { selectGod, selectedGodId, isAuthenticated, players } = useGameStore();

  // 未ログイン、または選択済みの場合は表示しない
  if (!isAuthenticated || selectedGodId !== null) return null;

  // 他のプレイヤーが選んでいるかをチェック（4人対戦想定のデモ用）
  const getLockInfo = (godId: number) => {
    if (godId === 1) return { name: "AKI", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aki" };
    if (godId === 4) return { name: "KEI", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kei" };
    return null;
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 font-body text-slate-200 antialiased overflow-hidden select-none">
      {/* 🚀 背景エフェクト */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80"></div>
        <div className="absolute inset-0 scanline opacity-30"></div>
      </div>

      <main className="relative z-10 h-screen flex flex-col items-center justify-center p-4 lg:p-10">
        <div className="glass-panel w-full max-w-7xl h-full flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t border-tactical-orange/40 rounded-xl overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
            <div className="flex flex-col">
              <h1 className="text-3xl lg:text-4xl font-black italic tracking-tighter text-white uppercase">
                Choose your <span className="text-tactical-orange">Divine Blessing</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-tactical-cyan animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-tactical-cyan">分隊同期中: {players.length}/4 Operators Online</span>
              </div>
            </div>
          </div>

          {/* 🚀 8枚の神様カードグリッド (2段 × 4列) */}
          <div className="flex-1 p-6 overflow-hidden">
            <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-2 gap-4 h-full">
              {GOD_SLOTS.map((god) => {
                const lock = getLockInfo(god.id);
                return (
                  <div 
                    key={god.id} 
                    className={`group relative flex flex-col transition-all duration-300 tactical-border h-full ${
                      lock 
                        ? "bg-slate-900/50 border border-slate-800 opacity-60" 
                        : "bg-slate-900/40 border border-slate-800 hover:border-tactical-orange hover:bg-slate-800/50 cursor-pointer"
                    }`}
                  >
                    {/* 🚀 画像を入れる場所（神様のイラスト枠） */}
                    <div className="relative h-2/5 overflow-hidden border-b border-white/5">
                      <img 
                        src={god.img} 
                        className={`w-full h-full object-cover transition-transform duration-700 ${lock ? 'grayscale brightness-50' : 'group-hover:scale-110'}`} 
                        alt={god.name}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>
                      
                      {/* プレイヤー選択済みオーバーレイ */}
                      {lock && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60">
                          <img src={lock.avatar} className="w-10 h-10 rounded border border-tactical-orange p-0.5 mb-1 bg-slate-900" />
                          <span className="text-[9px] font-black text-tactical-orange uppercase tracking-widest">{lock.name} LOCKED</span>
                        </div>
                      )}

                      <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 text-[8px] font-bold text-tactical-cyan border border-tactical-cyan/30 uppercase">
                        {god.role}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className={`text-lg font-black tracking-tighter uppercase ${lock ? 'text-slate-600' : 'text-white'}`}>
                          {god.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold ${lock ? 'text-slate-700' : 'text-tactical-orange'}`}>
                            {god.bonus}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-tight mt-2 font-medium ${lock ? 'text-slate-700' : 'text-slate-400'}`}>
                          {god.desc}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => !lock && selectGod(god.id)}
                        disabled={!!lock}
                        className={`w-full py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                          lock 
                            ? "bg-slate-950 text-slate-700 border border-slate-900 cursor-not-allowed" 
                            : "bg-slate-800 text-white border border-slate-700 hover:bg-tactical-orange hover:text-black hover:border-tactical-orange"
                        }`}
                      >
                        {lock ? "UNAVAILABLE" : "Synchronize"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Area */}
          <div className="px-8 py-5 border-t border-white/5 bg-black/20 flex items-center justify-between">
             <span className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.4em]">SYSTEM:// DIVINE_PROTOCOL_READY</span>
             <div className="h-2 w-32 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-tactical-orange w-2/3 animate-pulse"></div>
             </div>
          </div>
        </div>
      </main>

      <style>{`
        .tactical-border {
          clip-path: polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%);
        }
        .scanline {
          background: linear-gradient(to bottom, rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%);
          background-size: 100% 4px;
        }
      `}</style>
    </div>
  );
};