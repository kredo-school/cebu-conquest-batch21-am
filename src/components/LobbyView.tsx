import React, { useState, useEffect } from 'react';
import socket from '../socket';
import { useGameStore } from '../store';
import SoundManager from '../game/SoundManager';

interface LobbyViewProps {
  roomId: string;
  players: any[];
}

export const LobbyView: React.FC<LobbyViewProps> = ({ roomId, players }) => {
  const { myId, addLog } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const [isReady, setIsReady] = useState(false);

  // 🚀 マウント時にBGMを再生
  useEffect(() => {
    SoundManager.playBgm('lobby');
  }, []);

  // 🚀 チャット送信ロジック
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      socket.emit('SEND_CHAT', { roomId, message: chatInput });
      setChatInput(''); 
      SoundManager.playSe('click'); 
    }
  };

  // 🚀 Enterキー対応
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // READYボタンの処理
  const handleReady = () => {
    const nextReadyState = !isReady;
    setIsReady(nextReadyState);
    SoundManager.playSe('click'); 
    socket.emit('PLAYER_READY', { roomId, ready: nextReadyState });
    addLog(nextReadyState ? "📡 READY完了。作戦開始を待機中..." : "📡 READY解除。装備を再確認中...");
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 font-body text-slate-100 overflow-hidden select-none">
      
      {/* 1. Header (上部固定) */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-slate-950/90 border-b border-orange-900/30 shadow-2xl">
        <span className="text-xl font-black text-brand-500 uppercase tracking-tighter">Cebu Conquest</span>
        <div className="flex gap-4 text-slate-400">
          <span className="material-symbols-outlined cursor-pointer hover:text-brand-500" onClick={() => SoundManager.playSe('click')}>settings</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-brand-500" onClick={() => SoundManager.playSe('click')}>person</span>
        </div>
      </header>

      {/* 2. Main Area */}
      <main className="flex-1 mt-16 flex relative overflow-hidden">
        {/* 背景画像とグラデーション */}
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover opacity-20 grayscale brightness-50" 
            src="https://images.unsplash.com/photo-1540206395-6880f94903af?q=80&w=2000" 
            alt="background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        </div>

        <section className="flex-1 flex flex-col p-8 z-10 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* 部屋情報・キャパシティ */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">Waiting...</h1>
              <div className="flex items-center gap-2 text-brand-500 font-bold uppercase tracking-[0.3em] text-sm animate-pulse">
                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                Waiting for players to ready up
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-black">Room Capacity</p>
              <p className="text-3xl font-black text-white">{players.length} <span className="text-brand-500">/ 8</span></p>
            </div>
          </div>

          {/* プレイヤーリスト（グリッド表示） */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {players.map((player) => (
              <div 
                key={player.id}
                className={`p-4 rounded-xl border-l-4 bg-slate-900/60 backdrop-blur-md transition-all h-full
                  ${player.isReady ? 'border-brand-500 shadow-[0_0_15px_rgba(250,112,0,0.2)]' : 'border-slate-800 opacity-60'}`}
              >
                <div className="relative mb-3">
                  <img 
                    className={`w-full h-32 object-cover rounded-lg ${player.isReady ? 'grayscale-0' : 'grayscale'}`} 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name || player.username || player.id}`} 
                    alt="portrait" 
                  />
                  {player.id === myId && <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-950 text-[9px] font-black text-brand-500 rounded border border-brand-500/30">YOU</div>}
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <span className="font-black text-white uppercase text-xs truncate max-w-[80%]">
                    {player.name || player.username || "Operator"}
                  </span>
                  {player.isReady && <span className="material-symbols-outlined text-brand-500 text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>}
                </div>
              </div>
            ))}
          </div>

          {/* 下部エリア：チャット & 操作パネル */}
          <div className="mt-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* チャットウィンドウ */}
            <div className="lg:col-span-2 p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 h-64 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto text-[11px] space-y-2 mb-4 custom-scrollbar pr-2">
                <p className="text-brand-500 font-bold tracking-widest uppercase">System: [Encrypted Link Established]</p>
                <p className="text-slate-400 italic">Room ID: {roomId}</p>
                {/* チャットメッセージの表示ロジックはここに追加 */}
              </div>
              
              <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 focus-within:border-brand-500 transition-colors">
                <input 
                  className="flex-1 bg-transparent py-2 px-4 text-xs text-white focus:outline-none"
                  placeholder="Input tactical message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button 
                  onClick={handleSendMessage}
                  className="bg-brand-500 hover:bg-brand-400 text-slate-950 px-4 py-1.5 rounded-md font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 shadow-lg"
                >
                  SEND
                  <span className="material-symbols-outlined text-xs">send</span>
                </button>
              </div>
            </div>

            {/* サイド操作パネル */}
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Location</p>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Cebu Island</h3>
              </div>
              
              {/* READY / CANCEL ボタン */}
              <button 
                onClick={handleReady}
                className={`w-full font-black py-5 rounded-xl transition-all active:scale-95 shadow-2xl uppercase tracking-widest text-xl
                  ${isReady 
                    ? 'bg-slate-800 text-brand-500 border border-brand-500 shadow-[0_0_20px_rgba(250,112,0,0.2)]' 
                    : 'bg-brand-500 text-slate-950 hover:bg-brand-400 shadow-brand-500/20'}`}
              >
                {isReady ? 'CANCEL' : 'READY'}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 3. Footer */}
      <footer className="w-full py-4 px-8 flex justify-between items-center bg-slate-950 border-t border-slate-800 z-50">
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span className="text-brand-500">Cebu Conquest Tactical Systems</span>
          <div className="h-3 w-[1px] bg-slate-800"></div>
          <p>© 2026 Batch21-AM Deployment</p>
        </div>
      </footer>
    </div>
  );
};