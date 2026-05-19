/// <reference types="vite/client" />
import React, { useState, memo, useCallback } from 'react';
import { useGameStore, Player } from '../store'; 
import socket from '../socket';
import SoundManager from '../game/SoundManager';
import { GlobalNavbar } from './layout/GlobalNavbar';
import { CustomButton } from './common/CustomButton';
import { CLIENT_EVENTS } from '../../shared/socketEvents.js';

interface LobbySetupViewProps {
  onJoinSuccess: (roomId: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void;
}

interface SocketResponse {
  success: boolean;
  roomId: string;
  maxPlayers?: number;
  players?: string[]; 
  message?: string;
}

// Physical Lock
let isCreatingLock = false; 

export const LobbySetupView: React.FC<LobbySetupViewProps> = memo(({ 
  onJoinSuccess, onOpenSettings, onOpenHelp, onOpenRanking 
}) => {
  const { addLog, setStatus, playerName, authenticatedFetch } = useGameStore();
  const [showConfig, setShowConfig] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [config, setConfig] = useState({
    roomName: "OP_CEBU_STRIKE",
    maxPlayers: 2, 
    turnTime: 60,
  });

  const handleFinalCreate = useCallback(async (): Promise<void> => {
    if (isCreatingLock) return;
    isCreatingLock = true;

    try {
      SoundManager.playSe('click');
      addLog(`📡 Requesting operational clearance from HQ...`);

      socket.emit(CLIENT_EVENTS.CREATE_ROOM, { ...config, username: playerName }, async (response: SocketResponse) => {
        if (response && response.success && response.roomId) {
          const serverRoomId = response.roomId; 
          
          addLog(`✅ Clearance Granted: Room[${serverRoomId}] successfully established`);

          try {
            await authenticatedFetch('create-room.php', {
              method: 'POST',
              body: JSON.stringify({ ...config, roomId: serverRoomId, username: playerName })
            });
          } catch (_dbErr) { console.error("DB Sync Error", _dbErr); }

          setStatus({ 
            maxPlayers: response.maxPlayers || config.maxPlayers,
            roomId: serverRoomId, 
            view: 'waiting',
            players: [{ 
              id: "host", 
              name: playerName, 
              username: playerName
            }]
          });

          onJoinSuccess(serverRoomId);

        } else {
          addLog(`❌ Socket Clearance Failed: ${response?.message || "Server error"}`);
          isCreatingLock = false;
        }
      });

    } catch (_err: unknown) {
      addLog("❌ API Connection Error");
      isCreatingLock = false;
    }
  }, [config, playerName, addLog, setStatus, onJoinSuccess, authenticatedFetch]);

  const handleJoin = useCallback(async (): Promise<void> => {
    const cleanId = joinId.replace(/\s/g, '').toUpperCase();
    
    if (cleanId.length !== 6) {
      addLog(`⚠️ Code must be 6 characters (Current: ${cleanId.length})`);
      return;
    }

    try { SoundManager.playSe('click'); } catch { /* ignore */ }
    addLog(`📡 Attempting connection to Room[${cleanId}]...`);

    try {
      const dbResult = await authenticatedFetch<{ status: string; message?: string }>('join-room.php', {
        method: 'POST',
        body: JSON.stringify({ roomId: cleanId, username: playerName })
      });

      if (dbResult.status === 'success') {
        socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomId: cleanId, username: playerName });
        setStatus({
          roomId: cleanId,
          view: 'waiting',
          players: [{ id: "loading", name: playerName, username: playerName }]
        });
        onJoinSuccess(cleanId);
      } else {
        addLog(`❌ Server Rejected: ${dbResult.message || "Unknown error"}`);
      }
    } catch (_err: unknown) {
      addLog("❌ API Connection Error");
    }
  }, [joinId, playerName, addLog, onJoinSuccess, setStatus, authenticatedFetch]);

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-200 font-body relative flex flex-col overflow-y-auto custom-scrollbar z-0">
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/60">
          {/* 🚀 リデザイン：のっぺり感をなくし、ソリッドで洗練された rounded-2xl のパネルに */}
          <div className="w-full max-w-lg rounded-2xl border border-slate-700/50 bg-[#0f172a]/95 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(234,88,12,0.15)] animate-fadeIn overflow-hidden relative">
            
            {/* 上部のオレンジのアクセントライン */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-600 to-orange-400"></div>

            <div className="p-8 md:p-10 relative z-10 text-left text-white">
              <div className="mb-8 flex flex-col">
                <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter font-fix text-white">
                  Operation <span className="text-orange-500">Parameters</span>
                </h2>
                <div className="h-px w-16 bg-orange-500 mt-3 opacity-80"></div>
              </div>
              
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 font-fix">
                    <span className="material-symbols-outlined text-[14px] text-orange-500">group</span>
                    Select Squad Format
                  </label>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {[2, 3, 4].map(num => {
                      const isActive = config.maxPlayers === num;
                      return (
                        <button key={num} onClick={() => setConfig({...config, maxPlayers: num})}
                          className={`relative flex flex-col items-center justify-center py-6 transition-all duration-300 border rounded-xl overflow-hidden group ${
                            isActive 
                              ? 'bg-orange-500/10 border-orange-500 shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]' 
                              : 'bg-slate-900/50 border-slate-700/50 hover:border-orange-500/40 hover:bg-slate-800'
                          }`}>
                          
                          {/* 選択時の上部発光ライン */}
                          {isActive && <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-500"></div>}
                          
                          {/* 🚀 リデザイン：「2P」を廃止しつつ、スッカスカにならないようアクセント文字を追加 */}
                          <span className={`text-xl md:text-2xl font-black font-fix uppercase tracking-widest transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                            {num === 2 ? 'DUO' : num === 3 ? 'TRIO' : 'SQUAD'}
                          </span>
                          
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 🚀 リデザイン：Warningエリアを本物のシステム警告っぽくシャープに */}
                <div className="bg-orange-950/20 border-l-2 border-orange-500 p-4 text-left rounded-r-xl flex gap-3 items-start">
                  <span className="material-symbols-outlined text-orange-500 text-[16px]">warning</span>
                  <p className="text-[10px] text-orange-500/80 leading-relaxed font-fix uppercase tracking-widest mt-0.5">
                    Warning: Changing operator capacity will reconfigure the neural link. Confirm squad readiness.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <CustomButton onClick={() => setShowConfig(false)} variant="ghost" className="flex-1 rounded-xl border border-slate-700/50 hover:bg-slate-800 text-xs tracking-widest">Abort</CustomButton>
                <CustomButton onClick={handleFinalCreate} variant="primary" className="flex-[2] rounded-xl text-xs tracking-widest shadow-[0_0_15px_rgba(234,88,12,0.4)]">Initiate Operation</CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} />
      
      <main className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 md:p-10 z-10 pt-24 md:pt-20">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-white uppercase mb-8 md:mb-12 animate-pulse font-fix drop-shadow-lg">
          Tactical Setup
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 w-full max-w-5xl">
          
          {/* 🚀 リデザイン：メインカード。rounded-2xlに統一しつつ、内側の余白と境界線を整えてのっぺり感を排除 */}
          <div className="relative p-8 md:p-10 flex flex-col border border-slate-700/50 bg-slate-900/60 backdrop-blur-md text-left rounded-2xl shadow-2xl overflow-hidden group hover:border-orange-500/30 transition-colors duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 group-hover:via-orange-500 to-transparent transition-colors duration-500"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-3xl text-orange-500">add_box</span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter font-fix">Create Room</h2>
            </div>
            
            <p className="text-slate-400 text-xs mb-10 leading-relaxed font-fix">Establish a new command post and generate a unique uplink code for your squad.</p>
            
            <CustomButton onClick={() => { try{SoundManager.playSe('click');} catch {} setShowConfig(true); }} variant="primary" className="mt-auto w-full text-base py-4 rounded-xl shadow-lg hover:shadow-orange-500/20 tracking-widest font-fix">
              Configure Operation
            </CustomButton>
          </div>
          
          <div className="relative p-8 md:p-10 flex flex-col border border-slate-700/50 bg-slate-900/60 backdrop-blur-md text-left rounded-2xl shadow-2xl overflow-hidden group hover:border-cyan-500/30 transition-colors duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 group-hover:via-cyan-500 to-transparent transition-colors duration-500"></div>

            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-3xl text-cyan-400">login</span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter font-fix">Join Room</h2>
            </div>
            
            <div className="mb-10 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block font-fix">Enter Command Code</label>
              <input type="text" value={joinId} placeholder="0 0 0 0 0 0"
                onChange={(e) => {
                  let val = e.target.value.toUpperCase();
                  val = val.replace(/[^A-Z0-9\s]/g, '');
                  if (val.replace(/\s/g, '').length > 6) return;
                  setJoinId(val);
                }}
                className="w-full bg-black/60 border border-slate-700/80 rounded-xl py-4 px-6 text-3xl font-black tracking-[0.5em] text-cyan-400 text-center focus:outline-none focus:border-cyan-500 focus:bg-black/80 transition-all font-mono shadow-inner"
              />
            </div>
            
            <CustomButton onClick={handleJoin} disabled={joinId.replace(/\s/g, '').length !== 6} variant="primary" className={`mt-auto w-full text-base py-4 rounded-xl tracking-widest font-fix shadow-lg ${joinId.replace(/\s/g, '').length === 6 ? '!bg-cyan-600 hover:!bg-cyan-500 shadow-cyan-500/20' : ''}`}>
              Join Operation
            </CustomButton>
          </div>

        </div>
      </main>

      <style>{`
        .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(250, 112, 0, 0.5); border-radius: 10px; }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.3) 0%, rgba(249, 115, 22, 0) 70%); }
        .island-silhouette { background-image: linear-gradient(to top, #020617 15%, transparent 100%), url(https://lh3.googleusercontent.com/aida-public/AB6AXuDSuA1bkSkNiW2UkyuB77YfeoYUjF4RMpZ16m0xEgLDdDSHOMLBYhyIIjnbVAs8TTaIwLQCxKn2JcrAKeV6fLP2c1f3RD7XyIYEoCG6uxUGrVpCcoYNd8wLip7vqftuMd8sYI25g2ZndcGE8mtGgO0cgQFS-A1Zam7Vc6wuHt1LxTjBSc4SH3c7_Qf9OZjd_C9D4Kv-0_cYa0hET5HdZEFNtdgOhbxVNTlrQqAaG-xc_U1BikHRjSwk2UCVtTkuiUQsSawMVVm16hY); background-size: cover; background-position: center bottom; }
      `}</style>
    </div>
  );
});

export default LobbySetupView;