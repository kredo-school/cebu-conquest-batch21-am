import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';

interface LobbyViewProps {
  roomId: string;
  players: any[];
}

export const LobbyView: React.FC<LobbyViewProps> = ({ roomId, players }) => {
  // 🚀 ストアから chatLogs と isServerOnline を取得
  const { myId, addLog, maxPlayers = 4, isServerOnline, chatLogs } = useGameStore(); 
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // 🚀 チャット最下部への自動スクロール用
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentCount = Math.max(players.length, 1);

  useEffect(() => {
    SoundManager.playBgm('lobby');
  }, []);

  // 🚀 チャット更新時に自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatLogs]);

  const handleCopyId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    try { SoundManager.playSe('click'); } catch (e) {}
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAbort = () => {
    if (window.confirm("ABORT MISSION? (作戦を中止してベースへ戻りますか？)")) {
      try { SoundManager.playSe('click'); } catch (e) {}
      socket.emit('LEAVE_ROOM', { roomId });
      window.dispatchEvent(new CustomEvent('DEBUG_GOTO_SETUP')); 
    }
  };

  const handleDebugWarp = () => {
    try { SoundManager.playSe('click'); } catch (e) {}
    addLog("🛠️ DEBUG: Force skipping lobby wait...");
    window.dispatchEvent(new CustomEvent('DEBUG_START_SELECTION'));
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      socket.emit('SEND_CHAT', { roomId, message: chatInput });
      setChatInput(''); 
      try { SoundManager.playSe('click'); } catch (e) {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const handleReady = () => {
    const nextReadyState = !isReady;
    setIsReady(nextReadyState);
    try { SoundManager.playSe('click'); } catch (e) {}
    socket.emit('PLAYER_READY', { roomId, ready: nextReadyState });
    addLog(nextReadyState ? "📡 READY完了。作戦開始を待機中..." : "📡 READY解除。装備を再確認中...");
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 font-body text-slate-100 overflow-hidden select-none">
      
      {/* 🛠️ デバッグ用ワープボタン */}
      <div className="absolute bottom-24 left-10 z-[100] pointer-events-auto">
        <button 
          onClick={handleDebugWarp}
          className="bg-cyan-900/30 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-500/30 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all opacity-40 hover:opacity-100 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
        >
          Force God Selection
        </button>
      </div>

      {/* 1. Header (Statusランプ追加) */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-950/90 border-b border-orange-900/30 shadow-2xl">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-brand-500 uppercase tracking-tighter">Cebu Conquest</span>
          
          {/* 🚀 修正：サーバー接続インジケーター */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isServerOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
            <span className={`text-[8px] font-black tracking-widest uppercase ${isServerOnline ? 'text-green-500' : 'text-red-500'}`}>
              Server: {isServerOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-4 text-slate-400">
            <span className="material-symbols-outlined cursor-pointer hover:text-brand-500 transition-colors">settings</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-brand-500 transition-colors">person</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-800"></div>
          <button onClick={handleAbort} className="flex items-center gap-2 text-[10px] font-black text-red-500 hover:text-red-400 transition-all uppercase tracking-[0.2em] group">
            <span className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">Abort Mission</span>
            <span className="material-symbols-outlined !text-lg">logout</span>
          </button>
        </div>
      </header>

      {/* 2. Main Area */}
      <main className="flex-1 mt-16 flex relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img className="w-full h-full object-cover opacity-20 grayscale brightness-50" src="https://images.unsplash.com/photo-1540206395-6880f94903af?q=80&w=2000" alt="background"/>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        </div>

        <section className="flex-1 flex flex-col p-8 z-10 overflow-y-auto max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-start mb-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Waiting...</h1>
              <div className="flex items-center gap-2 text-brand-500 font-bold uppercase tracking-[0.3em] text-sm animate-pulse">
                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                Awaiting Squad Synchronization
              </div>
            </div>

            {/* UPLINK CODE */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Tactical Uplink Code</span>
              <div onClick={handleCopyId} className="group relative cursor-pointer bg-slate-900/80 border border-brand-500/20 px-8 py-3 rounded-xl flex items-center gap-6 hover:border-brand-500 transition-all shadow-2xl">
                <span className="text-4xl font-black text-white tracking-[0.4em] font-mono select-all">{roomId || "------"}</span>
                <div className="flex flex-col items-center border-l border-white/10 pl-5 text-slate-500 group-hover:text-brand-500">
                  <span className="material-symbols-outlined !text-xl">{copied ? 'check_circle' : 'content_copy'}</span>
                  <span className="text-[8px] font-black uppercase mt-1">{copied ? 'COPIED' : 'COPY'}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">Room Capacity</p>
              <p className="text-3xl font-black text-white">
                {currentCount} <span className="text-brand-500">/ {maxPlayers}</span>
              </p>
            </div>
          </div>

          {/* プレイヤーリスト */}
          <div className={`grid gap-4 mb-8 ${maxPlayers === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {players.map((player) => (
              <div key={player.id} className={`p-4 rounded-xl border-l-4 bg-slate-900/60 backdrop-blur-md transition-all h-full ${player.isReady ? 'border-brand-500 shadow-lg' : 'border-slate-800 opacity-60'}`}>
                <div className="relative mb-3">
                  <img className={`w-full h-32 object-cover rounded-lg ${player.isReady ? '' : 'grayscale'}`} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name || player.id}`} alt="portrait" />
                  {player.id === myId && <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-950 text-[9px] font-black text-brand-500 rounded border border-brand-500/30">YOU</div>}
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <span className="font-black text-white uppercase text-xs truncate max-w-[80%]">{player.name || player.username || "Operator"}</span>
                  {player.isReady && <span className="material-symbols-outlined text-brand-500 text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 🚀 修正：チャットウィンドウ（履歴表示） */}
            <div className="lg:col-span-2 p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 h-64 flex flex-col overflow-hidden font-mono">
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar pr-2">
                <div className="border-b border-white/5 pb-2 mb-2">
                  <p className="text-brand-500 font-black uppercase text-[10px] tracking-widest animate-pulse">System: [Encrypted Link Established]</p>
                </div>
                
                {/* 🚀 チャットログのレンダリング */}
                {chatLogs.map((msg, i) => (
                  <div key={i} className="flex flex-col animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-slate-500">[{msg.timestamp}]</span>
                      <span className="text-[10px] font-black uppercase" style={{ color: msg.color }}>{msg.sender}:</span>
                    </div>
                    <p className="text-[11px] text-slate-200 pl-10 -mt-1 leading-relaxed">{msg.message}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 focus-within:border-brand-500 transition-colors">
                <input className="flex-1 bg-transparent py-2 px-4 text-xs text-white focus:outline-none" placeholder="Input tactical message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown}/>
                <button onClick={handleSendMessage} className="bg-brand-500 hover:bg-brand-400 text-slate-950 px-6 py-1.5 rounded-md font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">SEND</button>
              </div>
            </div>

            {/* READYパネル */}
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Location</p>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Cebu Island</h3>
              </div>
              <button 
                onClick={handleReady}
                className={`w-full font-black py-5 rounded-xl transition-all active:scale-95 shadow-2xl uppercase tracking-widest text-xl
                  ${isReady ? 'bg-slate-800 text-brand-500 border border-brand-500 shadow-[0_0_20px_rgba(250,112,0,0.2)]' : 'bg-brand-500 text-slate-950 hover:bg-brand-400'}`}
              >
                {isReady ? 'CANCEL' : 'READY'}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-4 px-8 flex justify-between items-center bg-slate-950 border-t border-slate-800 z-50">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-500">Cebu Conquest Tactical Systems</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">© 2026 Batch21-AM Deployment</p>
      </footer>
    </div>
  );
};