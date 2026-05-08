// src/App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import socket from './socket';
import { useGameStore, MasterData, GameState } from './store';

// ✅ コンポーネントのインポート
import { Sidebar } from './components/Sidebar';
import { ResultView } from './components/ResultView';
import { HUD } from './components/HUD';
import { PhaserGameView, PhaserGameHandle } from './components/PhaserGame';
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

import { useGameEvents } from './hook/useGameEvents';
import { PHASER_TO_REACT, REACT_TO_PHASER } from './game/events/PhaserBridge';
import { SERVER_EVENTS } from '../shared/socketEvents.js';

const App: React.FC = () => {
  useGameEvents();

  const { 
    addLog, playerName: storePlayerName, token, hasSeenTutorial, 
    setZoomLevel, isGameOver, roomId, players, setView, view,
    authenticatedFetch, setLookupData, syncServerState, myId,
    updateSelectedDistrict, updateStatsFromPhaser
  } = useGameStore(useShallow(state => ({
    addLog: state.addLog,
    playerName: state.playerName,
    token: state.token,
    hasSeenTutorial: state.hasSeenTutorial,
    setZoomLevel: state.setZoomLevel,
    isGameOver: state.isGameOver,
    roomId: state.roomId,
    players: state.players,
    setView: state.setView,
    view: state.view,
    authenticatedFetch: state.authenticatedFetch,
    setLookupData: state.setLookupData,
    syncServerState: state.syncServerState,
    myId: state.myId,
    updateSelectedDistrict: state.updateSelectedDistrict,
    updateStatsFromPhaser: state.updateStatsFromPhaser
  })));
  
  const gameRef = useRef<PhaserGameHandle | null>(null);
  const [isDeploying, setIsDeploying] = useState(false); 
  const [showSettings, setShowSettings] = useState(false); 
  const [showHelp, setShowHelp] = useState(false); 
  const [showRanking, setShowRanking] = useState(false);
  const [showInventory, setShowInventory] = useState(false); 
  const [playerName, setLocalPlayerName] = useState('');

  // 🎵 BGM管理用のRef
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // ✅ 修正：BGMの初期化と自動再生ブロック対策
  useEffect(() => {
    // BGMインスタンス作成
    const bgm = new Audio('/assets/audio/bgm/login-joinroom.ogg');
    bgm.loop = true;
    bgm.volume = 0.4;
    bgmRef.current = bgm;

    // ユーザー操作後に再生（ブラウザの自動再生ポリシー対策）
    const handleFirstClick = () => {
      bgm.play().catch(e => console.warn('[BGM] 再生失敗:', e));
      window.removeEventListener('click', handleFirstClick);
    };
    window.addEventListener('click', handleFirstClick);

    // クリーンアップ
    return () => {
      bgm.pause();
      bgm.currentTime = 0;
      window.removeEventListener('click', handleFirstClick);
    };
  }, []);

  // ✅ 修正：ゲーム画面遷移時にBGMを停止し、Phaserへ開始合図を送る
  useEffect(() => {
    if (view === 'game' && bgmRef.current) {
      // 1. React側のBGMを止める
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;

      // 2. Phaser側に「本番BGMを鳴らしていいよ！」と合図を送る
      window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.START_GAME_BGM));
    }
  }, [view]);

  const handleAbortGame = useCallback(() => {
    if (window.confirm("Abort mission and return to setup?")) {
      useGameStore.setState({ roomId: undefined, players: [] });
      setView('setup');
    }
  }, [setView]);

  // 🚀 1. マスターデータ同期
  useEffect(() => {
    if (token) {
      const init = async () => {
        try {
          const res = await authenticatedFetch<MasterData>('master-data.php');
          if (res && res.status === 'success') { 
            setLookupData(res.data); 
          }
        } catch (_e) { 
          addLog("❌ データ同期失敗"); 
        }
      };
      init();
    }
  }, [token, authenticatedFetch, setLookupData, addLog]);

  // 🚀 2. 出撃演出
  const triggerDeploySequence = useCallback(() => {
    if (isDeploying) return;
    setIsDeploying(true); 
    
    setTimeout(() => {
      setIsDeploying(false);
      setView('game');

      const myStartId = useGameStore.getState().selectedDistrictId;
      if (myStartId) {
        window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { 
          detail: { startDistrictId: myStartId } 
        }));
      }
    }, 2500);
  }, [isDeploying, setView]);

  // 🚀 3. サーバー & Phaser 信号の監視
  useEffect(() => {
    if (!socket) return;

    const handleCommence = (data: Record<string, unknown>) => {
      const currentView = useGameStore.getState().view;
      if (currentView === 'waiting' || currentView === 'selection') {
        if (data) syncServerState(data, myId);
        addLog("🚀 全員のリンク承認を確認。出撃します。");
        triggerDeploySequence();
      }
    };

    socket.on(SERVER_EVENTS.COMMENCE_OPERATION, handleCommence);
    socket.on(SERVER_EVENTS.GAME_START, handleCommence); 

    const handleZoomUpdate = (e: Event) => {
      const ce = e as CustomEvent<{ zoom: number }>;
      setZoomLevel(ce.detail.zoom ?? 1.0);
    };

    const handleUpdateStatus = (e: Event) => {
      const ce = e as CustomEvent<Partial<GameState>>;
      updateStatsFromPhaser(ce.detail); 
    };

    const handleSelectDistrict = (e: Event) => {
      const ce = e as CustomEvent<{ districtId: number; districtName: string; isMyTerritory: boolean; isNeutral: boolean }>;
      updateSelectedDistrict(ce.detail); 
    };
    
    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
    window.addEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);

    return () => {
      socket.off(SERVER_EVENTS.COMMENCE_OPERATION, handleCommence);
      socket.off(SERVER_EVENTS.GAME_START, handleCommence);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
      window.removeEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);
    };
  }, [triggerDeploySequence, setZoomLevel, addLog, syncServerState, myId, updateStatsFromPhaser, updateSelectedDistrict]);

  // 🚀 4. 遷移制御ロジック
  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    useGameStore.setState({ roomId: undefined, players: [] });
    setView('setup'); 
    setTimeout(() => {
      if (socket && !socket.connected) {
        socket.connect(); 
      }
    }, 100);
  };

  const handleLobbyStart = () => {
    if (!hasSeenTutorial) {
      setView('tutorial');
    } else {
      setView('selection');
    }
  };

  const handleSelectionComplete = useCallback(() => {
    setView('waiting');
  }, [setView]);

  const handleOpenRanking = () => setShowRanking(true);

  // --- 🖼️ コンテンツ切り替え ---
  let mainContent;
  switch (view) {
    case 'login':
      mainContent = <LoginView onLogin={handleLoginSubmit} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} />;
      break;
    case 'setup':
      mainContent = <LobbySetupView onJoinSuccess={(id) => { useGameStore.getState().setStatus({ roomId: id }); setView('lobby'); }} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenRanking={handleOpenRanking} />;
      break;
    case 'lobby':
      mainContent = <LobbyView roomId={roomId} players={players} onStart={handleLobbyStart} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenRanking={handleOpenRanking} onAbort={() => { useGameStore.setState({ roomId: undefined, players: [] }); setView('setup'); }} />;
      break;
    case 'tutorial':
      mainContent = <TutorialView onComplete={() => setView('selection')} />;
      break;
    case 'selection':
      mainContent = <GodSelectionView onComplete={handleSelectionComplete} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onBack={() => setView('lobby')} />;
      break;
    case 'waiting':
      mainContent = (
        <WaitingView 
          onStart={triggerDeploySequence} 
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          onOpenRanking={() => setShowRanking(true)}
          onAbort={handleAbortGame}
        />
      );
      break;
    case 'game':
      mainContent = (
        <div className="flex w-full h-full overflow-hidden bg-slate-950">
          <Sidebar onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenInventory={() => setShowInventory(true)} />
          <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
            <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
            <HUD />
            <BattleModal />
            {isGameOver && <ResultView onRestart={() => window.location.reload()} onOpenRanking={handleOpenRanking} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} />}
          </main>
        </div>
      );
      break;
    case 'ranking':
      mainContent = <RankingView onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onBack={() => setView('setup')} />;
      break;
    default:
      mainContent = <div className="text-white font-fix text-left">Neural Link Active...</div>;
  }

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-200 overflow-hidden select-none">
      <div className="w-full h-full relative overflow-hidden touch-pan-y custom-scrollbar text-left">
          {mainContent}
      </div>
      
      <ErrorNotification />
      
      {isDeploying && (
        <div className="fixed inset-0 z-[200000] bg-slate-950 flex flex-col items-center justify-center animate-fadeIn backdrop-blur-3xl">
          <div className="text-6xl font-black text-white italic uppercase mb-8 font-fix text-center tracking-tighter shadow-2xl">Deploying Squad...</div>
          <div className="h-2 w-96 bg-slate-900 rounded-full overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(234,88,12,0.3)]">
            <div className="h-full bg-orange-600 animate-[progressBar_2.5s_linear_forwards] shadow-[0_0_15px_#ea580c]"></div>
          </div>
          <p className="mt-4 text-orange-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse font-fix">Synchronizing neural link to Cebu Sector</p>
        </div>
      )}
      {showSettings && <div className="fixed inset-0 z-[300000]"><SettingsView onBack={() => setShowSettings(false)} /></div>}
      {showHelp && <div className="fixed inset-0 z-[310000]"><HelpModal onClose={() => setShowHelp(false)} /></div>}
      {showRanking && <div className="fixed inset-0 z-[320000]"><RankingView onBack={() => setShowRanking(false)} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} /></div>}
      {showInventory && <div className="fixed inset-0 z-[330000]"><InventoryModal onClose={() => setShowInventory(false)} /></div>}

      <style>{`
        @keyframes progressBar { 0% { width: 0%; } 100% { width: 100%; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .font-fix { line-height: 1.1; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;