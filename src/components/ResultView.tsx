import React, { useMemo } from 'react';
import { useGameStore } from '../store';

interface ResultViewProps {
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ 
  onRestart, onOpenSettings, onOpenHelp, onOpenRanking 
}) => {
  const {
    isGameOver, winnerId, myId, playerName, districts,
    turn, players, godsList
  } = useGameStore();

  // 🏆 勝者とデータの解析（hooks は早期 return より前に呼ぶ）
  const isWinner = winnerId === myId;
  const winnerPlayer = players.find(p => p.id === winnerId);
  const winnerGod = godsList.find(g => g.id === winnerPlayer?.selectedGodId) || godsList[0];

  // 📊 詳細戦績の計算
  const stats = useMemo(() => {
    const myDistricts = Object.values(districts).filter(id => id === myId).length;
    const totalDistricts = Math.max(1, Object.keys(districts).length);
    const territoryPercent = Math.round((myDistricts / totalDistricts) * 100);
    const score = isWinner ? 85400 + (myDistricts * 1200) : 12400 + (myDistricts * 800);

    return {
      captured: myDistricts,
      total: totalDistricts,
      percent: territoryPercent,
      turns: turn,
      score: score
    };
  }, [districts, myId, turn, isWinner]);

  // ゲームオーバー中でなければ何も表示しない
  if (!isGameOver) return null;

  // 🎨 テーマ設定
  const theme = {
    bg: isWinner ? 'bg-slate-950' : 'bg-black',
    primaryText: isWinner ? 'text-orange-500' : 'text-red-600',
    secondaryText: isWinner ? 'text-cyan-400' : 'text-orange-500',
    border: isWinner ? 'border-orange-900/40' : 'border-red-900/40',
    glow: isWinner ? 'bg-orange-900/20' : 'bg-red-900/20',
    mainTitle: isWinner ? 'VICTORY' : 'DEFEATED',
    jpTitle: isWinner ? 'ミッション成功' : 'ミッション失敗',
    buttonBg: isWinner ? 'bg-orange-600 hover:bg-orange-500' : 'bg-red-700 hover:bg-red-600'
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
          0% { opacity: 0; transform: scale(1.1); filter: blur(20px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes glitch {
          0% { transform: translate(0); text-shadow: 2px 0 #ff0000, -2px 0 #00ff00; }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -2px); text-shadow: -2px 0 #ff0000, 2px 0 #00ff00; }
          75% { transform: translate(-1px, -1px); }
          100% { transform: translate(0); }
        }
        .animate-glitch { animation: glitch 0.2s infinite ease-in-out; }
        .font-fix { line-height: 1.2; }
      `}</style>

      {/* 📡 Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={`absolute inset-0 opacity-40 mix-blend-overlay ${isWinner ? 'bg-orange-900/20' : 'bg-red-900/30'}`}></div>
        <div className="absolute inset-0 crt-scanlines"></div>
        <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] ${theme.glow} blur-[150px] rounded-full`}></div>
      </div>

      {/* 📡 TopNavBar */}
      <nav className={`fixed top-0 w-full z-50 bg-black/80 border-b ${theme.border} flex justify-between items-center px-6 py-4 backdrop-blur-md`}>
        <div className={`text-xl font-black italic ${theme.secondaryText} uppercase font-fix tracking-tighter`}>
          CEBU CONQUEST // OPERATION ARCHIVE
        </div>
        <div className="flex gap-4">
          <button onClick={onOpenHelp} className="p-2 hover:bg-zinc-800 rounded-lg transition-all"><span className="material-symbols-outlined text-cyan-400">help</span></button>
          <button onClick={onOpenSettings} className="p-2 hover:bg-zinc-800 rounded-lg transition-all"><span className="material-symbols-outlined text-zinc-400">settings</span></button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-full pt-28 pb-12 px-6">
        
        {/* Result Banner */}
        <div className="text-center mb-12">
          <div className="text-zinc-500 text-xs font-black tracking-[0.6em] uppercase mb-2 font-fix">Neural Link Closed</div>
          <h1 className={`text-8xl md:text-[10rem] font-black italic uppercase ${theme.primaryText} leading-none tracking-tighter font-fix ${!isWinner && 'animate-glitch'}`}>
            {theme.mainTitle}
          </h1>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className={`h-[2px] w-24 bg-gradient-to-r from-transparent to-${isWinner ? 'orange' : 'red'}-500`}></div>
            <p className="text-white font-black text-2xl uppercase tracking-widest font-fix italic">{theme.jpTitle}</p>
            <div className={`h-[2px] w-24 bg-gradient-to-l from-transparent to-${isWinner ? 'orange' : 'red'}-500`}></div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
          
          {/* Winner God Portrait */}
          <div className={`relative bg-zinc-900/80 backdrop-blur-xl border-2 ${theme.border} p-1 rounded-2xl overflow-hidden shadow-2xl`}>
            <img 
              className="w-full h-full object-cover grayscale-[0.3] brightness-75" 
              src={winnerGod.img} 
              alt="Winner God" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 text-left">
              <div className="text-[10px] text-orange-500 font-black uppercase tracking-widest font-fix">Active God</div>
              <div className="text-2xl font-black text-white italic font-fix uppercase">{winnerGod.name}</div>
            </div>
          </div>

          {/* Detailed Statistics */}
          <div className={`bg-zinc-900/60 backdrop-blur-xl border ${theme.border} p-8 md:col-span-2 rounded-2xl flex flex-col justify-center`}>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-y-10 gap-x-8 text-left">
              
              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Operator Info</div>
                <div className="text-3xl font-black text-white italic font-fix uppercase">{playerName || "GUEST_USER"}</div>
                <div className="text-[9px] text-zinc-600 font-mono">STATUS: {isWinner ? 'COMMISSIONED' : 'TERMINATED'}</div>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Survival Time</div>
                <div className="text-3xl font-black text-white italic font-fix">{stats.turns} <span className="text-sm">TURNS</span></div>
                <div className={`h-1 w-full bg-zinc-800 mt-2`}>
                  <div className={`h-full ${theme.secondaryText.replace('text-', 'bg-')}`} style={{ width: `${Math.min(100, (stats.turns/10)*100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Territory Expansion</div>
                <div className={`text-3xl font-black italic ${theme.secondaryText} font-fix`}>
                  {stats.captured} / {stats.total} <span className="text-sm">UNITS</span>
                </div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase">Occupation: {stats.percent}%</p>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Evaluation Score</div>
                <div className="text-5xl font-black text-white italic font-fix tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {stats.score.toLocaleString()}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
          <button 
            onClick={onRestart}
            className={`flex-1 group relative overflow-hidden ${theme.buttonBg} py-5 px-10 transition-all active:scale-95 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
          >
            <div className="relative z-10 flex items-center justify-center gap-4 text-white font-black uppercase italic text-xl tracking-tighter font-fix">
              <span className="material-symbols-outlined">refresh</span>
              Neural Re-Link
            </div>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
          
          <button 
            onClick={onOpenRanking}
            className="flex-1 bg-zinc-900 border border-zinc-700 hover:border-orange-500/50 py-5 px-10 transition-all active:scale-95 rounded-xl flex items-center justify-center gap-4 text-zinc-400 hover:text-white"
          >
            <span className="material-symbols-outlined">leaderboard</span>
            <span className="font-black uppercase italic text-xl tracking-tighter font-fix">Global Rankings</span>
          </button>
        </div>

      </main>

      {/* Footer decoration */}
      <footer className="fixed bottom-6 w-full opacity-20 pointer-events-none px-12 flex justify-between items-center">
         <span className="text-[9px] font-mono">B21-AM // CEBU_CONQUEST_SYSTEM</span>
         <span className="text-[9px] font-mono">ENCRYPTION: AES-256-GCM</span>
      </footer>
    </div>
  );
};