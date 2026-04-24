import React from 'react';
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
  const { isGameOver, winnerId, myId, playerName, districts, hp, maxHp } = useGameStore();

  // ゲームオーバー中でなければ何も表示しない
  if (!isGameOver) return null;

  // 勝敗判定
  const isWinner = winnerId === myId;

  // 領土とスコアの計算（デモ用）
  const myTerritoryCount = Object.values(districts).filter(id => id === myId).length;
  const totalTerritoryCount = Math.max(16, Object.keys(districts).length);
  const territoryPercent = Math.round((myTerritoryCount / totalTerritoryCount) * 100) || 0;
  const mockScore = isWinner ? 85400 + (myTerritoryCount * 1200) : 12400 + (myTerritoryCount * 800);

  // 🎨 勝敗に応じたテーマカラー設定
  const theme = {
    bg: isWinner ? 'bg-slate-950' : 'bg-black',
    primaryText: isWinner ? 'text-blue-500' : 'text-red-600',
    secondaryText: isWinner ? 'text-cyan-400' : 'text-orange-500',
    border: isWinner ? 'border-blue-900/40' : 'border-red-900/40',
    glow: isWinner ? 'bg-blue-900/20' : 'bg-red-900/20',
    barBg: isWinner ? 'bg-blue-600' : 'bg-red-900',
    titleEffect: isWinner ? 'drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]' : 'glitch-text',
    subTitle: isWinner ? 'Operation Success' : 'Operation Failure',
    mainTitle: isWinner ? 'VICTORY' : 'DEFEATED',
    jpTitle: isWinner ? 'ミッション成功' : 'ミッション失敗',
    buttonBg: isWinner ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-600 hover:bg-orange-500'
  };

  return (
    <div className={`fixed inset-0 z-[20000] ${theme.bg} text-zinc-100 font-body overflow-y-auto selection:bg-orange-500/30`}>
      
      {/* 🚀 CSSアニメーション・エフェクト */}
      <style>{`
        .crt-scanlines {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 4px, 3px 100%;
          pointer-events: none;
        }
        .glitch-text {
          text-shadow: 2px 0 #ff0000, -2px 0 #ff7b00;
        }
        .map-static {
          filter: contrast(150%) brightness(20%) grayscale(100%);
          mix-blend-mode: overlay;
        }
      `}</style>

      {/* 📡 Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none text-left">
        <img 
          className="w-full h-full object-cover map-static" 
          src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1000" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-90"></div>
        <div className="absolute inset-0 crt-scanlines"></div>
        {/* Lighting Effect */}
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${theme.glow} blur-[120px] rounded-full`}></div>
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${isWinner ? 'bg-cyan-900/10' : 'bg-orange-900/10'} blur-[120px] rounded-full`}></div>
      </div>

      {/* 📡 TopNavBar */}
      <nav className={`fixed top-0 w-full z-50 bg-black/80 text-orange-500 font-['Inter'] tracking-tighter border-b ${theme.border} shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex justify-between items-center px-6 py-4 backdrop-blur-md`}>
        <div className={`text-xl font-black italic ${theme.secondaryText} uppercase`}>
          CEBU CONQUEST
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
          <span className="text-slate-400 hover:text-white transition-colors cursor-pointer" onClick={onRestart}>MISSION RESULT</span>
          <button onClick={onOpenRanking} className="text-orange-400 border-b-2 border-orange-500 pb-1 hover:text-orange-300 transition-colors uppercase font-bold">
            RANKING
          </button>
          <span className="text-slate-400 hover:text-blue-200 transition-colors cursor-pointer">ARCHIVES</span>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={onOpenHelp} className="flex items-center justify-center p-2 hover:bg-zinc-800 rounded-lg transition-all active:scale-90" title="HELP / MANUAL">
            <span className="material-symbols-outlined text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">help</span>
          </button>
          <button onClick={onOpenSettings} className="flex items-center justify-center p-2 hover:bg-zinc-800 rounded-lg transition-all active:scale-90" title="SETTINGS">
            <span className="material-symbols-outlined hover:text-white transition-colors">settings</span>
          </button>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen pt-20 pb-24 md:pb-12 px-6">
        
        {/* Result Banner */}
        <div className="text-center mb-8">
          <div className={`${theme.primaryText} text-sm font-bold tracking-[0.5em] uppercase mb-2`}>
            {theme.subTitle}
          </div>
          <h1 className={`text-7xl md:text-9xl font-black italic uppercase ${theme.primaryText} ${theme.titleEffect} tracking-tighter`}>
            {theme.mainTitle}
          </h1>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className={`h-[1px] w-12 ${isWinner ? 'bg-blue-500/50' : 'bg-red-600/50'}`}></div>
            <p className={`${theme.secondaryText} font-bold text-lg`}>{theme.jpTitle}</p>
            <div className={`h-[1px] w-12 ${isWinner ? 'bg-blue-500/50' : 'bg-red-600/50'}`}></div>
          </div>
        </div>

        {/* Bento Grid Stats & Profile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full">
          
          {/* Operator Profile */}
          <div className={`bg-zinc-900/50 backdrop-blur-md border ${theme.border} p-6 flex flex-col items-center justify-center col-span-1 rounded-xl`}>
            <div className="relative w-24 h-24 mb-4">
              <img 
                className={`w-full h-full object-cover rounded-none border-2 ${isWinner ? 'border-blue-500/50' : 'border-red-600/50'} p-1 bg-slate-800`} 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${playerName || myId}`} 
                alt="Operator" 
              />
              <div className={`absolute inset-0 ${isWinner ? 'bg-blue-500/20' : 'bg-red-600/20'} mix-blend-color pointer-events-none`}></div>
              <div className={`absolute -bottom-2 -right-2 ${isWinner ? 'bg-blue-600' : 'bg-red-600'} text-white text-[10px] font-black px-2 py-0.5 uppercase`}>
                {isWinner ? 'SURVIVED' : 'DEFEATED'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">OPERATOR ID</div>
              <div className="text-2xl font-black text-white italic tracking-tight">{playerName || "GUEST"}</div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className={`bg-zinc-900/50 backdrop-blur-md border ${theme.border} p-6 md:col-span-2 flex flex-col justify-center rounded-xl`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Health Points</div>
                <div className={`text-3xl font-black italic ${isWinner ? 'text-green-500' : 'text-red-600'}`}>
                  HP: {isWinner ? hp : 0}
                </div>
                <div className="w-full h-1 bg-zinc-800">
                  <div className={`h-full ${isWinner ? 'bg-green-500' : 'bg-red-900'}`} style={{ width: `${isWinner ? (hp/(maxHp||100))*100 : 0}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Territory Control</div>
                <div className={`text-3xl font-black italic ${theme.secondaryText}`}>
                  {myTerritoryCount}/{totalTerritoryCount}
                </div>
                <div className="w-full h-1 bg-zinc-800">
                  <div className={`h-full ${theme.secondaryText.replace('text-', 'bg-')}`} style={{ width: `${territoryPercent}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Final Rank Score</div>
                <div className="text-3xl font-black text-white italic">{mockScore.toLocaleString()}</div>
              </div>

            </div>
          </div>
        </div>

        {/* 🚀 Actions (ボタンエリア) */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-xl">
          <button 
            onClick={onRestart}
            className={`flex-1 group relative overflow-hidden ${theme.buttonBg} transition-all duration-150 py-4 px-8 active:scale-95 rounded-lg`}
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-white font-bold">replay</span>
              <span className="text-white font-black uppercase italic tracking-tighter">Retry (リトライ)</span>
            </div>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
          
          <button 
            onClick={onOpenRanking}
            className="flex-1 group border border-zinc-700 hover:border-zinc-400 hover:bg-zinc-800 transition-all duration-150 py-4 px-8 active:scale-95 rounded-lg shadow-lg"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-zinc-400 group-hover:text-white transition-colors">leaderboard</span>
              <span className="text-zinc-100 font-black uppercase italic tracking-tighter text-sm">Rankings (順位確認)</span>
            </div>
          </button>
        </div>

      </main>

      {/* Mobile Bottom Nav */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 bg-slate-900/95 border-t border-blue-500/20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden px-4">
        <div className="flex flex-col items-center justify-center text-slate-500 cursor-pointer" onClick={onRestart}>
          <span className="material-symbols-outlined">home</span>
          <span className="font-inter text-[10px] uppercase font-bold mt-1 text-center">ホーム</span>
        </div>
        <div className="flex flex-col items-center justify-center text-orange-500 bg-orange-500/10 rounded-xl px-4 py-1">
          <span className="material-symbols-outlined">swords</span>
          <span className="font-inter text-[10px] uppercase font-bold mt-1 text-center">バトル</span>
        </div>
        <div className="flex flex-col items-center justify-center text-slate-500 cursor-pointer" onClick={onOpenRanking}>
          <span className="material-symbols-outlined">leaderboard</span>
          <span className="font-inter text-[10px] uppercase font-bold mt-1 text-center">順位</span>
        </div>
      </footer>
    </div>
  );
};