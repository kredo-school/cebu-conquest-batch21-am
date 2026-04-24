import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';
import { useGameStore } from './store';

// ✅ コンポーネントのインポート
import { Sidebar } from './components/Sidebar';
import { ResultView } from './components/ResultView';
import { HUD } from './components/HUD';
import { PhaserGameView } from './components/PhaserGame';
import { LoginView } from './components/LoginView';
import { LobbySetupView } from './components/LobbySetupView'; 
import { LobbyView } from './components/LobbyView'; 
import { GodSelectionView } from './components/GodSelectionView';
import { BattleModal } from './components/BattleModal'; 

// 🔴 ブリッジ定数とイベント定数
import { PHASER_TO_REACT, REACT_TO_PHASER } from './game/events/PhaserBridge';
import { SERVER_EVENTS } from '../shared/socketEvents.js';

const App: React.FC = () => {
  const { 
    login, setStatus, syncServerState, addLog,
    turn, playerName: storePlayerName, selectedDistrictId,
    openPrediction, isGameOver, roomId, players 
  } = useGameStore();
  
  const gameRef = useRef<any>(null);
  
  // ビュー管理：login -> setup -> lobby -> selection -> game
  const [view, setView] = useState<'login' | 'setup' | 'lobby' | 'selection' | 'game'>('login');
  const [playerName, setLocalPlayerName] = useState('');

  useEffect(() => {
    (window as any).useGameStore = useGameStore;

    // --- 📡 サーバー通信の設定 ---
    socket.on('connect', () => {
      console.log("📡 サーバー接続成功! My ID:", socket.id);
      if (socket.id) setStatus({ myId: socket.id });
    });

    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      if (!socket.id) return;
      syncServerState(data, socket.id);
      const isMe = data.turnOwnerId === socket.id;
      const turnMsg = isMe ? '⚔️ あなたのターン' : `⌛ 相手（${data.turnOwnerName}）のターン`;
      addLog(`📢 Day ${data.turn} 開始！ ${turnMsg}`);
    });

    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (useGameStore.getState().isGameOver) return;
      if (socket.id) syncServerState(state, socket.id);
    });

    socket.on('gameStart', () => {
      // マッチング完了時はまず「守護神選択」へ
      setView('selection');
      addLog("🚀 マッチング完了。守護神の加護を選択してください");
    });

    socket.on(SERVER_EVENTS.ACTION_RESULT, (data) => {
      if (useGameStore.getState().isGameOver) return;
      if (data.logs) data.logs.forEach((log: string) => addLog(log));
      if (data.state && socket.id) syncServerState(data.state, socket.id);
    });

    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      addLog(data.winnerId === socket.id ? "🏆 MISSION COMPLETE" : "🚨 MISSION FAILED");
      setStatus({ isGameOver: true, winnerId: data.winnerId });
    });

    // --- 🎮 Phaserブリッジ ---
    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      setStatus(e.detail);
    };

    const handleDistrictSelected = (e: any) => {
      // payload: { districtId, districtName, isMyTerritory, isNeutral }
      const payload = e.detail;
      
      // まだPhaser側が古い数字だけのデータを送ってきた場合の互換性対策
      const districtId = payload.districtId ?? payload;
      const districtName = payload.districtName || `地区 ${districtId}`;
      
      const currentState = useGameStore.getState();

      // 状態に選択した地区IDをセット
      setStatus({ selectedDistrictId: districtId });

      // 1. 初期配置フェーズ（turn === 0）の処理
      if (currentState.turn === 0) {
        addLog(`📍 初期配置: ${districtName} を選択中...`);
        return; // 初期配置中はモーダルを出さない
      }

      // 2. 自分のターンでない場合は何もしない（偵察のみ）
      if (!currentState.isMyTurn) {
        addLog(`👀 偵察: ${districtName}`);
        return;
      }

      // 3. ゲーム進行中（自分のターン）の処理
      // 🚀 修正：isMyTerritory と isNeutral のフラグを store に渡す
      openPrediction(districtId, districtName, payload.isMyTerritory, payload.isNeutral);
      
      // payloadのフラグを使ってログを出し分ける
      if (payload.isMyTerritory) {
        addLog(`🚚 兵站確認: 自陣 ${districtName} を選択。移動・補給が可能です。`);
      } else if (payload.isNeutral) {
        addLog(`🏳️ 空白地発見: ${districtName} は無人です。無血開城が可能です。`);
      } else {
        addLog(`🎯 ターゲット確認: 敵陣 ${districtName} を捕捉。攻撃指示を待機中。`);
      }
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

  // ログイン送信
  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    await login(name); 
    socket.connect();
    setView('setup'); 
  };

  // ルームが確定（作成 or 参加）した時の処理
  const handleJoinSuccess = (joinedRoomId: string) => {
    setStatus({ roomId: joinedRoomId });
    setView('lobby'); 
  };

  // ハンドラー：初期配置確定
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

  // ハンドラー：リザルト画面からの再スタート（ページリロード）
  const handleRestart = () => {
    window.location.reload();
  };

  // --- 🎥 ビューの分岐 ---
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;
  
  if (view === 'setup') return <LobbySetupView onJoinSuccess={handleJoinSuccess} />;

  if (view === 'lobby') return <LobbyView roomId={roomId} players={players} />;
  
  if (view === 'selection') {
    return <GodSelectionView onComplete={() => setView('game')} />;
  }
  
  // ゲーム本編（ここから Sidebar と Phaser を表示）
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-body">
      {/* 左側: Sidebar */}
      <Sidebar />

      {/* 右側: Main Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Phaser コンテナ */}
        <div className="absolute inset-0 z-0">
          <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        </div>

        {/* UIレイヤー */}
        <div className="relative z-10 w-full h-full pointer-events-none flex flex-col">
          <HUD />
          <BattleModal />
          
          {/* リザルト画面を配置（ゲーム終了時のみ表示） */}
          <ResultView onRestart={handleRestart} />

          {/* 初期配置ボタン (Turn 0 の時だけ中央に出す) */}
          {turn === 0 && selectedDistrictId && (
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
              <button 
                onClick={handleFinalDeploy} 
                className="bg-orange-500 hover:bg-orange-400 text-slate-950 px-16 py-5 rounded-lg font-black text-2xl uppercase tracking-widest shadow-[0_0_30px_rgba(250,112,0,0.4)] active:scale-95 transition-all"
              >
                DEPLOY START
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;