// src/components/ResultView.tsx
import React, { useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '../store';

interface ResultViewProps {
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void;
}

/**
 * 🏆 ResultView: ミッション完了後の戦績表示
 * 仕様: GDD v3.1 準拠 / POST /api/result への自動保存
 */
export const ResultView: React.FC<ResultViewProps> = ({ 
  onRestart, onOpenSettings, onOpenHelp, onOpenRanking 
}) => {
  const { 
    isGameOver, winnerId, myId, playerName, districts, 
    turn, players, godsList,
    authenticatedFetch 
  } = useGameStore();

  // 二重送信防止フラグ
  const hasSavedResult = useRef(false);

  // 🏆 勝者解析
  const isWinner = useMemo(() => winnerId === myId, [winnerId, myId]);
  
  const winnerPlayer = useMemo(() => 
    players.find(p => p.id === winnerId), 
  [players, winnerId]);

  const winnerGod = useMemo(() => 
    godsList.find(g => g.id === winnerPlayer?.selectedGodId) || godsList[0], 
  [godsList, winnerPlayer]);

  // 📊 詳細戦績の計算 (GDD v3.1 準拠)
  const stats = useMemo(() => {
    const myDistrictsCount = Object.values(districts).filter(id => id === myId).length;
    const totalDistrictsCount = Math.max(1, Object.keys(districts).length);
    const territoryPercent = Math.round((myDistrictsCount / totalDistrictsCount) * 100);
    
    // スコア計算ロジック（デモ用定数）
    const baseScore = isWinner ? 85400 : 12400;
    const districtBonus = myDistrictsCount * (isWinner ? 1200 : 800);
    const totalScore = baseScore + districtBonus;

    return {
      captured: myDistrictsCount,
      total: totalDistrictsCount,
      percent: territoryPercent,
      turns: turn,
      score: totalScore
    };
  }, [districts, myId, turn, isWinner]);

  // ✅ GDD準拠: リザルトの永続化 (なお担当の PHP API へ送信)
  useEffect(() => {
    if (isGameOver && !hasSavedResult.current) {
      hasSavedResult.current = true;
      
      authenticatedFetch('result.php', {
        method: 'POST',
        body: JSON.stringify({
          is_winner: isWinner,
          score: stats.score,
          turns: stats.turns,
          captured_districts: stats.captured,
          occupancy_percent: stats.percent
        })
      }).catch(e => {
        console.error("Result save failed:", e);
        hasSavedResult.current = false; // 失敗時は再送を許可
      });
    }
  }, [isGameOver, isWinner, stats, authenticatedFetch]);

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
          <button onClick={onOpenHelp} className="p-2 hover:bg-zinc-800 rounded-lg transition-all">
            <span className="material-symbols-outlined text-cyan-400">help</span>
          </button>
          <button onClick={onOpenSettings} className="p-2 hover:bg-zinc-800 rounded-lg transition-all">
            <span className="material-symbols-outlined text-zinc-400">settings</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-full pt-28 pb-12 px-6">
        
        {/* Result Banner */}
        <div className="text-center mb-12">
          <div className="text-zinc-500 text-xs font-black tracking-[0.6em] uppercase mb-2 font-fix">Neural Link Closed</div>
          <h1 className={`text-7xl md:text-[9rem] font-black italic uppercase ${theme.primaryText} leading-none tracking-tighter font-fix ${!isWinner && 'animate-glitch'}`}>
            {theme.mainTitle}
          </h1>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className={`h-[2px] w-24 bg-gradient-to-r from-transparent to-${isWinner ? 'orange-500' : 'red-500'}`}></div>
            <p className="text-white font-black text-2xl uppercase tracking-widest font-fix italic">{theme.jpTitle}</p>
            <div className={`h-[2px] w-24 bg-gradient-to-l from-transparent to-${isWinner ? 'orange-500' : 'red-500'}`}></div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
          
          {/* God Portrait */}
          <div className={`relative aspect-square md:aspect-auto bg-zinc-900/80 backdrop-blur-xl border-2 ${theme.border} p-1 rounded-2xl overflow-hidden shadow-2xl`}>
            <img 
              className="w-full h-full object-cover grayscale-[0.2] brightness-90 transition-transform duration-700 hover:scale-110" 
              src={winnerGod.img} 
              alt={winnerGod.name} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 text-left">
              <div className="text-[10px] text-orange-500 font-black uppercase tracking-widest font-fix">Divine Support</div>
              <div className="text-2xl font-black text-white italic font-fix uppercase">{winnerGod.name}</div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className={`bg-zinc-900/60 backdrop-blur-xl border ${theme.border} p-8 md:col-span-2 rounded-2xl flex flex-col justify-center`}>
            <div className="grid grid-cols-2 gap-y-10 gap-x-8 text-left">
              
              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Commander</div>
                <div className="text-3xl font-black text-white italic font-fix uppercase truncate">{playerName || "GUEST_UNIT"}</div>
                <div className="text-[9px] text-zinc-600 font-mono tracking-tighter">ID: {myId.substring(0,8)}...</div>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Operation Time</div>
                <div className="text-3xl font-black text-white italic font-fix">{stats.turns} / 10 <span className="text-sm">TURNS</span></div>
                <div className="h-1 w-full bg-zinc-800 mt-2">
                  <div className={`h-full ${isWinner ? 'bg-cyan-500' : 'bg-orange-600'}`} style={{ width: `${(stats.turns/10)*100}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Territory Control</div>
                <div className={`text-3xl font-black italic ${theme.secondaryText} font-fix`}>
                  {stats.captured} <span className="text-sm">DOMINATED</span>
                </div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Global Occupancy: {stats.percent}%</p>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest font-fix">Combat Rating</div>
                <div className="text-5xl font-black text-white italic font-fix tracking-tighter">
                  {stats.score.toLocaleString()}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
          <button 
            onClick={onRestart}
            className={`flex-1 group relative overflow-hidden ${theme.buttonBg} py-5 px-10 transition-all active:scale-95 rounded-xl shadow-lg`}
          >
            <div className="relative z-10 flex items-center justify-center gap-4 text-white font-black uppercase italic text-xl tracking-tighter font-fix">
              <span className="material-symbols-outlined">refresh</span>
              Next Operation
            </div>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
          
          <button 
            onClick={onOpenRanking}
            className="flex-1 bg-zinc-900 border border-zinc-700 hover:border-orange-500/50 py-5 px-10 transition-all active:scale-95 rounded-xl flex items-center justify-center gap-4 text-zinc-400 hover:text-white"
          >
            <span className="material-symbols-outlined">leaderboard</span>
            <span className="font-black uppercase italic text-xl tracking-tighter font-fix">Leaderboard</span>
          </button>
        </div>

      </main>

      {/* Footer deco */}
      <footer className="fixed bottom-6 w-full opacity-30 pointer-events-none px-12 flex justify-between items-center text-[8px] font-mono tracking-widest">
         <span>B21-AM // CEBU_CONQUEST_FINAL</span>
         <span>SYSTEM_OK // LINK_TERMINATED</span>
      </footer>
    </div>
  );
};