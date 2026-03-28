import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { HUD } from './components/HUD'; 
import { useGameStore } from './store';
import TitleScreen from './components/TitleScreen';
import { LoginView } from './components/LoginView';
import { PhaserGameView } from './components/PhaserGame';
import socket from './socket';

const App: React.FC = () => {
  const { setStatus, syncServerState } = useGameStore();
  const gameRef = useRef<any>(null);
  
  // 状態管理：最初はタイトル画面から
  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title'); 
  const [playerName, setPlayerName] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    // PhaserからReact Storeを覗けるように窓口を開放
    (window as any).useGameStore = useGameStore;

    // サーバーとの同期
    socket.on('syncState', (state) => {
      if (socket.id) syncServerState(state, socket.id);
    });

    // マッチング完了でゲーム開始
    socket.on('gameStart', () => {
      setView('game');
    });

    // 現場（Phaser）からのカスタムイベントを監視
    const handleUpdateStatus = (e: any) => setStatus(e.detail);
    const handleDistrictSelected = (e: any) => setSelectedId(e.detail);

    window.addEventListener("UPDATE_STATUS", handleUpdateStatus);
    window.addEventListener("DISTRICT_SELECTED", handleDistrictSelected);

    return () => {
      socket.off('syncState');
      socket.off('gameStart');
      window.removeEventListener("UPDATE_STATUS", handleUpdateStatus);
      window.removeEventListener("DISTRICT_SELECTED", handleDistrictSelected);
    };
  }, [setStatus, syncServerState]);

  // ログイン送信
  const handleLoginSubmit = (name: string) => {
    setPlayerName(name); 
    socket.connect();
    socket.emit('join_game', { username: name, team: name === 'issei' ? 'red' : 'blue' });
    setView('waiting'); 
  };

  // 出撃確定：PhaserのMainSceneへ命令を飛ばす
  const handleFinalDeploy = () => {
    // gameRef.current.game から Scene を取得
    const gameInstance = gameRef.current?.game || gameRef.current;
    const mainScene = gameInstance?.scene?.getScene('MainScene');

    if (selectedId && mainScene) {
      socket.emit("READY_TO_START", { username: playerName, startDistrictId: selectedId });
      if (mainScene.confirmDeployment) {
        mainScene.confirmDeployment(selectedId);
      }
      setSelectedId(null);
    }
  };

  // --- 画面遷移の分岐 ---

  // 1. タイトル画面
  if (view === 'title') return <TitleScreen onStart={() => setView('login')} />;

  // 2. ログイン画面
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;

  // 3. 待機画面（青いリングが回るバージョン）
  if (view === 'waiting') return (
    <div style={waitingScreenStyle}>
      {/* 🔴 スピナーを回すためのCSS定義 */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold' }}>Looking for a match...</h1>
      <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '40px' }}>
        「{playerName || 'issei'}」 is Preparing for sortie
      </p>

      {/* ✅ 回転するスピナー */}
      <div style={spinnerStyle}></div>

      <button onClick={() => setView('game')} style={debugButtonStyle}>
        (Debug) Force Start
      </button>
    </div>
  );

  // 4. メインゲーム画面（Phaser + HUD + Sidebar）
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      {/* ゲーム・HUDエリア */}
      <div style={{ flex: 1, position: 'relative' }}>
        <PhaserGameView ref={gameRef} playerName={playerName} />
        
        {/* 地図で地点選択中に出るボタン */}
        {selectedId && (
          <div style={{ position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
            <button onClick={handleFinalDeploy} style={deployButtonStyle}>
              DEPLOY START
            </button>
          </div>
        )}

        <HUD />
      </div>

      {/* サイドバー（右固定） */}
      <Sidebar />
    </div>
  );
};

// --- スタイル定義 ---

const waitingScreenStyle: React.CSSProperties = {
  background: '#121926',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontFamily: 'sans-serif'
};

const spinnerStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  border: '6px solid rgba(255, 255, 255, 0.1)',
  borderTop: '6px solid #3498db',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite', // アニメーションを適用
  marginBottom: '40px'
};

const debugButtonStyle: React.CSSProperties = {
  marginTop: '20px',
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#666',
  padding: '10px 20px',
  borderRadius: '5px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  cursor: 'pointer',
  fontSize: '12px'
};

const deployButtonStyle: React.CSSProperties = {
  background: '#f1c40f',
  color: '#000',
  padding: '15px 40px',
  fontSize: '20px',
  fontWeight: 'bold',
  borderRadius: '10px',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 0 20px rgba(241, 196, 15, 0.5)'
};

export default App;