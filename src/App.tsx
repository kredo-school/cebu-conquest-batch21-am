import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { HUD } from './components/HUD'; 
import { useGameStore } from './store';
import TitleScreen from './components/TitleScreen';
import { LoginView } from './components/LoginView'; 
import PhaserGame from './components/PhaserGame'; 
import socket from './socket';
import './App.css'; 

const App: React.FC = () => {
  // ★ store から damage と addLog を新しく取り出します
  const { hp, syncServerState, damage, addLog } = useGameStore();

  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title');
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    // 1. サーバーの「正の世界」を同期
    socket.on('syncState', (state) => {
      syncServerState(state);
    });

    // 2. ゲーム開始の合図
    socket.on('gameStart', (data) => {
      console.log('Matching Success!', data);
      setView('game'); 
    });

    // ★ 3. 【バトル結果の受け取り】
    // 【役割】サーバーで判定されたバトルの結果を、自分のHPやログに反映させます
    socket.on('battleResult', (result) => {
      console.log('バトル終了通知:', result);

      if (result.loserId === socket.id) {
        // 自分が負けた場合
        damage(result.hpDamage); // ZustandのHPを減らす
        addLog(`lose... ${result.hpDamage}のダメージ！ (勝率:${result.winProbability}%)`);
      } else if (result.winnerId === socket.id) {
        // 自分が勝った場合
        addLog(`win！ 陣地を確保しました！`);
      }
    });

    return () => {
      socket.off('syncState');
      socket.off('gameStart');
      socket.off('battleResult'); // お片付けも忘れずに！
    };
  }, [syncServerState, damage, addLog]); // 依存関係に damage と addLog を追加

  // --- 以下、ログイン処理や表示の分岐（以前と同じ） ---
  const handleLoginSubmit = (name: string) => {
    setPlayerName(name); 
    socket.connect();
    const selectedTeam = name === 'issei' ? 'red' : 'blue';
    socket.emit('join_game', { userId: Math.floor(Math.random() * 1000), username: name, team: selectedTeam });
    setView('waiting'); 
  };

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

  return (
    <div style={gameMainContainerStyle}>
      <div style={gameViewportStyle}>
        <PhaserGame playerName={playerName} />
        <HUD />
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

// --- スタイル設定（変更なし） ---
const gameMainContainerStyle: React.CSSProperties = { display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#1a1a2e', overflow: 'hidden' };
const gameViewportStyle: React.CSSProperties = { flex: 1, position: 'relative' };
const waitingContainerStyle: React.CSSProperties = { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' };
const loaderStyle: React.CSSProperties = { marginTop: '30px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '50px', height: '50px' };
const gameOverOverlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(223, 22, 22, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const debugButtonStyle: React.CSSProperties = { marginTop: '40px', padding: '10px 20px', background: '#334155', color: '#94a3b8', border: 'none', cursor: 'pointer' };

export default App;