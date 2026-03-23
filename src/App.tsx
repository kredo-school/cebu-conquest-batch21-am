import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { HUD } from './components/HUD'; 
import { useGameStore } from './store';
import TitleScreen from './components/TitleScreen';
import { LoginView } from './components/LoginView'; 
import PhaserGame from './components/PhaserGame'; 
import socket from './socket';

const App: React.FC = () => {
  const { hp, syncServerState } = useGameStore();

  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title');
  const [playerName, setPlayerName] = useState('');

  // ② 【役割：耳と脳の接続】サーバーの声をStoreに書き込む
  useEffect(() => {
    // 🚩 毎秒届く syncState を Zustand へ流し込む
    // 【意味】これで Sidebar や Hud が自動的に最新情報で再描画されます
    socket.on('syncState', (state) => {
      syncServerState(state);
    });

    // サーバーからの開始合図
    socket.on('gameStart', (data) => {
      console.log('🚀 Matching Success!', data);
      setView('game'); 
    });

    socket.on('connect', () => {
  window.__mySocketId = socket.id;  // MainSceneから参照できるように
});


    return () => {
      socket.off('syncState');
      socket.off('gameStart');
    };
  }, [syncServerState]);

  // ③ 【役割：作戦】ログイン
  const handleLoginSubmit = (name: string) => {
    setPlayerName(name); 
    socket.connect();

    const selectedTeam = name === 'issei' ? 'red' : 'blue';

    socket.emit('join_game', {
      userId: Math.floor(Math.random() * 1000), 
      username: name,
      team: selectedTeam 
    });

    setView('waiting'); 
  };

  // --- 表示の分岐 ---
  if (view === 'title') return <TitleScreen onStart={() => setView('login')} />;
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;
  
  if (view === 'waiting') {
    return (
      <div style={waitingContainerStyle}>
        <h1>Looking for a match...</h1>
        <p>「{playerName}」is Preparing for sortie</p>
        <div className="loader" style={loaderStyle} />
        <button onClick={() => setView('game')} style={debugButtonStyle}>(Debug) Force Start</button>
      </div>
    );
  }

  // --- ゲーム本編レイアウト ---
  return (
    <div style={gameMainContainerStyle}>
      <div style={gameViewportStyle}>
        <PhaserGame playerName={playerName} />
        <HUD /> {/* ★ ここで Store の情報が表示されるようになる */}
        {hp <= 0 && (
          <div style={gameOverOverlayStyle}>
            <h1 style={{ color: 'white', fontSize: '80px' }}>GAME OVER</h1>
            <button onClick={() => window.location.reload()}>Try Again</button>
          </div>
        )}
      </div>
      <Sidebar />
    </div>
  );
};

// --- デザイン設定（以前のものを継承） ---
const gameMainContainerStyle: React.CSSProperties = { display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#1a1a2e', overflow: 'hidden' };
const gameViewportStyle: React.CSSProperties = { flex: 1, position: 'relative' };
const waitingContainerStyle: React.CSSProperties = { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' };
const loaderStyle: React.CSSProperties = { marginTop: '30px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '50px', height: '50px' };
const gameOverOverlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(223, 22, 22, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const debugButtonStyle: React.CSSProperties = { marginTop: '40px', padding: '10px 20px', background: '#334155', color: '#94a3b8', border: 'none', cursor: 'pointer' };

export default App;