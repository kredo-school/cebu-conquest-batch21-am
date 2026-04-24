import React, { useState } from 'react';
import { useGameStore } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';

interface LobbySetupViewProps {
  onJoinSuccess: (roomId: string) => void;
}

export const LobbySetupView: React.FC<LobbySetupViewProps> = ({ onJoinSuccess }) => {
  const { addLog } = useGameStore();
  
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

    const timeoutId = setTimeout(() => {
      addLog("⚠️ サーバー応答なし。デバッグモードでロビーを強制構築します。");
      onJoinSuccess("DEBUG-999"); 
    }, 2000);

    socket.emit('CREATE_ROOM', config, (response: any) => {
      clearTimeout(timeoutId); 
      if (response && response.success) {
        addLog(`✅ 作戦承認: Room[${response.roomId}] を構築しました`);
        onJoinSuccess(response.roomId);
      } else {
        onJoinSuccess("DEBUG-999");
      }
    });
  };

  // --- 🛠️ 部屋参加の処理 ---
  const handleJoin = () => {
    // 🚀 修正点1：6文字以上なら実行可能にする
    if (joinId.length >= 6) {
      try { SoundManager.playSe('click'); } catch (e) {}
      
      const timeoutId = setTimeout(() => {
        onJoinSuccess(joinId.toUpperCase());
      }, 2000);

      socket.emit('JOIN_ROOM', { roomId: joinId.toUpperCase() }, (response: any) => {
        clearTimeout(timeoutId);
        if (response && response.success) {
          onJoinSuccess(joinId.toUpperCase());
        } else {
          onJoinSuccess(joinId.toUpperCase());
        }
      });
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-200 font-body relative overflow-hidden flex flex-col">
      
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/60">
          <div className="w-full max-w-md glass-panel border-t-2 border-brand-500 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fadeIn">
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-6">
              Operation <span className="text-brand-500">Parameters</span>
            </h2>
            <div className="space-y-6">
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
              <button onClick={() => setShowConfig(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleFinalCreate} className="flex-[2] bg-brand-500 hover:bg-brand-400 text-slate-950 py-3 rounded font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Initiate Operation</button>
            </div>
          </div>
        </div>
      )}

      <header className="px-10 py-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md z-10">
        <div className="text-2xl font-black italic tracking-tighter text-brand-500">CEBU CONQUEST</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10 z-10">
        <h1 className="text-7xl font-black italic tracking-tighter text-white uppercase mb-12">Operation Setup</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 relative overflow-hidden">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Create Room</h2>
            <button onClick={() => { try{SoundManager.playSe('click');}catch(e){} setShowConfig(true); }}
              className="mt-auto w-full bg-brand-500 hover:bg-brand-400 text-slate-950 py-5 rounded-lg font-black uppercase tracking-widest text-lg shadow-lg active:scale-95 transition-all"
            >
              Configure Operation
            </button>
          </div>

          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 relative overflow-hidden">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Join Room</h2>
            <div className="mb-10">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Enter Room ID</label>
              <input 
                type="text" 
                maxLength={12}
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="D E B U G - 9 9 9"
                className="w-full bg-black/40 border border-slate-800 rounded-lg py-4 px-6 text-2xl font-black tracking-[0.1em] text-cyan-400 text-center focus:outline-none focus:border-cyan-500 transition-all uppercase placeholder:opacity-20"
              />
            </div>
            
            {/* 🚀 修正点2：見た目の切り替え判定も `>= 6` に統一 */}
            <button 
              onClick={handleJoin}
              disabled={joinId.length < 6}
              className={`mt-auto w-full py-5 rounded-lg font-black uppercase tracking-widest text-lg transition-all active:scale-95
                ${joinId.length >= 6 
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