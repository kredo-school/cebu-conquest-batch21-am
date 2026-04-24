import React, { useState } from 'react';
import { useGameStore } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';

interface LobbySetupViewProps {
  onJoinSuccess: (roomId: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void; // 🚀 追加：ランキング画面を開くためのプロップス
}

export const LobbySetupView: React.FC<LobbySetupViewProps> = ({ 
  onJoinSuccess, onOpenSettings, onOpenHelp, onOpenRanking // 🚀 受け取る
}) => {
  const { addLog, setStatus, playerName } = useGameStore();
  
  const [showConfig, setShowConfig] = useState(false);
  const [joinId, setJoinId] = useState("");

  const [config, setConfig] = useState({
    roomName: "OP_CEBU_STRIKE",
    maxPlayers: 2, 
    turnTime: 60,
  });

  // --- 🛠️ 部屋作成の処理 ---
  const handleFinalCreate = () => {
    try { SoundManager.playSe('click'); } catch (e) {}
    addLog("📡 サーバーへ作戦承認をリクエスト中...");

    setStatus({ maxPlayers: config.maxPlayers });

    const createPayload = { 
      ...config, 
      username: playerName 
    };

    socket.emit('CREATE_ROOM', createPayload, (response: any) => {
      if (response && response.success) {
        addLog(`✅ 作戦承認: Room[${response.roomId}] を構築しました`);
        onJoinSuccess(response.roomId);
      } else {
        addLog("❌ ルーム作成失敗: サーバーの応答が不正です");
        alert("ルームを作成できませんでした。");
      }
    });
  };

  // --- 🛠️ 部屋参加の処理 ---
  const handleJoin = () => {
    if (joinId.length === 6) {
      try { SoundManager.playSe('click'); } catch (e) {}
      addLog(`📡 Room[${joinId}] への接続を試行中...`);

      const joinPayload = { 
        roomId: joinId.toUpperCase(),
        username: playerName 
      };

      socket.emit('JOIN_ROOM', joinPayload, (response: any) => {
        if (response && response.success) {
          onJoinSuccess(joinId.toUpperCase());
        } else {
          addLog("❌ 入室拒否: 該当する作戦コードが見つかりません");
          alert("指定されたルームが見つからないか、満員です。");
        }
      });
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-200 font-body relative overflow-hidden flex flex-col">
      
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/60">
          <div className="w-full max-w-md glass-panel border-t-2 border-brand-500 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fadeIn">
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-6 text-left">
              Operation <span className="text-brand-500">Parameters</span>
            </h2>
            <div className="space-y-6 text-left">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Max Operators</label>
                <div className="flex gap-2">
                  {[2, 3, 4].map(num => (
                    <button key={num} onClick={() => setConfig({...config, maxPlayers: num})}
                      className={`flex-1 py-2 rounded font-black transition-all ${config.maxPlayers === num ? 'bg-brand-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {num}P
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowConfig(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors text-center">Cancel</button>
              <button onClick={handleFinalCreate} className="flex-[2] bg-brand-500 hover:bg-brand-400 text-slate-950 py-3 rounded font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all text-center">Initiate Operation</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Header: ボタン配置を整理 */}
      <header className="px-10 py-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md z-10">
        <div className="text-2xl font-black italic tracking-tighter text-brand-500 font-mono text-left">CEBU CONQUEST</div>
        
        <div className="flex items-center gap-6">
          {/* 🚀 ランキングボタンを追加 */}
          <button 
            onClick={onOpenRanking}
            className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
            title="LEADERBOARD"
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-orange-500 transition-colors">
              leaderboard
            </span>
          </button>

          {/* ヘルプボタン */}
          <button 
            onClick={onOpenHelp}
            className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
            title="HELP / MANUAL"
          >
            <span className="material-symbols-outlined text-cyan-400 group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              help
            </span>
          </button>

          {/* 設定ボタン */}
          <button 
            onClick={onOpenSettings}
            className="pointer-events-auto flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
            title="SETTINGS"
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-brand-500 transition-colors">
              settings
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10 z-10">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase mb-12">Tactical Setup</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 relative overflow-hidden text-left">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Create Room</h2>
            <p className="text-slate-400 text-xs mb-10 leading-relaxed italic text-left">Establish a new command post and generate a unique uplink code for your squad.</p>
            <button onClick={() => { try{SoundManager.playSe('click');}catch(e){} setShowConfig(true); }}
              className="mt-auto w-full bg-brand-500 hover:bg-brand-400 text-slate-950 py-5 rounded-lg font-black uppercase tracking-widest text-lg shadow-lg active:scale-95 transition-all pointer-events-auto text-center"
            >
              Configure Operation
            </button>
          </div>

          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 relative overflow-hidden text-left">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Join Room</h2>
            <div className="mb-10 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Enter Command Code</label>
              <input 
                type="text" 
                maxLength={6}
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="0 0 0 0 0 0"
                className="w-full bg-black/40 border border-slate-800 rounded-lg py-4 px-6 text-3xl font-black tracking-[0.5em] text-cyan-400 text-center focus:outline-none focus:border-cyan-500 transition-all uppercase placeholder:opacity-10 font-mono pointer-events-auto"
              />
            </div>
            
            <button 
              onClick={handleJoin}
              disabled={joinId.length !== 6}
              className={`mt-auto w-full py-5 rounded-lg font-black uppercase tracking-widest text-lg transition-all active:scale-95 pointer-events-auto text-center
                ${joinId.length === 6 
                  ? 'bg-slate-100 text-slate-900 hover:bg-white shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
            >
              Join Operation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};