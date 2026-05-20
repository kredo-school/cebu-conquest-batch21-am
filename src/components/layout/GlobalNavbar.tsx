import React, { useState } from 'react';
import { useGameStore } from '../../store'; 

interface Props {
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenRanking?: () => void;
  onAbort?: () => void;
}

export const GlobalNavbar: React.FC<Props> = ({ 
  onOpenSettings, onOpenHelp, onOpenRanking, onAbort 
}) => {
  const { playerName, myId, playerAvatar, myTeam, logout, isAuthenticated } = useGameStore();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-8 py-4 bg-slate-950/80 backdrop-blur-md border-b border-white/5 shadow-md">
      <div className="flex items-center gap-6">
        <span className="text-2xl font-black text-orange-600 uppercase tracking-tighter font-fix select-none">
          CEBU CONQUEST
        </span>
      </div>

      <div className="flex gap-4 items-center">
        {onOpenRanking && (
          <button onClick={onOpenRanking} className="text-slate-500 hover:text-white p-2 transition-all group" title="LEADERBOARD">
            <span className="material-symbols-outlined group-hover:text-orange-500">leaderboard</span>
          </button>
        )}
        {onOpenHelp && (
          <button onClick={onOpenHelp} className="text-slate-500 hover:text-white p-2 transition-all group" title="HELP">
            <span className="material-symbols-outlined group-hover:text-cyan-300">help</span>
          </button>
        )}
        {onOpenSettings && (
          <button onClick={onOpenSettings} className="text-slate-500 hover:text-white p-2 transition-all group" title="SETTINGS">
            <span className="material-symbols-outlined group-hover:text-orange-500">settings</span>
          </button>
        )}
        {onAbort && (
          <button onClick={onAbort} className="text-red-500 hover:text-red-400 font-black text-[10px] tracking-widest px-4 py-2 border border-red-900/30 rounded-lg transition-all font-fix uppercase mr-2">
            Abort
          </button>
        )}

        {isAuthenticated ? (
          <div 
            className="relative flex items-center gap-4 pl-4 border-l border-white/10 ml-2 cursor-pointer py-1"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="hidden md:flex items-baseline gap-3 text-right">
              <p className="text-[10px] text-slate-400 font-mono uppercase font-fix">
                UID: {myId?.substring(0,8).toUpperCase() || '--------'}
              </p>
              <p className="text-sm font-bold text-white italic font-fix">
                {playerName || "Operator"}
              </p>
            </div>
            
            <div className="size-9 rounded-full border-2 border-orange-600 overflow-hidden bg-slate-900 shrink-0 shadow-[0_0_15px_rgba(234,88,12,0.3)] flex items-center justify-center relative">
               {playerAvatar ? (
                 <img src={playerAvatar} alt="avatar" className="w-full h-full object-cover" />
               ) : (
                 <span className="material-symbols-outlined text-slate-600 text-xl">person</span>
               )}
               <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-950 rounded-full"></div>
            </div>

            {/* ミニモーダル */}
            {isHovered && (
              <div className="absolute top-full right-0 mt-3 w-60 z-[60]">
                {/* 🚀 修正：カーソル移動時の隙間を埋めるための透明ブリッジ */}
                <div className="absolute -top-3 left-0 w-full h-3" />
                
                <div className="bg-slate-900/95 border border-orange-600/40 backdrop-blur-xl rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-slideDown">
                  <div className="h-1 w-full bg-gradient-to-r from-transparent via-orange-600 to-transparent opacity-50"></div>
                  
                  <div className="p-5 flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-lg border border-white/10 bg-slate-800 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                        {playerAvatar ? (
                          <img src={playerAvatar} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-slate-600 text-2xl">person</span>
                        )}
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <p className="text-sm font-black text-white uppercase italic leading-tight font-fix truncate">{playerName || "Operator"}</p>
                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.15em] font-fix mt-0.5">{myTeam || "Explorer"}</p>
                      </div>
                    </div>

                    <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                      <p className="text-[9px] text-slate-500 uppercase font-black mb-1.5 tracking-widest font-fix">Tactical Network ID</p>
                      <p className="text-[11px] font-mono text-slate-200 tracking-wider break-all">
                        {myId ? myId.toUpperCase() : 'CC-UNK-0000'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={onOpenSettings} 
                        className="w-full py-2 bg-white/5 hover:bg-orange-600/20 text-[10px] font-black text-white border border-white/10 rounded-md transition-all uppercase tracking-[0.2em] font-fix active:scale-95"
                      >
                        Edit Profile
                      </button>
                      <button 
                        onClick={logout} 
                        className="w-full py-2 text-[10px] font-black text-red-500/60 hover:text-red-500 transition-all uppercase tracking-[0.2em] font-fix"
                      >
                        LOG OUT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-4 border-l border-white/10 ml-2 opacity-40 select-none">
            <span className="material-symbols-outlined text-slate-500 text-sm">lock</span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-fix mt-0.5">Authentication Required</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.2s cubic-bezier(0, 0, 0.2, 1) forwards; }
      `}</style>
    </nav>
  );
};