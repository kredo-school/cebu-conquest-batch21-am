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
import { WaitingView } from './components/WaitingView'; 
import { BattleModal } from './components/BattleModal'; 
import { SettingsView } from './components/SettingsView'; 
import { RankingView } from './components/RankingView'; 
import { HelpModal } from './components/HelpModal'; 
import { InventoryModal } from './components/InventoryModal'; 
import { TutorialView } from './components/TutorialView'; 
import { ErrorNotification } from './components/ErrorNotification'; 

// 🔴 ブリッジ定数とイベント定数
import { PHASER_TO_REACT, REACT_TO_PHASER } from './game/events/PhaserBridge';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/socketEvents.js';

const App: React.FC = () => {
  const { 
    login, setStatus, syncServerState, addLog, showError,
    playerName: storePlayerName,
    token,
    hasSeenTutorial, 
    setZoomLevel, // 🚀 追加：ズームレベル更新アクション
    openPrediction, isGameOver, roomId, players, setView, view
  } = useGameStore();
  
  const gameRef = useRef<any>(null);
  
  const [isDeploying, setIsDeploying] = useState(false); 
  const [showSettings, setShowSettings] = useState(false); 
  const [showHelp, setShowHelp] = useState(false); 
  const [showInventory, setShowInventory] = useState(false); 
  const [playerName, setLocalPlayerName] = useState('');

  // 🚀 1. トークン管理の厳格化（ガード機能）
  useEffect(() => {
    const gameViews = ['tutorial', 'setup', 'lobby', 'selection', 'waiting', 'game', 'ranking'];
    if (!token && gameViews.includes(view)) {
      addLog("⚠️ セキュリティ警告：不正なアクセスを検知。ログインが必要です。");
      setView('login');
    }
  }, [view, token, setView, addLog]);

  const triggerDeploySequence = useCallback(() => {
    if (isDeploying) return;
    setIsDeploying(true); 
    
    setTimeout(() => {
      setIsDeploying(false);
      setView('game');
    }, 2500);
  }, [isDeploying, setView]);

  useEffect(() => {
    (window as any).useGameStore = useGameStore;

    socket.on('connect', () => {
      if (socket.id) setStatus({ myId: socket.id });
    });

    socket.on(SERVER_EVENTS.GAME_START, () => setView('selection'));

    socket.on(SERVER_EVENTS.COMMENCE_OPERATION, () => {
      addLog("🚀 全員のリンクを検知。出撃シークエンスを開始します。");
      triggerDeploySequence(); 
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

    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      setStatus({ isGameOver: true, winnerId: data.winnerId });
    });

    socket.on(SERVER_EVENTS.ERROR_MESSAGE, (msg: string) => {
      showError(msg); 
      addLog(`⚠️ SERVER: ${msg}`);
    });

    socket.on(SERVER_EVENTS.ACTION_REJECTED, (data: any) => {
      const msg = data.reason || data.message || "ACTION REJECTED";
      showError(msg);
    });

    // 🚀 LOD連携：Phaserからのズーム更新をハンドル
    const handleZoomUpdate = (e: any) => {
      const zoom = e.detail.zoom ?? e.detail;
      setZoomLevel(zoom);
    };

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

    // イベントリスナーの登録
    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
    window.addEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate); // 🚀 追加

    return () => {
      socket.off(SERVER_EVENTS.TURN_START);
      socket.off(SERVER_EVENTS.SYNC_STATE);
      socket.off(SERVER_EVENTS.GAME_START);
      socket.off(SERVER_EVENTS.COMMENCE_OPERATION); 
      socket.off(SERVER_EVENTS.ERROR_MESSAGE);
      socket.off(SERVER_EVENTS.ACTION_REJECTED);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
      window.removeEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate); // 🚀 追加
    };
  }, [setStatus, syncServerState, addLog, showError, setZoomLevel, openPrediction, triggerDeploySequence, setView]);

  const handleOpenRanking = () => setView('ranking');
  const handleCloseRanking = () => setView('setup');

  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    socket.connect();
    
    if (!hasSeenTutorial) {
      setView('tutorial');
    } else {
      setView('setup');
    }
  };

  const handleSelectionComplete = useCallback(() => {
    setView('waiting');
  }, [setView]);

  // --- 🖼️ レンダリング決定 ---
  let mainContent;

  if (view === 'login') {
    mainContent = <LoginView onLogin={handleLoginSubmit} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} />;
  } else if (view === 'tutorial') {
    mainContent = <TutorialView />;
  } else if (view === 'setup') {
    mainContent = <LobbySetupView onJoinSuccess={(id) => { setStatus({ roomId: id }); setView('lobby'); }} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenRanking={handleOpenRanking} />;
  } else if (view === 'lobby') {
    mainContent = <LobbyView roomId={roomId} players={players} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenRanking={handleOpenRanking} onAbort={() => setView('setup')} />;
  } else if (view === 'selection') {
    mainContent = (
      <GodSelectionView 
        onComplete={handleSelectionComplete} 
        onOpenSettings={() => setShowSettings(true)} 
        onOpenHelp={() => setShowHelp(true)} 
        onBack={() => setView('setup')}
      />
    );
  } else if (view === 'waiting') {
    mainContent = <WaitingView onStart={triggerDeploySequence} />;
  } else if (view === 'ranking') {
    mainContent = <RankingView onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onBack={handleCloseRanking} />;
  } else {
    // ⚔️ ゲーム本編
    mainContent = (
      <div className="flex w-full h-full overflow-hidden bg-slate-950">
        <Sidebar 
          onOpenSettings={() => setShowSettings(true)} 
          onOpenHelp={() => setShowHelp(true)} 
          onOpenInventory={() => setShowInventory(true)} 
        />
        
        <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 z-0">
            <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.08)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
          </div>

          <div className="relative z-10 w-full h-full pointer-events-none flex flex-col">
            <HUD />
            <BattleModal />
            <ResultView 
              onRestart={() => window.location.reload()} 
              onOpenSettings={() => setShowSettings(true)} 
              onOpenHelp={() => setShowHelp(true)}
              onOpenRanking={handleOpenRanking}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-200 font-body antialiased overflow-hidden select-none">
      {mainContent}
      
      <ErrorNotification />

      {/* 🚀 出撃ローディング演出 */}
      {isDeploying && (
        <div className="fixed inset-0 z-[200000] bg-slate-950 flex flex-col items-center justify-center animate-fadeIn">
          <div className="text-center">
            <div className="text-orange-500 text-sm font-black tracking-[0.6em] uppercase mb-6 animate-pulse">Neural Link Established</div>
            <div className="text-6xl font-black text-white italic tracking-tighter uppercase mb-4">Deploying Squad...</div>
            <div className="h-1.5 w-80 bg-slate-800 mx-auto overflow-hidden rounded-full border border-white/5">
              <div className="h-full bg-orange-500 animate-[progressBar_2.5s_ease-in-out_forwards]"></div>
            </div>
          </div>
        </div>
      )}

      {/* 共通モーダル */}
      {showSettings && <div className="fixed inset-0 z-[99999]"><SettingsView onBack={() => setShowSettings(false)} /></div>}
      {showHelp && <div className="fixed inset-0 z-[100000]"><HelpModal onClose={() => setShowHelp(false)} /></div>}
      {showInventory && <div className="fixed inset-0 z-[150000]"><InventoryModal onClose={() => setShowInventory(false)} /></div>}

      <style>{`
        @keyframes progressBar { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default App;