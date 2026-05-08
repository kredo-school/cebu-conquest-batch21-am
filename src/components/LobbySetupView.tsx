/// <reference types="vite/client" />
import React, { useState, memo } from 'react';
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

  const handleFinalCreate = async (): Promise<void> => {
    try { SoundManager.playSe('click'); } catch { /* ignore */ }
    addLog("📡 サーバーへ作戦承認をリクエスト中...");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/create-room.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cebu-conquest-token')}`
        },
        body: JSON.stringify({ ...config, username: playerName })
      });
      const dbResult = (await response.json()) as ApiResponse;
      if (dbResult.status !== 'success') {
        addLog(`❌ DB登録失敗: ${dbResult.message || "Unknown error"}`);
        return;
      }
    } catch (_err: unknown) {
      addLog("❌ API接続エラー: Createエンドポイントに到達できません");
      return;
    }

    socket.emit(CLIENT_EVENTS.CREATE_ROOM, { ...config, username: playerName }, (response: SocketResponse) => {
      if (response && response.success && response.roomId) {
        addLog(`✅ 作戦承認: Room[${response.roomId}] を構築しました`);
        
        // 🚀 修正 (image_6f641b): Player型に必要な 'username' を追加してマッピング
        const playerObjects: Player[] = (response.players || [playerName]).map((name, index) => ({
          id: index === 0 ? "host" : `player-${index}`,
          name: name,
          username: name, // ✅ これが足りなかった！Player型に必須な項目を追加
          isHost: index === 0,
          status: 'ready'
        }));

        setStatus({ 
          maxPlayers: response.maxPlayers || config.maxPlayers,
          roomId: response.roomId,
          players: playerObjects 
        });
        onJoinSuccess(response.roomId);
      }
    });
  };

  const handleJoin = async (): Promise<void> => {
    if (joinId.length === 6) {
      try { SoundManager.playSe('click'); } catch { /* ignore */ }
      addLog(`📡 Room[${joinId}] への接続を試行中...`);

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/join-room.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('cebu-conquest-token')}`
          },
          body: JSON.stringify({ roomId: joinId.toUpperCase(), username: playerName })
        });
        const dbResult = (await response.json()) as ApiResponse;
        if (dbResult.status !== 'success') {
          addLog(`❌ DB参加登録失敗: ${dbResult.message}`);
          return;
        }
      } catch (_err: unknown) {
        addLog("❌ API接続エラー: Joinエンドポイントに到達できません");
        return;
      }

      socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomId: joinId.toUpperCase(), username: playerName }, (response: SocketResponse) => {
        if (response && response.success) {
          onJoinSuccess(joinId.toUpperCase());
        }
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-200 text-left overflow-y-auto custom-scrollbar">
      <GlobalNavbar onOpenSettings={onOpenSettings} onOpenHelp={onOpenHelp} onOpenRanking={onOpenRanking} />
      <main className="flex-1 flex flex-col items-center justify-center p-10 py-20">
        <h1 className="text-5xl font-black italic mb-12 uppercase font-fix">Tactical Setup</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
          <div className="glass-panel p-10 border border-white/5 bg-slate-900/40">
            <h2 className="text-2xl font-black mb-6 uppercase font-fix">Create Room</h2>
            <CustomButton onClick={() => setShowConfig(true)} variant="primary" className="w-full py-4">Configure Operation</CustomButton>
          </div>
          <div className="glass-panel p-10 border border-white/5 bg-slate-900/40">
            <h2 className="text-2xl font-black mb-6 uppercase font-fix">Join Room</h2>
            <input type="text" maxLength={6} value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())} placeholder="0 0 0 0 0 0"
              className="w-full bg-black/40 border border-slate-800 rounded-lg py-4 px-6 text-3xl font-black text-cyan-400 text-center font-mono"
            />
            <CustomButton onClick={handleJoin} disabled={joinId.length !== 6} variant="primary" className="w-full py-4 mt-6">Join Operation</CustomButton>
          </div>
        </div>
      </main>
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
          <div className="w-full max-w-lg glass-panel tactical-border-modal border-t-4 border-brand-500 p-10 bg-slate-900/90 shadow-[0_0_80px_rgba(250,112,0,0.2)]">
            <h2 className="text-2xl font-black text-white mb-8 uppercase font-fix">Operation Parameters</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map(num => (
                  <button key={num} onClick={() => setConfig({...config, maxPlayers: num})} 
                    className={`py-4 border ${config.maxPlayers === num ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-white/10 text-slate-500'}`}>
                    {num}P
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-8">
                <CustomButton onClick={() => setShowConfig(false)} variant="ghost" className="flex-1">Abort</CustomButton>
                <CustomButton onClick={handleFinalCreate} variant="primary" className="flex-[2]">Initiate</CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`.tactical-border-modal { clip-path: polygon(0 0, 92% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%); } .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #fa7000; border-radius: 10px; }`}</style>
    </div>
  );
});

export default LobbySetupView;