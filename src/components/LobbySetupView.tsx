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
  roomId?: string;
  maxPlayers?: number;
  players?: string[]; 
  message?: string;
}

interface ApiResponse {
  status: string;
  message?: string;
}

// 🚀 1. 物理ロック（1回クリックしたら、画面が消えるまで2度と通さない）
let isCreatingLock = false; 

export const LobbySetupView: React.FC<LobbySetupViewProps> = memo(({ 
  onJoinSuccess, onOpenSettings, onOpenHelp, onOpenRanking 
}) => {
  const { addLog, setStatus, playerName } = useGameStore();
  const [showConfig, setShowConfig] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [config, setConfig] = useState({
    roomName: "OP_CEBU_STRIKE",
    maxPlayers: 2, 
    turnTime: 60,
  });

  // --- 🚀 部屋作成ロジック（不一致と型エラーを解消） ---
  const handleFinalCreate = async (): Promise<void> => {
    if (isCreatingLock) return;
    isCreatingLock = true;

    try {
      SoundManager.playSe('click');

      // 🚀 2. ID生成はここで行い、この変数を「一生」使い回す
      const generatedRoomId = (Math.random().toString(36).substring(2, 5) + Date.now().toString(36).slice(-3)).toUpperCase();
      const token = localStorage.getItem('cebu-conquest-token');

      addLog(`📡 作戦承認リクエスト中... [ID: ${generatedRoomId}]`);

      // 🚀 3. PHPへ「このID」を送る（roomIdというキー名を明示）
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/create-room.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          roomName: config.roomName,
          maxPlayers: config.maxPlayers,
          turnTime: config.turnTime,
          roomId: generatedRoomId, // 👈 ここでIDを送る
          username: playerName 
        })
      });

      const dbResult = await response.json();
      
      if (dbResult.status === 'success') {
        // 🚀 4. DBが成功したID（generatedRoomId）を画面にセット
        // 修正：赤線エラー(status/isHost)が出ないよう、Player型の最小構成に
        setStatus({ 
          maxPlayers: config.maxPlayers,
          roomId: generatedRoomId, 
          view: 'waiting',
          players: [{ 
            id: "host", 
            name: playerName, 
            username: playerName
          }]
        });

        // 🚀 5. Socket通知
        socket.emit(CLIENT_EVENTS.CREATE_ROOM, { ...config, roomId: generatedRoomId, username: playerName });

        // 🚀 6. 画面遷移
        onJoinSuccess(generatedRoomId);

      } else {
        addLog(`❌ DB登録失敗: ${dbResult.message}`);
        isCreatingLock = false; // 失敗時のみやり直しを許可
      }
    } catch (err) {
      addLog("❌ API接続エラー");
      isCreatingLock = false;
    }
  };

  // --- 🚀 参加ロジック（型エラー修正のみ） ---
  const handleJoin = async (): Promise<void> => {
    if (joinId.length !== 6) return;
    const targetRoomId = joinId.toUpperCase();
    try { SoundManager.playSe('click'); } catch { /* ignore */ }
    addLog(`📡 Room[${targetRoomId}] 接続試行中...`);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/join-room.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cebu-conquest-token')}`
        },
        body: JSON.stringify({ roomId: targetRoomId, username: playerName })
      });

      const dbResult = await response.json();
      if (dbResult.status === 'success') {
        socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomId: targetRoomId, username: playerName });
        setStatus({
          roomId: targetRoomId,
          view: 'waiting',
          players: [{ id: "loading", name: playerName, username: playerName }]
        });
        onJoinSuccess(targetRoomId);
      } else {
        addLog(`❌ サーバー拒否: ${dbResult.message}`);
      }
    } catch (err) {
      addLog("❌ API接続エラー");
    }
  };

  // --- デザイン部分はそのまま維持 ---
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-200 font-body relative flex flex-col overflow-y-auto custom-scrollbar z-0">
      <div className="fixed inset-0 -z-10 island-silhouette opacity-40 pointer-events-none" />
      <div className="fixed inset-0 -z-10 tropical-flare pointer-events-none" />

      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
          <div className="w-full max-w-lg glass-panel tactical-border-modal border-t-4 border-brand-500 p-1 bg-slate-900/90 shadow-[0_0_80px_rgba(250,112,0,0.2)] animate-fadeIn">
            <div className="p-10 bg-black/40 text-left">
              <div className="mb-10 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-black text-brand-500 tracking-[0.4em] uppercase mb-1 font-fix">System:// Protocol_Init</div>
                  <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter font-fix text-left">
                    Operation <span className="text-brand-500">Parameters</span>
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-mono text-slate-500 leading-none font-fix">ID: CC-B21-AM</div>
                  <div className="text-[8px] font-mono text-brand-500 animate-pulse mt-1 font-fix">UPLINK_ACTIVE</div>
                </div>
              </div>
              <div className="space-y-8">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 font-fix">
                    <span className="w-1 h-3 bg-brand-500"></span> Max Operators
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[2, 3, 4].map(num => (
                      <button key={num} onClick={() => setConfig({...config, maxPlayers: num})}
                        className={`relative flex flex-col items-center justify-center py-6 transition-all duration-300 border ${
                          config.maxPlayers === num ? 'bg-brand-500/20 border-brand-500 shadow-[0_0_20px_rgba(250,112,0,0.3)] text-white' : 'bg-slate-800/30 border-white/5 hover:border-brand-500/40 text-slate-500'
                        }`}>
                        <span className="text-2xl font-black font-fix">{num}P</span>
                        <span className="text-[8px] font-bold tracking-widest mt-1 font-fix">{num === 2 ? 'DUO_LINK' : num === 3 ? 'TRIO_FORMATION' : 'FULL_SQUAD'}</span>
                        {config.maxPlayers === num && <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 animate-ping"></div>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-800/20 border-l-2 border-brand-500 p-4">
                  <p className="text-[9px] text-slate-400 leading-relaxed italic uppercase tracking-wider font-fix text-left">
                    Warning: Changing operator capacity will reconfigure the neural link. Confirm all members are ready before initiating.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 mt-12">
                <CustomButton onClick={() => setShowConfig(false)} variant="ghost" className="flex-1">Abort</CustomButton>
                <CustomButton onClick={handleFinalCreate} variant="primary" className="flex-[2]">Initiate Operation</CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} />
      <main className="flex-1 flex flex-col items-center justify-start md:justify-center p-10 z-10 py-20">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase mb-12 animate-pulse font-fix">Tactical Setup</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 text-left">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter font-fix">Create Room</h2>
            <p className="text-slate-400 text-xs mb-10 leading-relaxed italic font-fix">Establish a new command post and generate a unique uplink code for your squad.</p>
            <CustomButton onClick={() => setShowConfig(true)} variant="primary" className="mt-auto w-full text-lg py-4">Configure Operation</CustomButton>
          </div>
          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 text-left">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter font-fix">Join Room</h2>
            <div className="mb-10 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block font-fix">Enter Command Code</label>
              <input type="text" maxLength={6} value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())} placeholder="0 0 0 0 0 0"
                className="w-full bg-black/40 border border-slate-800 rounded-lg py-4 px-6 text-3xl font-black tracking-[0.5em] text-cyan-400 text-center focus:outline-none focus:border-cyan-500 transition-all font-mono"
              />
            </div>
            <CustomButton onClick={handleJoin} disabled={joinId.length !== 6} variant="primary" className={`mt-auto w-full text-lg py-4 ${joinId.length === 6 ? '!bg-slate-100 !text-slate-900 hover:!bg-white' : ''}`}>
              Join Operation
            </CustomButton>
          </div>
        </div>
      </main>

      <style>{`
        .tactical-border-modal { clip-path: polygon(0 0, 92% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%); }
        .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #fa7000; border-radius: 10px; }
        .tropical-flare { background: radial-gradient(circle at center, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0) 70%); }
        .island-silhouette { background-image: linear-gradient(to top, #020617 15%, transparent 100%), url(https://lh3.googleusercontent.com/aida-public/AB6AXuDSuA1bkSkNiW2UkyuB77YfeoYUjF4RMpZ16m0xEgLDdDSHOMLBYhyIIjnbVAs8TTaIwLQCxKn2JcrAKeV6fLP2c1f3RD7XyIYEoCG6uxUGrVpCcoYNd8wLip7vqftuMd8sYI25g2ZndcGE8mtGgO0cgQFS-A1Zam7Vc6wuHt1LxTjBSc4SH3c7_Qf9OZjd_C9D4Kv-0_cYa0hET5HdZEFNtdgOhbxVNTlrQqAaG-xc_U1BikHRjSwk2UCVtTkuiUQsSawMVVm16hY); background-size: cover; background-position: center bottom; }
      `}</style>
    </div>
  );
});

export default LobbySetupView;