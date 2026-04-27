import React, { useState } from 'react';
import { useGameStore } from '../store';
import socket from '../socket';
import SoundManager from '../game/SoundManager';

interface LobbySetupViewProps {
  onJoinSuccess: (roomId: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenRanking: () => void;
}

export const LobbySetupView: React.FC<LobbySetupViewProps> = ({ 
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
        setStatus({ maxPlayers: response.maxPlayers || config.maxPlayers });
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
          if (response.maxPlayers) {
            setStatus({ maxPlayers: response.maxPlayers });
          }
          onJoinSuccess(joinId.toUpperCase());
        } else {
          addLog("❌ 入室拒否: 該当する作戦コードが見つかりません");
          alert("指定されたルームが見つからないか、満員です。");
        }
      });
    }
  };

  return (
    // 🚀 修正：w-screen h-screen を w-full h-full に変更
    <div className="w-full h-full bg-slate-950 text-slate-200 font-body relative overflow-hidden flex flex-col">
      
      {/* 🚀 修正：タクティカル・パラメータ設定モーダル */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
          <div className="w-full max-w-lg glass-panel tactical-border-modal border-t-4 border-brand-500 p-1 bg-slate-900/90 shadow-[0_0_80px_rgba(250,112,0,0.2)] animate-fadeIn">
            <div className="p-10 bg-black/40">
              
              {/* Header: プロトコル名風 */}
              <div className="mb-10 flex justify-between items-start text-left">
                <div>
                  <div className="text-[10px] font-black text-brand-500 tracking-[0.4em] uppercase mb-1 font-fix">System:// Protocol_Init</div>
                  <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter font-fix">
                    Operation <span className="text-brand-500">Parameters</span>
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-mono text-slate-500 leading-none font-fix">ID: CC-B21-AM</div>
                  <div className="text-[8px] font-mono text-brand-500 animate-pulse mt-1 font-fix">UPLINK_ACTIVE</div>
                </div>
              </div>

              {/* 人数選択：スロット風デザイン */}
              <div className="space-y-8 text-left">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 font-fix">
                    <span className="w-1 h-3 bg-brand-500"></span> Max Operators
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[2, 3, 4].map(num => (
                      <button 
                        key={num} 
                        onClick={() => setConfig({...config, maxPlayers: num})}
                        className={`relative flex flex-col items-center justify-center py-6 transition-all duration-300 border ${
                          config.maxPlayers === num 
                            ? 'bg-brand-500/20 border-brand-500 shadow-[0_0_20px_rgba(250,112,0,0.3)] text-white' 
                            : 'bg-slate-800/30 border-white/5 hover:border-brand-500/40 text-slate-500'
                        }`}
                      >
                        <span className="text-2xl font-black font-fix">{num}P</span>
                        <span className="text-[8px] font-bold tracking-widest mt-1 font-fix">
                          {num === 2 ? 'DUO_LINK' : num === 3 ? 'TRIO_FORMATION' : 'FULL_SQUAD'}
                        </span>
                        {config.maxPlayers === num && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 animate-ping"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 警告表示 */}
                <div className="bg-slate-800/20 border-l-2 border-brand-500 p-4">
                  <p className="text-[9px] text-slate-400 leading-relaxed italic uppercase tracking-wider font-fix">
                    Warning: Changing operator capacity will reconfigure the neural link. 
                    Confirm all members are ready before initiating.
                  </p>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-4 mt-12">
                <button 
                  onClick={() => setShowConfig(false)} 
                  className="flex-1 py-4 text-[11px] font-black uppercase text-slate-500 hover:text-white hover:bg-white/5 transition-all tracking-[0.2em] font-fix"
                >
                  [ Abort ]
                </button>
                <button 
                  onClick={handleFinalCreate} 
                  className="flex-[2] relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-brand-500 skew-x-[-12deg] transition-transform group-hover:scale-105 shadow-lg shadow-brand-500/20"></div>
                  <span className="relative flex items-center justify-center gap-3 w-full py-4 text-slate-950 font-black uppercase tracking-[0.2em] text-sm italic font-fix">
                    Initiate Operation
                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-10 py-6 flex justify-between items-center border-b border-white/5 bg-slate-950/50 backdrop-blur-md z-10">
        <div className="text-2xl font-black italic tracking-tighter text-brand-500 font-mono text-left font-fix">CEBU CONQUEST</div>
        <div className="flex items-center gap-6">
          <button onClick={onOpenRanking} className="hover:scale-110 transition-all group" title="LEADERBOARD">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-orange-500">leaderboard</span>
          </button>
          <button onClick={onOpenHelp} className="hover:scale-110 transition-all group" title="HELP">
            <span className="material-symbols-outlined text-cyan-400 group-hover:text-cyan-300">help</span>
          </button>
          <button onClick={onOpenSettings} className="hover:scale-110 transition-all group" title="SETTINGS">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-brand-500">settings</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10 z-10">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase mb-12 animate-pulse font-fix">Tactical Setup</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 text-left">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter font-fix">Create Room</h2>
            <p className="text-slate-400 text-xs mb-10 leading-relaxed italic font-fix">Establish a new command post and generate a unique uplink code for your squad.</p>
            <button onClick={() => { try{SoundManager.playSe('click');}catch(e){} setShowConfig(true); }}
              className="mt-auto w-full bg-brand-500 hover:bg-brand-400 text-slate-950 py-5 rounded-lg font-black uppercase tracking-widest text-lg shadow-lg transition-all font-fix"
            >
              Configure Operation
            </button>
          </div>

          <div className="glass-panel p-10 flex flex-col border border-white/5 bg-slate-900/40 text-left">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter font-fix">Join Room</h2>
            <div className="mb-10">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block font-fix">Enter Command Code</label>
              <input type="text" maxLength={6} value={joinId} onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="0 0 0 0 0 0"
                className="w-full bg-black/40 border border-slate-800 rounded-lg py-4 px-6 text-3xl font-black tracking-[0.5em] text-cyan-400 text-center focus:outline-none focus:border-cyan-500 transition-all font-mono"
              />
            </div>
            <button onClick={handleJoin} disabled={joinId.length !== 6}
              className={`mt-auto w-full py-5 rounded-lg font-black uppercase tracking-widest text-lg transition-all font-fix ${joinId.length === 6 ? 'bg-slate-100 text-slate-900 hover:bg-white shadow-lg' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
            >
              Join Operation
            </button>
          </div>
        </div>
      </main>

      <style>{`
        .tactical-border-modal {
          clip-path: polygon(0 0, 92% 0, 100% 8%, 100% 100%, 8% 100%, 0 92%);
        }
        .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};