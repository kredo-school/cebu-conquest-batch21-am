import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { useGameStore } from './store';
import TitleScreen from './components/TitleScreen';
import { LoginView } from './components/LoginView'; 
import PhaserGame from './components/PhaserGame'; // 名前を運ぶ担当
import socket from './socket';

const App: React.FC = () => {
  const { hp } = useGameStore();

  // ① 画面の状態管理
  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title');
  const [playerName, setPlayerName] = useState(''); // プレイヤー名を記憶するメモ帳

  // ② 【役割：耳】サーバーからの開始合図を監視
  useEffect(() => {
    // 🚩 サーバーから届くすべての信号をログに出す（デバッグ用）
    socket.onAny((event, ...args) => {
      console.log(`[サーバーからの受信] イベント: ${event}`, args);
    });

    // サーバーからの開始合図：gameStart
    socket.on('gameStart', (data) => {
      console.log('🚀 サーバーから開始許可（gameStart）が届きました！', data);
      setView('game'); 
    });

    return () => {
      socket.offAny();
      socket.off('gameStart');
    };
  }, []);

  // ③ 【役割：作戦】ログインボタンが押された時の手続き
  const handleLoginSubmit = (name: string) => {
    setPlayerName(name); 
    
    if (!socket.connected) {
      socket.connect(); // 通信機の電源をON
    }

    // ★ チーム自動振り分け
    // 役割：1人目(issei)を赤、2人目(yui等)を青に振り分け、サーバーの開始条件を狙います
    const selectedTeam = name === 'issei' ? 'red' : 'blue';
    console.log(`[送信] ログイン: ${name}, チーム: ${selectedTeam}`);

    // サーバーに「参加リクエスト」を投げる
    socket.emit('join_game', {
      userId: Math.floor(Math.random() * 1000), 
      username: name,
      team: selectedTeam 
    });

    setView('waiting'); 
  };

  // --- A: タイトル画面 ---
  if (view === 'title') {
    return <TitleScreen onStart={() => setView('login')} />;
  }

  // --- B: ログイン画面 ---
  if (view === 'login') {
    return <LoginView onLogin={handleLoginSubmit} />;
  }

  // --- C: マッチング待機画面 ---
  if (view === 'waiting') {
    return (
      <div style={waitingContainerStyle}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Looking for a match...</h1>
        <p style={{ color: '#94a3b8' }}> 「{playerName}」is Preparing for sortie</p>
        
        {/* ぐるぐるアニメーション */}
        <div className="loader" style={loaderStyle} />
        <p style={{ marginTop: '20px', fontSize: '14px' }}>もう一つのブラウザでログインすると開始されます</p>

        {/* 🚩 【デバッグ用：自力突破ボタン】 */}
        {/* 役割：サーバーが gameStart をくれなくても、このボタンでPhaserの地図画面へ進めます */}
        <button 
          onClick={() => setView('game')}
          style={debugButtonStyle}
        >
          (Debug) 強制的にゲームを開始して地図を見る
        </button>

        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .loader { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  // --- D: ゲーム本編 ---
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {/* ★ 名前を PhaserGame に渡し、Phaser内の registry に保管されます */}
      <PhaserGame playerName={playerName} />
      
      <Sidebar />

      {/* ゲームオーバー画面 */}
      {hp <= 0 && (
        <div style={gameOverOverlayStyle}>
          <h1 style={{ color: 'white', fontSize: '80px' }}>GAME OVER</h1>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', fontSize: '20px' }}>Try Again</button>
        </div>
      )}
    </div>
  );
};

// --- デザイン設定 ---
const waitingContainerStyle: React.CSSProperties = { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' };
const loaderStyle: React.CSSProperties = { marginTop: '30px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '50px', height: '50px' };
const gameOverOverlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(223, 22, 22, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };

const debugButtonStyle: React.CSSProperties = {
  marginTop: '40px', padding: '10px 20px', 
  background: '#334155', color: '#94a3b8', 
  border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer'
};

export default App;