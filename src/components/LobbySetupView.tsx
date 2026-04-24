import React, { useState } from 'react';
import socket from '../socket';

interface LobbySetupViewProps {
  onJoinSuccess: (roomId: string) => void;
}

export const LobbySetupView: React.FC<LobbySetupViewProps> = ({ onJoinSuccess }) => {
  const [inputRoomId, setInputRoomId] = useState('');

  // ルーム作成
  const handleCreateRoom = () => {
    socket.emit('CREATE_ROOM', (response: { success: boolean; roomId: string }) => {
      if (response?.success) {
        onJoinSuccess(response.roomId);
      }
    });
  };

  // ルーム参加
  const handleJoinRoom = () => {
    if (inputRoomId.length !== 6) return;
    socket.emit('JOIN_ROOM', { roomId: inputRoomId.toUpperCase() }, (response: { success: boolean }) => {
      if (response?.success) {
        onJoinSuccess(inputRoomId.toUpperCase());
      } else {
        alert("Room not found or full.");
      }
    });
  };

  return (
    // 🚀 画面全体の高さを固定し、中身だけスクロールさせる設計
    <div className="bg-slate-950 text-slate-200 font-body h-screen flex flex-col overflow-hidden select-none">
      
      {/* 🚀 TopNavBar: shrink-0 で高さ固定 */}
      <nav className="shrink-0 relative z-50 flex justify-between items-center px-6 h-14 bg-slate-950/90 border-b border-brand-900/20 shadow-xl">
        <span className="text-lg font-black text-brand-500 uppercase tracking-tighter italic">Cebu Conquest</span>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="material-symbols-outlined cursor-pointer hover:text-brand-400 p-2">settings</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-brand-400 p-2">person</span>
        </div>
      </nav>

      {/* 🚀 Main Area: ここだけスクロール可能 (overflow-y-auto) */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden bg-slate-950 custom-scrollbar">
        
        {/* 背景装飾 (fixedにしてスクロールしても動かないように) */}
        <div className="fixed inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(250,112,0,0.03)_50%)] bg-[size:100%_4px] opacity-20 pointer-events-none"></div>
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* コンテンツを中央に配置するラッパー */}
        <div className="max-w-6xl w-full mx-auto px-6 relative z-10 flex flex-col min-h-full py-8">
          
          {/* 🚀 my-auto で縦方向の余白を自動調整し、画面が広い時だけ中央寄せ */}
          <div className="my-auto w-full flex flex-col items-center">
            
            <header className="text-center mb-8 shrink-0">
              <h1 className="text-4xl lg:text-6xl font-black italic tracking-tighter text-slate-100 uppercase leading-none">
                OPERATION SETUP
              </h1>
              <div className="mt-3 flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-brand-500/50"></div>
                <span className="text-brand-500 font-bold tracking-[0.6em] text-[10px]">TACTICAL INTERFACE</span>
                <div className="h-px w-12 bg-brand-500/50"></div>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full shrink-0">
              
              {/* Left: Create Room */}
              <section className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-6 lg:p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-8xl">fort</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-1.5 h-5 bg-brand-500"></span>
                  <h2 className="text-lg font-bold tracking-tight text-white uppercase">CREATE ROOM</h2>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed flex-1 mb-6">
                  Establish a new tactical link and lead your squad to victory in the Cebu theater. Create a room to get a unique room ID and share it with friends to play together.
                </p>
                <button 
                  onClick={handleCreateRoom}
                  className="mt-auto w-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-black py-3.5 rounded-lg uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-brand-500/20"
                >
                  CREATE ROOM
                </button>
              </section>

              {/* Right: Join Room */}
              <section className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-xl p-6 lg:p-8 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-8xl">map</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-1.5 h-5 bg-brand-500"></span>
                  <h2 className="text-lg font-bold tracking-tight text-white uppercase">JOIN ROOM</h2>
                </div>
                <div className="flex-1 space-y-4 mb-6">
                  <p className="text-slate-400 text-xs leading-relaxed">Enter the 6-digit Room ID to join an existing operation.</p>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Room ID</label>
                    <input 
                      className="w-full bg-slate-950/50 border border-slate-800 focus:border-brand-500 focus:ring-0 text-2xl font-black tracking-[0.4em] text-center text-brand-500 py-2.5 rounded-lg placeholder:text-slate-900 transition-all uppercase outline-none"
                      maxLength={6}
                      placeholder="000000"
                      value={inputRoomId}
                      onChange={(e) => setInputRoomId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-auto space-y-3">
                  <div className="flex items-center justify-center gap-2 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-xs">info</span>
                    IDs are case-insensitive
                  </div>
                  <button 
                    onClick={handleJoinRoom}
                    className="w-full bg-slate-800/50 hover:bg-slate-700 text-white font-black py-3.5 rounded-lg uppercase tracking-widest transition-all active:scale-[0.98] border border-slate-700"
                  >
                    JOIN OPERATION
                  </button>
                </div>
              </section>
              
            </div>
          </div>
        </div>
      </main>

{/* 🛠️ デバッグ用：サーバーを無視して次に進むボタン（後で消せる） */}
<div className="absolute bottom-20 right-10 z-50">
  <button 
    onClick={() => onJoinSuccess("DEBUG-999")}
    className="bg-red-900/40 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/50 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all opacity-50 hover:opacity-100"
  >
    Force Start (Debug)
  </button>
</div>

      {/* 🚀 Footer: shrink-0 で高さ固定 */}
      <footer className="shrink-0 relative z-50 w-full py-2 px-8 flex justify-between items-center bg-slate-950 border-t border-slate-900 text-[9px] font-inter uppercase tracking-widest text-slate-600 font-bold">
        <span>© 2026 Batch21 [AM GI Offline - March]</span>
        <div className="flex gap-6">
          <span className="hover:text-brand-400 cursor-pointer">Intel</span>
          <span className="hover:text-brand-400 cursor-pointer">Support</span>
          <span className="hover:text-brand-400 cursor-pointer">Privacy</span>
        </div>
      </footer>
    </div>
  );
};