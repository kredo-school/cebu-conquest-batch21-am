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
import { LobbyView } from './components/LobbyView'; // 🚀 修正：古い待ち画面の代わり
import { GodSelectionView } from './components/GodSelectionView';
import { BattleModal } from './components/BattleModal'; 

// 🔴 ブリッジ定数とイベント定数
import { PHASER_TO_REACT, REACT_TO_PHASER } from './game/events/PhaserBridge';
import { SERVER_EVENTS } from '../shared/socketEvents.js';
import SoundManager from './game/SoundManager';

const App: React.FC = () => {
  const { 
    login, setStatus, syncServerState, addLog,
    turn, playerName: storePlayerName, selectedDistrictId,
    openPrediction, isGameOver, roomId, players // 🚀 追加：ルーム情報の同期用
  } = useGameStore();
  
  const gameRef = useRef<any>(null);
  
  // 🚀 修正：'waiting' を 'lobby' に変更
  const [view, setView] = useState<'title' | 'login' | 'lobby' | 'game'>('title');
  const [playerName, setLocalPlayerName] = useState('');

  // view 変化に応じた BGM 切り替え（game 画面は MainScene.create() が担当）
  useEffect(() => {
    const bgmKey: Record<string, string> = { title: 'title', login: 'lobby', lobby: 'lobby' };
    if (bgmKey[view]) SoundManager.playBgm(bgmKey[view]);
  }, [view]);

  useEffect(() => {
    (window as any).useGameStore = useGameStore;

    // --- 📡 サーバー通信の設定 ---
    socket.on('connect', () => {
      console.log("📡 サーバー接続成功! My ID:", socket.id);
      if (socket.id) setStatus({ myId: socket.id });
    });

    // 🚀 Day開始通知
    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      if (!socket.id) return;
      syncServerState(data, socket.id);
      
      const isMe = data.turnOwnerId === socket.id;
      const turnMsg = isMe ? '⚔️ あなたのターン（APが続く限り行動可能！）' : `⌛ 相手（${data.turnOwnerName}）のターン`;
      addLog(`📢 Day ${data.turn} 開始！ ${turnMsg}`);
    });

    // 🚀 全ステート同期
    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (useGameStore.getState().isGameOver) return;
      if (socket.id) syncServerState(state, socket.id);
    });

    // 🚀 修正：マッチング完了イベントでゲーム画面へ遷移
    socket.on('gameStart', () => {
      setView('game');
      addLog("🚀 マッチング完了。守護神の加護を確認し、出撃地点を選択してください");
    });

    // 🚀 行動結果の反映
    socket.on(SERVER_EVENTS.ACTION_RESULT, (data) => {
      if (useGameStore.getState().isGameOver) return;
      if (data.logs) {
        data.logs.forEach((log: string) => addLog(log));
      }
      if (data.state && socket.id) {
        syncServerState(data.state, socket.id);
      }
    });

    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      addLog(data.winnerId === socket.id ? "🏆 MISSION COMPLETE (制圧完了)" : "🚨 MISSION FAILED (撤退)");
      setStatus({ isGameOver: true });
    });

    // --- 🎮 Phaserブリッジ ---
    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      setStatus(e.detail);
    };

    const handleDistrictSelected = (e: any) => {
      const districtId = e.detail;
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
    setView('lobby'); // 🚀 修正：'waiting' ではなく 'lobby' へ
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

  // --- 🎥 ビューの分岐 ---
  if (view === 'title') return <TitleScreen onStart={() => setView('login')} />;
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;
  
  // 🚀 修正：マッチング待機中は新デザインの LobbyView を表示
  if (view === 'lobby') return <LobbyView roomId={roomId} players={players} />;
  
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-slate-950 relative">
      {/* 🚀 加護選択：未選択時のみ表示されるようコンポーネント側で制御 */}
      <GodSelectionView />

      {/* 勝率予測モーダル */}
      <BattleModal />

      <div className="flex-1 relative flex">
        <div className="flex-1 relative">
          <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
          
          {/* ⭐️ 初期配置ボタン：タクティカル・オレンジ仕様 */}
          {turn === 0 && selectedDistrictId && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1000]">
              <button 
                onClick={handleFinalDeploy} 
                className="bg-brand-500 hover:bg-brand-400 text-slate-950 px-12 py-4 rounded-lg font-black text-xl uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition-all"
              >
                DEPLOY START
              </button>
            </div>
          )}

          <HUD />
          <GameOverView />
        </div>
        <Sidebar />
      </div>
    </div>
  );
};

export default App;