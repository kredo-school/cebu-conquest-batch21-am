import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { SettingsView } from './components/SettingsView'; 
import { RankingView } from './components/RankingView'; 
import { HelpModal } from './components/HelpModal'; 
import { ActionPanel } from './components/ActionPanel'; // 🚀 追加：ActionPanelをインポート

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
  
  // 🚀 ビュー管理
  const [view, setView] = useState<'login' | 'setup' | 'lobby' | 'selection' | 'game' | 'ranking'>('login');
  const [showSettings, setShowSettings] = useState(false); 
  const [showHelp, setShowHelp] = useState(false); 
  const [playerName, setLocalPlayerName] = useState('');

  // 🚀 ランキング画面制御用の関数
  const handleOpenRanking = () => setView('ranking');
  const handleCloseRanking = () => setView('setup');

  // view 変化に応じた BGM 切り替え
  useEffect(() => {
    const bgmKey: Record<string, string> = { 
      login: 'lobby', 
      setup: 'lobby', 
      lobby: 'lobby', 
      ranking: 'title',
      game: 'battle'
    };
    if (bgmKey[view]) SoundManager.playBgm(bgmKey[view]);
  }, [view]);

  useEffect(() => {
    (window as any).useGameStore = useGameStore;

    socket.on('connect', () => {
      if (socket.id) setStatus({ myId: socket.id });
    });

    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      if (!socket.id) return;
      syncServerState(data, socket.id);
      const isMe = data.turnOwnerId === socket.id;
      addLog(`📢 Day ${data.turn} 開始！ ${isMe ? '⚔️ あなたのターン' : `⌛ 相手（${data.turnOwnerName}）のターン`}`);
    });

    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (useGameStore.getState().isGameOver) return;
      if (socket.id) syncServerState(state, socket.id);
    });

    socket.on('gameStart', () => {
      setView('selection');
      addLog("🚀 マッチング完了。守護神の加護を選択してください");
    });

    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      addLog(data.winnerId === socket.id ? "🏆 MISSION COMPLETE" : "🚨 MISSION FAILED");
      setStatus({ isGameOver: true, winnerId: data.winnerId });
    });

    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      setStatus(e.detail);
    };

    const handleDistrictSelected = (e: any) => {
      const payload = e.detail;
      const districtId = payload.districtId ?? payload;
      const districtName = payload.districtName || `地区 ${districtId}`;
      setStatus({ selectedDistrictId: districtId });

      if (useGameStore.getState().turn > 0 && useGameStore.getState().isMyTurn) {
        openPrediction(districtId, districtName, payload.isMyTerritory, payload.isNeutral);
      }
    };

    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);

    return () => {
      socket.off('connect');
      socket.off(SERVER_EVENTS.TURN_START);
      socket.off(SERVER_EVENTS.SYNC_STATE);
      socket.off('gameStart');
      socket.off(SERVER_EVENTS.GAME_OVER);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
    };
  }, [setStatus, syncServerState, addLog, openPrediction]);

  // 各種ハンドラー
  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    await login(name); 
    socket.connect();
    setView('setup'); 
  };

  const handleJoinSuccess = (joinedRoomId: string) => {
    setStatus({ roomId: joinedRoomId });
    setView('lobby'); 
  };

  const handleFinalDeploy = () => {
    if (selectedDistrictId) {
      socket.emit("PLAYER_READY", { username: playerName || storePlayerName || 'Guest', startDistrictId: selectedDistrictId });
      window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { detail: { districtId: selectedDistrictId } }));
      setStatus({ selectedDistrictId: null });
    }
  };

  const handleSelectionComplete = useCallback(() => setView('game'), []);

  // --- 🎥 ビューのレンダリング決定 ---
  let mainContent;
  if (view === 'login') {
    mainContent = (
      <LoginView 
        onLogin={handleLoginSubmit} 
        onOpenSettings={() => setShowSettings(true)} 
        onOpenHelp={() => setShowHelp(true)} 
      />
    );
  } else if (view === 'setup') {
    mainContent = (
      <LobbySetupView 
        onJoinSuccess={handleJoinSuccess} 
        onOpenSettings={() => setShowSettings(true)} 
        onOpenHelp={() => setShowHelp(true)}
        onOpenRanking={handleOpenRanking}
      />
    );
  } else if (view === 'lobby') {
    mainContent = (
      <LobbyView 
        roomId={roomId} 
        players={players} 
        onOpenSettings={() => setShowSettings(true)} 
        onOpenHelp={() => setShowHelp(true)} 
        onOpenRanking={handleOpenRanking}
        onAbort={() => setView('setup')}
      />
    );
  } else if (view === 'selection') {
    mainContent = (
      <GodSelectionView 
        onComplete={handleSelectionComplete} 
        onOpenSettings={() => setShowSettings(true)} 
        onOpenHelp={() => setShowHelp(true)} 
      />
    );
  } else if (view === 'ranking') {
    mainContent = (
      <RankingView 
        onOpenSettings={() => setShowSettings(true)} 
        onOpenHelp={() => setShowHelp(true)}
        onBack={handleCloseRanking}
      />
    );
  } else {
    // ⚔️ ゲーム画面
    mainContent = (
      <div className="flex w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-body">
        <Sidebar />
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 z-0">
            <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
          </div>
          <div className="relative z-10 w-full h-full pointer-events-none flex flex-col">
            <HUD onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} />
            
            {/* 🚀 追加：ここにActionPanelを配置！ */}
            <ActionPanel />

            <BattleModal />
            <ResultView 
              onRestart={() => window.location.reload()} 
              onOpenSettings={() => setShowSettings(true)} 
              onOpenHelp={() => setShowHelp(true)}
              onOpenRanking={handleOpenRanking}
            />
            {/* Turn0時のデプロイボタンは ActionPanel に移行したため削除（または重複回避のため非表示） */}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden">
      {mainContent}
      {showSettings && (
        <div className="fixed inset-0 z-[99999] pointer-events-auto">
          <SettingsView onBack={() => setShowSettings(false)} />
        </div>
      )}
      {showHelp && (
        <div className="fixed inset-0 z-[100000] pointer-events-auto">
          <HelpModal onClose={() => setShowHelp(false)} />
        </div>
      )}
    </div>
  );
};

export default App;