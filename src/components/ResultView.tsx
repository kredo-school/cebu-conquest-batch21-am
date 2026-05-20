/// <reference types="vite/client" />
import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../store';
import { useBGM } from '../hook/useBGM';

interface ResultViewProps {
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  onRestart, onOpenSettings, onOpenHelp: _onOpenHelp, onOpenRanking
}) => {
  const {
    isGameOver, winnerId, myId, playerName, districts,
    turn, players, godsList, finalScore
  } = useGameStore();

  const { playBGM, stopBGM } = useBGM();

  const isWinner = useMemo(() => winnerId === myId, [winnerId, myId]);

  useEffect(() => {
    if (!isGameOver) return;
    playBGM(isWinner ? 'winner' : 'loser');
    return () => stopBGM();
  }, [isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const winnerPlayer = useMemo(() => 
    players?.find(p => p.id === winnerId), 
  [players, winnerId]);

  const winnerGod = useMemo(() => 
    godsList?.find(g => g.id === (winnerPlayer?.selectedGodId || winnerPlayer?.godId)) || null, 
  [godsList, winnerPlayer]);

  const stats = useMemo(() => {
    const dObj = districts || {};
    const myDistrictsCount = Object.values(dObj).filter(val => (val as unknown as string) === myId).length;
    const totalDistrictsCount = Math.max(1, Object.keys(dObj).length);
    const territoryPercent = Math.round((myDistrictsCount / totalDistrictsCount) * 100);
    
    return {
      captured: myDistrictsCount,
      total: totalDistrictsCount,
      percent: territoryPercent,
      turns: turn,
      score: finalScore ?? 0 // 🚀 サーバーから届いた確定スコアを使用
    };
  }, [districts, myId, turn, finalScore]);

  if (!isGameOver) return null;

  const theme = {
    bg: isWinner ? 'bg-slate-950' : 'bg-zinc-950',
    primaryText: isWinner ? 'text-orange-500' : 'text-red-600',
    secondaryText: isWinner ? 'text-cyan-400' : 'text-orange-600',
    border: isWinner ? 'border-orange-900/40' : 'border-red-900/40',
    mainTitle: isWinner ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED',
    subTitle: isWinner ? 'AUTHORIZED AS SUPREME COMMANDER' : `VICTOR: ${winnerPlayer?.playerName || 'UNKNOWN'}`,
    buttonBg: isWinner ? 'bg-orange-600 hover:bg-orange-500' : 'bg-zinc-800 hover:bg-zinc-700'
  };

  return (
    <div className={`fixed inset-0 z-[300000] ${theme.bg} text-zinc-100 font-body overflow-y-auto selection:bg-orange-500/30 custom-scrollbar animate-resultIn`}>
      
      <style>{`
        .crt-scanlines {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 4px, 3px 100%;
          pointer-events: none;
        }
        @keyframes resultIn {
          0% { opacity: 0; transform: scale(1.05); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        .font-fix { line-height: 1.1; }
      `}</style>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={`absolute inset-0 opacity-30 ${isWinner ? 'bg-orange-900/20' : 'bg-red-950/40'}`}></div>
        <div className="absolute inset-0 crt-scanlines"></div>
      </div>

      <nav className={`fixed top-0 w-full z-50 bg-black/60 border-b ${theme.border} flex justify-between items-center px-8 py-4 backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${isWinner ? 'bg-orange-500 animate-pulse' : 'bg-red-600'}`}></span>
          <div className={`text-sm font-black italic ${theme.secondaryText} uppercase tracking-[0.3em] font-fix`}>
            Cebu Conquest // Final Report
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onOpenRanking} className="text-zinc-500 hover:text-white transition-colors"><span className="material-symbols-outlined">leaderboard</span></button>
          <button onClick={onOpenSettings} className="text-zinc-500 hover:text-white transition-colors"><span className="material-symbols-outlined">settings</span></button>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 pb-12 px-6">
        
        <div className="text-center mb-12">
          <p className="text-zinc-500 text-[10px] font-black tracking-[0.8em] uppercase mb-4 font-fix">Neural Link Terminated</p>
          <h1 className={`text-5xl md:text-8xl font-black italic uppercase ${theme.primaryText} leading-none tracking-tighter font-fix mb-6`}>
            {theme.mainTitle}
          </h1>
          <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-2 rounded-full backdrop-blur-sm">
            <span className={`text-xl font-black uppercase italic tracking-widest font-fix ${isWinner ? 'text-white' : 'text-red-500'}`}>
              {theme.subTitle}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
          
          {/* 🚀 安全ガード: winnerGod?.img が存在する場合のみ描画 */}
          <div className={`relative aspect-[4/5] bg-zinc-900 border-2 ${theme.border} rounded-2xl overflow-hidden shadow-2xl group`}>
            {winnerGod?.img && (
              <img className="w-full h-full object-cover grayscale-[0.3] brightness-75 transition-transform duration-1000 group-hover:scale-110" src={winnerGod.img} alt="" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
            <div className="absolute bottom-6 left-6 text-left">
              <span className="text-[9px] text-orange-500 font-black uppercase tracking-widest block mb-1">Victor's Blessing</span>
              <h3 className="text-2xl font-black text-white italic uppercase font-fix leading-none">{winnerGod?.name || "???"}</h3>
            </div>
          </div>

          <div className={`bg-zinc-900/40 backdrop-blur-xl border ${theme.border} p-10 md:col-span-2 rounded-2xl flex flex-col justify-between shadow-inner`}>
            <div className="grid grid-cols-2 gap-12 text-left">
              
              <div className="space-y-1">
                <span className="text-zinc-500 text-[9px] uppercase font-black tracking-widest">Your Identification</span>
                <div className="text-3xl font-black text-white italic font-fix truncate">{playerName || "GUEST_USER"}</div>
                <div className="text-[10px] text-zinc-600 font-mono">UID: {myId?.substring(0,12) || "N/A"}</div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 text-[9px] uppercase font-black tracking-widest">Operation Score</span>
                <div className="text-5xl font-black text-white italic font-fix tracking-tighter">
                  {stats.score.toLocaleString()}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-zinc-500 text-[9px] uppercase font-black tracking-widest">Territory Secured</span>
                <div className={`text-4xl font-black italic ${theme.secondaryText} font-fix`}>
                  {stats.captured} <span className="text-lg">/ {stats.total}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${isWinner ? 'bg-orange-500' : 'bg-red-600'}`} style={{ width: `${stats.percent}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-zinc-500 text-[9px] uppercase font-black tracking-widest">Efficiency</span>
                <div className="text-4xl font-black text-white italic font-fix">{stats.turns} <span className="text-lg uppercase">Turns</span></div>
                <p className="text-[10px] text-zinc-600 font-bold uppercase">Mission Duration End</p>
              </div>

            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl">
          <button onClick={onRestart} className={`flex-1 group relative overflow-hidden ${theme.buttonBg} py-5 rounded-xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.3)]`}>
            <div className="relative z-10 flex items-center justify-center gap-3 text-white font-black uppercase italic text-xl tracking-tighter font-fix">
              <span className="material-symbols-outlined">refresh</span>
              Restart Mission
            </div>
          </button>
          
          <button onClick={onOpenRanking} className="flex-1 bg-transparent border-2 border-zinc-800 hover:border-orange-500/50 py-5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 text-zinc-400 hover:text-white group">
            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">military_tech</span>
            <span className="font-black uppercase italic text-xl tracking-tighter font-fix">View Ranking</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default ResultView;