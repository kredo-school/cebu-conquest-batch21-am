import React from 'react';
import { useGameStore } from '../store';

interface ResultViewProps {
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void; // 🚀 修正：プロップスを追加
}

export const ResultView: React.FC<ResultViewProps> = ({ 
  onRestart, onOpenSettings, onOpenHelp, onOpenRanking 
}) => {
  const { isGameOver, winnerId, myId } = useGameStore();

  // 自分が勝者かどうか判定
  const isWinner = winnerId === myId;

  // ゲームオーバー中でなければ何も表示しない
  if (!isGameOver) return null;

  return (
    <div className="fixed inset-0 z-[20000] bg-slate-950 text-slate-100 font-body overflow-y-auto selection:bg-orange-500/30">
      
      {/* 📡 TopNavBar */}
      <nav className="fixed top-0 w-full flex justify-between items-center px-6 h-16 z-50 bg-slate-900/80 backdrop-blur-md border-b border-blue-500/30 font-inter text-sm font-medium tracking-wide">
        <div className="text-xl font-black text-orange-500 tracking-tighter uppercase text-left">Cebu Conquest</div>
        <div className="hidden md:flex items-center gap-8">
          <span className="text-slate-400 hover:text-white transition-colors cursor-pointer" onClick={onRestart}>MISSION RESULT</span>
          
          {/* 🚀 ランキングボタン（ヘッダー） */}
          <button 
            onClick={onOpenRanking}
            className="text-orange-400 border-b-2 border-orange-500 pb-1 hover:text-orange-300 transition-colors uppercase font-bold"
          >
            RANKING
          </button>
          
          <span className="text-slate-400 hover:text-blue-200 transition-colors cursor-pointer">ARCHIVES</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          
          <button 
            onClick={onOpenHelp}
            className="flex items-center justify-center p-2 hover:bg-blue-800/40 rounded-lg transition-all active:scale-90 pointer-events-auto"
            title="HELP / MANUAL"
          >
            <span className="material-symbols-outlined text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">help</span>
          </button>

          <button 
            onClick={onOpenSettings}
            className="flex items-center justify-center p-2 hover:bg-blue-800/40 rounded-lg transition-all active:scale-90 pointer-events-auto"
            title="SETTINGS"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
          
          <span className="material-symbols-outlined p-2 hover:bg-blue-800/40 rounded-lg cursor-pointer">person</span>
        </div>
      </nav>

      <main className="relative pt-16 pb-24 md:pb-0 min-h-screen overflow-hidden text-center">
        
        <div className="absolute inset-0 z-0 text-left">
          {/* 🚀 修正：alt="" にして文字が出ないようにしました */}
          <img 
            className="w-full h-full object-cover filter brightness-50 contrast-125 saturate-50" 
            src="https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?q=80&w=2000" 
            alt="" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col items-center">
          
          <div className="text-center mb-8">
            <h2 className="text-blue-400 font-bold tracking-[0.3em] text-sm uppercase mb-2 animate-pulse">
              {isWinner ? "OPERATION COMPLETED" : "OPERATION TERMINATED"}
            </h2>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              {isWinner ? "GLORIOUS VICTORY" : "MISSION ENDED"}
            </h1>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-blue-500/20 p-8 rounded-2xl shadow-2xl text-left">
                <span className="text-blue-400 text-sm font-bold uppercase tracking-widest block mb-2">Final Occupancy</span>
                <div className="text-5xl font-black text-white">84%</div>
                <div className="w-full bg-slate-800 h-2 mt-4 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full w-[84%] shadow-[0_0_15px_rgba(249,115,22,0.6)]"></div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 flex justify-center relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
              <div className="relative group">
                <img 
                  className="w-72 md:w-[450px] aspect-[3/4] object-cover rounded-3xl border-2 border-blue-400/30 shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-transform duration-500 group-hover:scale-[1.02]" 
                  src="https://images.unsplash.com/photo-1614728263952-84ea206f99b6?q=80&w=1000" 
                  alt="Guardian" 
                />
              </div>
            </div>

            <div className="lg:col-span-3 order-3">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-blue-500/20 p-8 rounded-2xl shadow-2xl text-left">
                <span className="text-blue-400 text-sm font-bold uppercase tracking-widest block mb-6">Acquired Items</span>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-4 bg-blue-900/20 border border-blue-400/20 p-3 rounded-xl hover:border-orange-500/50 transition-colors cursor-default">
                    <span className="material-symbols-outlined text-orange-400 text-3xl">eco</span>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">RARE</span>
                      <span className="text-sm font-bold text-white leading-tight">セブ・マンゴー</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 🚀 メインボタンエリア */}
          <div className="mt-16 flex flex-col md:flex-row gap-6 items-center">
            <button 
              onClick={onRestart}
              className="group relative px-12 py-5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xl italic tracking-tighter rounded-xl transition-all duration-300 active:scale-95 border border-white/10"
            >
              <span className="relative z-10 uppercase">報酬を受け取る</span>
            </button>

            <button 
              onClick={onOpenRanking}
              className="group relative px-12 py-5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xl italic tracking-tighter rounded-xl transition-all duration-300 active:scale-95 shadow-[0_0_40px_rgba(249,115,22,0.4)]"
            >
              <span className="relative z-10 uppercase flex items-center gap-3">
                <span className="material-symbols-outlined">leaderboard</span>
                現在の順位を確認
              </span>
              <div className="absolute inset-0 bg-white/20 blur-xl group-hover:blur-2xl transition-all rounded-xl opacity-0 group-hover:opacity-100"></div>
            </button>
          </div>
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