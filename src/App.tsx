import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import { useGameStore } from './store';

// ✅ コンポーネントのインポート
import { Sidebar } from './components/Sidebar';
import { GameOverView } from './components/GameOverView';
import TitleScreen from './components/TitleScreen'; 
import { HUD } from './components/HUD';
import { PhaserGameView } from './components/PhaserGame';
import { LoginView } from './components/LoginView';
import { GodSelectionView } from './components/GodSelectionView';
import { BattleModal } from './components/BattleModal'; 

// 🔴 ブリッジ定数とイベント定数
import { PHASER_TO_REACT, REACT_TO_PHASER } from './game/events/PhaserBridge';
import { SERVER_EVENTS } from '../shared/socketEvents.js';

const App: React.FC = () => {
  const { 
    login, setStatus, syncServerState, addLog,
    turn, playerName: storePlayerName, selectedDistrictId,
    openPrediction // 🚀 Storeから開く関数を確実に受け取る
  } = useGameStore();
  
  const gameRef = useRef<any>(null);
  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title');
  const [playerName, setLocalPlayerName] = useState('');

  useEffect(() => {
    (window as any).useGameStore = useGameStore;

    // --- 📡 サーバー通信の設定 ---
    socket.on('connect', () => {
      console.log("📡 サーバー接続成功! My ID:", socket.id);
      if (socket.id) setStatus({ myId: socket.id });
    });

    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      if (socket.id) {
        syncServerState({ ...useGameStore.getState(), ...data }, socket.id);
        const isMe = data.turnOwnerId === socket.id;
        addLog(`📢 Day ${data.turn} 開始！ ${isMe ? '⚔️ あなたのターン' : '⌛ 相手のターン'}`);
      }
    });

    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (useGameStore.getState().isGameOver) return;
      if (socket.id) syncServerState(state, socket.id);
    });

    socket.on('gameStart', () => {
      setView('game');
      addLog("🚀 マッチング完了。出撃地点を選択してください");
    });

    socket.on(SERVER_EVENTS.ACTION_RESULT, (data) => {
      if (useGameStore.getState().isGameOver) return;
      if (data.logs) data.logs.forEach((log: string) => addLog(log));
      if (data.state && socket.id) syncServerState(data.state, socket.id);
    });

    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      addLog(data.winnerId === socket.id ? "🏆 MISSION COMPLETE" : "🚨 MISSION FAILED");
    });

    // --- 🎮 Phaserブリッジ ---
    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      setStatus(e.detail);
    };

    // 🚀 【重要】Phaserから届いた「以前の定義(101系)」を受け取り、モーダルを起動する
    const handleDistrictSelected = (e: any) => {
      const districtId = e.detail;
      console.log("📍 Phaserから以前の定義IDを受信:", districtId);
      
      // ✅ ここでStoreの状態(predictionModalOpen)をtrueにする！
      // これを忘れると画面にBattleModalが表示されません。
      openPrediction(districtId, `地区 ${districtId}`);
      
      // 内部状態も更新
      setStatus({ selectedDistrictId: districtId });
    };

    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);

    return () => {
      socket.off('connect');
      socket.off(SERVER_EVENTS.TURN_START);
      socket.off(SERVER_EVENTS.SYNC_STATE);
      socket.off('gameStart');
      socket.off(SERVER_EVENTS.ACTION_RESULT);
      socket.off(SERVER_EVENTS.GAME_OVER);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
    };
  }, [setStatus, syncServerState, addLog, openPrediction]); // 🚀 openPredictionを依存配列に追加

  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    await login(name); 
    socket.connect();
    socket.emit('join_game', { username: name });
    setView('waiting');
  };

  const handleFinalDeploy = () => {
    if (selectedDistrictId) {
      socket.emit("READY_TO_START", { 
        username: playerName || storePlayerName || 'Guest', 
        startDistrictId: selectedDistrictId 
      });
      
      window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, {
        detail: { districtId: selectedDistrictId }
      }));
      
      addLog(`🚀 地区 ${selectedDistrictId} への配置完了。マッチング相手を待機中...`);
      setStatus({ selectedDistrictId: null });
    }
  };

  if (view === 'title') return <TitleScreen onStart={() => setView('login')} />;
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;
  
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
      <GodSelectionView />

      {/* 🚀 勝率予測モーダル（最前面に配置） */}
      <BattleModal />

      {view === 'waiting' ? (
        <div style={waitingScreenStyle}>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold' }}>Looking for a match...</h1>
          <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '40px' }}>
            「{playerName || storePlayerName}」 is Preparing for sortie
          </p>
          <div style={spinnerStyle}></div>
          <button onClick={() => setView('game')} style={debugButtonStyle}>(Debug) Force Start Game</button>
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
            {turn === 0 && selectedDistrictId && (
              <div style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                <button onClick={handleFinalDeploy} style={deployButtonStyle}>DEPLOY START</button>
              </div>
            )}
            <HUD />
            <GameOverView />
          </div>
          <Sidebar />
        </div>
      )}
    </div>
  );
};

// スタイル定義
const waitingScreenStyle: React.CSSProperties = { flex: 1, background: '#121926', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' };
const spinnerStyle: React.CSSProperties = { width: '60px', height: '60px', border: '6px solid rgba(255, 255, 255, 0.1)', borderTop: '6px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '40px' };
const debugButtonStyle: React.CSSProperties = { marginTop: '20px', background: 'rgba(255, 255, 255, 0.05)', color: '#666', padding: '10px 20px', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', fontSize: '12px' };
const deployButtonStyle: React.CSSProperties = { background: '#f1c40f', color: '#000', padding: '15px 40px', fontSize: '20px', fontWeight: 'bold', borderRadius: '10px', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(241, 196, 15, 0.5)' };

export default App;