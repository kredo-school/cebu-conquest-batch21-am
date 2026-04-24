import React, { useState, useEffect, useRef, useCallback } from 'react'; // 🚀 useCallbackを追加
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
import SoundManager from './game/SoundManager';

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

  // view 変化に応じた BGM 切り替え
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

    // --- 🛠️ デバッグ・ワープ・退出用イベントリスナー ---
    const handleForceSelection = () => {
      setView('selection');
      addLog("🛠️ DEBUG: 守護神選択フェーズへ移行します");
    };

    const handleAbortToSetup = () => {
      setView('setup');
      addLog("⚠️ MISSION ABORTED: 作戦を中止し、ベースに帰還しました");
    };

    window.addEventListener('DEBUG_START_SELECTION', handleForceSelection);
    window.addEventListener('DEBUG_GOTO_SETUP', handleAbortToSetup);

    // --- 🎮 Phaserブリッジ ---
    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      setStatus(e.detail);
    };

    const handleDistrictSelected = (e: any) => {
      const payload = e.detail;
      const districtId = payload.districtId ?? payload;
      const districtName = payload.districtName || `地区 ${districtId}`;
      const currentState = useGameStore.getState();

      setStatus({ selectedDistrictId: districtId });

      if (currentState.turn === 0) {
        addLog(`📍 初期配置: ${districtName} を選択中...`);
        return;
      }

      if (!currentState.isMyTurn) {
        addLog(`👀 偵察: ${districtName}`);
        return;
      }

      openPrediction(districtId, districtName, payload.isMyTerritory, payload.isNeutral);
      
      if (payload.isMyTerritory) {
        addLog(`🚚 兵站確認: 自陣 ${districtName} を選択。`);
      } else if (payload.isNeutral) {
        addLog(`🏳️ 空白地発見: ${districtName} は無人です。`);
      } else {
        addLog(`🎯 ターゲット確認: 敵陣 ${districtName} を捕捉。`);
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
      window.removeEventListener('DEBUG_START_SELECTION', handleForceSelection);
      window.removeEventListener('DEBUG_GOTO_SETUP', handleAbortToSetup);
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

  // ルーム確定
  const handleJoinSuccess = (joinedRoomId: string) => {
    setStatus({ roomId: joinedRoomId });
    setView('lobby'); 
  };

  // 初期配置確定
  const handleFinalDeploy = () => {
    if (selectedDistrictId) {
      // 🚀 修正：サーバー側の待機イベント名 "PLAYER_READY" に合わせました
      socket.emit("PLAYER_READY", { 
        username: playerName || storePlayerName || 'Guest', 
        startDistrictId: selectedDistrictId 
      });
      window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, {
        detail: { districtId: selectedDistrictId }
      }));
      addLog(`🚀 地区 ${selectedDistrictId} への配置完了。`);
      setStatus({ selectedDistrictId: null });
    }
  };

  // リスタート
  const handleRestart = () => {
    window.location.reload();
  };

  // 🚀 修正：画面遷移関数を固定化（再描画時のタイマーリセットを防ぐ）
  const handleSelectionComplete = useCallback(() => {
    setView('game');
  }, []);

  // --- 🎥 ビューの分岐 ---
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;
  if (view === 'setup') return <LobbySetupView onJoinSuccess={handleJoinSuccess} />;
  if (view === 'lobby') return <LobbyView roomId={roomId} players={players} />;
  
  if (view === 'selection') {
    // 🚀 修正：固定化した関数を渡す
    return <GodSelectionView onComplete={handleSelectionComplete} />;
  }
  
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-body">
      <Sidebar />
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 z-0">
          <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        </div>
        <div className="relative z-10 w-full h-full pointer-events-none flex flex-col">
          <HUD />
          <BattleModal />
          <ResultView onRestart={handleRestart} />
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