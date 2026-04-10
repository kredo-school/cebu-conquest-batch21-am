import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import { useGameStore } from './store';

// ✅ インポート形式の整合性を維持
import { Sidebar } from './components/Sidebar';
import { GameOverView } from './components/GameOverView';
import TitleScreen from './components/TitleScreen'; 
import { HUD } from './components/HUD';
import { PhaserGameView } from './components/PhaserGame';
import { LoginView } from './components/LoginView';

// 🔴 ブリッジ定数をインポート
import { PHASER_TO_REACT, REACT_TO_PHASER } from './game/events/PhaserBridge';

const App: React.FC = () => {
  // 🔴 selectedDistrictId を Store から取得するように追加
  const { 
    setStatus, syncServerState, addLog, nextTurn, 
    turn, playerName: storePlayerName, selectedDistrictId 
  } = useGameStore();
  
  const gameRef = useRef<any>(null);
  
  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title');
  const [playerName, setLocalPlayerName] = useState('');

  useEffect(() => {
    (window as any).useGameStore = useGameStore;

    // --- 📡 サーバー通信の設定 ---
    socket.on('syncState', (state) => {
      if (useGameStore.getState().isGameOver) return;
      if (socket.id) syncServerState(state, socket.id);
    });

    socket.on('gameStart', () => {
      setView('game');
      addLog("🚀 マッチング完了。出撃地点を選択してください");
    });

    socket.on('turnResult', (data) => {
      if (useGameStore.getState().isGameOver) return;
      if (data.logs) data.logs.forEach((log: string) => addLog(log));
      if (data.state && socket.id) syncServerState(data.state, socket.id);
    });

    socket.on('gameOver', (data) => {
      const isWin = data.winnerId === socket.id;
      addLog(isWin ? "🏆 MISSION COMPLETE" : "🚨 MISSION FAILED");
    });

    // --- 🎮 Phaserブリッジ（定数を使用してイベント受信） ---

    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      const { isMyTurn, turn: t, turnOwner, isSubmitted, isGameOver, ...pureStats } = e.detail;
      setStatus(pureStats);
    };

    /**
     * 🔴 地区選択イベントの修正
     * ローカルの useState ではなく、Store (setStatus) に直接保存する
     */
    const handleDistrictSelected = (e: any) => {
      const id = e.detail;
      // Storeを更新（これでHUDの「地点未選択」も解消され、ボタンも表示されます）
      setStatus({ selectedDistrictId: id });
    };

    // あきらさんの定数イベントを登録
    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);

    return () => {
      socket.off('syncState');
      socket.off('gameStart');
      socket.off('turnResult');
      socket.off('gameOver');
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
    };
  }, [setStatus, syncServerState, addLog]);

  const handleLoginSubmit = (name: string) => {
    setLocalPlayerName(name);
    socket.connect();
    socket.emit('join_game', { username: name, team: name === 'issei' ? 'red' : 'blue' });
    setView('waiting');
  };

  /**
   * ✅ 出撃確定処理
   * selectedDistrictId (Store) を使用するように修正
   */
  const handleFinalDeploy = () => {
    if (selectedDistrictId) {
      // 1. サーバーへ通知
      socket.emit("READY_TO_START", { 
        username: playerName || storePlayerName || 'Guest', 
        startDistrictId: selectedDistrictId 
      });
      
      // 2. Phaserへ通知
      window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, {
        detail: { districtId: selectedDistrictId }
      }));
      
      // 3. ターン進行
      nextTurn();
      addLog(`🚀 地区 ${selectedDistrictId} より攻略を開始しました（Day 1）`);

      // 4. 選択状態をリセット
      setStatus({ selectedDistrictId: null });
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
      <button onClick={() => setView('game')} style={debugButtonStyle}>
        (Debug) Force Start Game
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <PhaserGameView ref={gameRef} playerName={playerName} />
        
        {/* 🔴 selectedDistrictId (Store) を見るように修正 */}
        {turn === 0 && selectedDistrictId && (
          <div style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
            <button onClick={handleFinalDeploy} style={deployButtonStyle}>
              DEPLOY START
            </button>
          </div>
        )}

        <HUD />
        <GameOverView />
      </div>
      <Sidebar />
    </div>
  );
};

// --- スタイル定義（変更なし） ---
const waitingScreenStyle: React.CSSProperties = { background: '#121926', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' };
const spinnerStyle: React.CSSProperties = { width: '60px', height: '60px', border: '6px solid rgba(255, 255, 255, 0.1)', borderTop: '6px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '40px' };
const debugButtonStyle: React.CSSProperties = { marginTop: '20px', background: 'rgba(255, 255, 255, 0.05)', color: '#666', padding: '10px 20px', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', fontSize: '12px' };
const deployButtonStyle: React.CSSProperties = { background: '#f1c40f', color: '#000', padding: '15px 40px', fontSize: '20px', fontWeight: 'bold', borderRadius: '10px', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(241, 196, 15, 0.5)', animation: 'pulse 1.5s infinite' };

export default App;