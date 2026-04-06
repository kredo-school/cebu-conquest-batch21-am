import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import { useGameStore } from './store';

// ✅ インポート形式の整合性を維持
import { Sidebar } from './components/Sidebar';
import { GameOverView } from './components/GameOverView';
import TitleScreen from './components/TitleScreen'; // Default export
import { HUD } from './components/HUD';
import { PhaserGameView } from './components/PhaserGame';
import { LoginView } from './components/LoginView';

const App: React.FC = () => {
  const { setStatus, syncServerState, addLog, nextTurn } = useGameStore();
  const gameRef = useRef<any>(null);
  
  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title');
  const [playerName, setPlayerName] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    (window as any).useGameStore = useGameStore;

    // --- 📡 サーバー通信の設定（ガード付き） ---

    socket.on('syncState', (state) => {
      // 🔴 ガード：ゲームオーバー確定後は、いかなるデータも受け付けない（チラつき防止）
      if (useGameStore.getState().isGameOver) return;

      if (socket.id) syncServerState(state, socket.id);
    });

    socket.on('gameStart', () => {
      setView('game');
      addLog("🚀 マッチング完了。出撃地点を選択してください（Standby）");
    });

    socket.on('turnResult', (data) => {
      if (useGameStore.getState().isGameOver) return;

      if (data.logs) {
        data.logs.forEach((log: string) => addLog(log));
      }
      if (data.state && socket.id) {
        syncServerState(data.state, socket.id);
      }
    });

    socket.on('gameOver', (data) => {
      const isWin = data.winnerId === socket.id;
      addLog(isWin ? "🏆 MISSION COMPLETE" : "🚨 MISSION FAILED");
    });

    // --- 🎮 Phaserブリッジ（数値データ同期・ガード付き） ---

    const handleUpdateStatus = (e: any) => {
      // 🔴 ガード：React側のStoreですでに死んでいるなら、Phaserの更新を無視
      if (useGameStore.getState().isGameOver) return;

      // 数値ステータスのみ反映（isMyTurnやTurn数はStore/サーバーが管理するため除外）
      const { isMyTurn, turn, turnOwner, isSubmitted, isGameOver, ...pureStats } = e.detail;
      setStatus(pureStats);
    };

    const handleDistrictSelected = (e: any) => setSelectedId(e.detail);

    window.addEventListener("UPDATE_STATUS", handleUpdateStatus);
    window.addEventListener("DISTRICT_SELECTED", handleDistrictSelected);

    return () => {
      socket.off('syncState');
      socket.off('gameStart');
      socket.off('turnResult');
      socket.off('gameOver');
      window.removeEventListener("UPDATE_STATUS", handleUpdateStatus);
      window.removeEventListener("DISTRICT_SELECTED", handleDistrictSelected);
    };
  }, [setStatus, syncServerState, addLog]);

  const handleLoginSubmit = (name: string) => {
    setPlayerName(name);
    socket.connect();
    socket.emit('join_game', { username: name, team: name === 'issei' ? 'red' : 'blue' });
    setView('waiting');
  };

  // ✅ 出撃確定処理：ここで自動的に Turn 0 (Standby) -> Turn 1 (Day 1) へ移行
  const handleFinalDeploy = () => {
    const gameInstance = gameRef.current?.game || gameRef.current;
    const mainScene = gameInstance?.scene?.getScene('MainScene');

    if (selectedId && mainScene) {
      // 1. サーバーへ地点情報を送信
      socket.emit("READY_TO_START", { username: playerName, startDistrictId: selectedId });
      
      // 2. Phaser側のデプロイ演出を実行
      if (mainScene.confirmDeployment) mainScene.confirmDeployment(selectedId);
      
      // 3. 🔴 ターンを 0 から 1 へ進め、Day 1 を正式に開始させる
      nextTurn();

      setSelectedId(null);
    }
  };

  // --- 🖼 画面表示分岐 ---

  if (view === 'title') return <TitleScreen onStart={() => setView('login')} />;
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;
  
  if (view === 'waiting') return (
    <div style={waitingScreenStyle}>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold' }}>Looking for a match...</h1>
      <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '40px' }}>
        「{playerName || 'issei'}」 is Preparing for sortie
      </p>
      <div style={spinnerStyle}></div>
      {/* 開発・テスト用強制開始ボタン */}
      <button onClick={() => setView('game')} style={debugButtonStyle}>
        (Debug) Force Start Game
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <PhaserGameView ref={gameRef} playerName={playerName} />
        
        {/* 出撃地点選択中に出るボタン（これを押すと Day 1 になる） */}
        {selectedId && (
          <div style={{ position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
            <button onClick={handleFinalDeploy} style={deployButtonStyle}>
              DEPLOY START
            </button>
          </div>
        )}

        <HUD />
        {/* GameOverView は zIndex 9999 で全画面を白く覆います */}
        <GameOverView />
      </div>
      <Sidebar />
    </div>
  );
};

// --- 🎨 スタイル定義（以前の使いやすいデザインを維持） ---

const waitingScreenStyle: React.CSSProperties = { 
  background: '#121926', height: '100vh', display: 'flex', flexDirection: 'column', 
  alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' 
};

const spinnerStyle: React.CSSProperties = { 
  width: '60px', height: '60px', border: '6px solid rgba(255, 255, 255, 0.1)', 
  borderTop: '6px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '40px' 
};

const debugButtonStyle: React.CSSProperties = { 
  marginTop: '20px', background: 'rgba(255, 255, 255, 0.05)', color: '#666', 
  padding: '10px 20px', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.1)', 
  cursor: 'pointer', fontSize: '12px' 
};

const deployButtonStyle: React.CSSProperties = { 
  background: '#f1c40f', color: '#000', padding: '15px 40px', fontSize: '20px', 
  fontWeight: 'bold', borderRadius: '10px', border: 'none', cursor: 'pointer', 
  boxShadow: '0 0 20px rgba(241, 196, 15, 0.5)' 
};

export default App;