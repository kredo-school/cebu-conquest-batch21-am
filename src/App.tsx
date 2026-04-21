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
    openPrediction, isGameOver
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

    // 🚀 Day（ターン数）開始通知の受信
    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      if (!socket.id) return;
      
      // ストアの情報を最新化
      syncServerState(data, socket.id);
      
      const isMe = data.turnOwnerId === socket.id;
      const turnMsg = isMe ? '⚔️ あなたのターン（APが続く限り行動可能！）' : `⌛ 相手（${data.turnOwnerName}）のターン`;
      addLog(`📢 Day ${data.turn} 開始！ ${turnMsg}`);
    });

    // 🚀 リアルタイムな全ステート同期
    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (useGameStore.getState().isGameOver) return;
      if (socket.id) syncServerState(state, socket.id);
    });

    socket.on('gameStart', () => {
      setView('game');
      addLog("🚀 マッチング完了。出撃地点を選択してください");
    });

    // 🚀 重要：行動結果のログとステート更新（コンボ中のAP減少を即反映）
    socket.on(SERVER_EVENTS.ACTION_RESULT, (data) => {
      if (useGameStore.getState().isGameOver) return;
      
      // ログの表示
      if (data.logs) {
        data.logs.forEach((log: string) => addLog(log));
      }
      
      // 🚀 ここで同期することで、攻撃直後のAP減少がHUDに即反映される
      if (data.state && socket.id) {
        syncServerState(data.state, socket.id);
      }
    });

    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      addLog(data.winnerId === socket.id ? "🏆 MISSION COMPLETE (制圧完了)" : "🚨 MISSION FAILED (撤退)");
      // ゲーム終了ステートをストアに反映
      setStatus({ isGameOver: true });
    });

    // --- 🎮 Phaserブリッジ ---
    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      setStatus(e.detail);
    };

    const handleDistrictSelected = (e: any) => {
      const districtId = e.detail;
      console.log("📍 エリア選択を受信:", districtId);
      
      // ✅ 複数回行動中、攻撃先を選択した際にモーダルを起動
      openPrediction(districtId, `地区 ${districtId}`);
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
  }, [setStatus, syncServerState, addLog, openPrediction]);

  // ログイン処理
  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    await login(name); 
    socket.connect();
    socket.emit('join_game', { username: name });
    setView('waiting');
  };

  // 出撃地点確定
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

      {/* 🚀 勝率予測モーダル（複数回行動の攻撃選択時に表示） */}
      <BattleModal />

      {view === 'waiting' ? (
        <div style={waitingScreenStyle}>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: 'bold', letterSpacing: '4px' }}>MATCHING...</h1>
          <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '40px' }}>
            Commander: 「{playerName || storePlayerName}」 is Preparing for sortie
          </p>
          <div style={spinnerStyle}></div>
          <button onClick={() => setView('game')} style={debugButtonStyle}>(Debug) Force Start Game</button>
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
            
            {/* ⭐️ 初期配置ボタン */}
            {turn === 0 && selectedDistrictId && (
              <div style={{ position: 'absolute', bottom: '140px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
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
const waitingScreenStyle: React.CSSProperties = { flex: 1, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Orbitron, sans-serif' };
const spinnerStyle: React.CSSProperties = { width: '80px', height: '80px', border: '8px solid rgba(255, 255, 255, 0.1)', borderTop: '8px solid #f1c40f', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '40px', boxShadow: '0 0 20px rgba(241, 196, 15, 0.3)' };
const debugButtonStyle: React.CSSProperties = { marginTop: '20px', background: 'rgba(255, 255, 255, 0.05)', color: '#444', padding: '10px 20px', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', fontSize: '10px' };
const deployButtonStyle: React.CSSProperties = { background: 'linear-gradient(to bottom, #f1c40f, #e67e22)', color: '#000', padding: '18px 60px', fontSize: '24px', fontWeight: '900', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 0 30px rgba(241, 196, 15, 0.6)', letterSpacing: '2px', transition: '0.2s' };

export default App;