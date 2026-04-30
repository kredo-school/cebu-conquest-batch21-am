// src/App.tsx
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

// 🚀 カスタムフック：通信司令塔
import { useGameEvents } from './hook/useGameEvents';

// 🔴 ブリッジ定数とイベント定数（GDD v3.1 準拠）
import { PHASER_TO_REACT } from './game/events/PhaserBridge';
import { SERVER_EVENTS } from '../shared/socketEvents.js';

const App: React.FC = () => {
  // 🛰️ 通信イベントの監視を開始
  useGameEvents();

  const { 
    setStatus, addLog,
    playerName: storePlayerName,
    token,
    hasSeenTutorial, 
    setZoomLevel,
    openPrediction, 
    isGameOver, 
    roomId, 
    players, 
    setView, 
    view,
    authenticatedFetch, // ✅ 追加：マスターデータ取得用
    setLookupData      // ✅ 追加：辞書初期化用
  } = useGameStore();
  
  const gameRef = useRef<any>(null);
  
  const [isDeploying, setIsDeploying] = useState(false); 
  const [showSettings, setShowSettings] = useState(false); 
  const [showHelp, setShowHelp] = useState(false); 
  const [showInventory, setShowInventory] = useState(false); 
  const [playerName, setLocalPlayerName] = useState('');

  // 🚀 1. GDD v3.1: マスターデータの初期ロード
  // アプリ起動時（またはログイン後）に一度だけ実行し、ID解決用の辞書を作成
  useEffect(() => {
    if (token) {
      const initMasterData = async () => {
        try {
          const res = await authenticatedFetch('master-data.php');
          if (res.status === 'success') {
            setLookupData(res.data); // Zustand 内で Map オブジェクトを生成
            addLog("📡 システム辞書を同期：マップデータの解析が完了しました。");
          }
        } catch (e) {
          addLog("❌ システム辞書の同期に失敗しました。再起動してください。");
        }
      };
      initMasterData();
    }
  }, [token, authenticatedFetch, setLookupData, addLog]);

  // 🚀 2. セキュリティ・ガード
  useEffect(() => {
    const protectedViews = ['tutorial', 'setup', 'lobby', 'selection', 'waiting', 'game', 'ranking'];
    if (!token && protectedViews.includes(view)) {
      addLog("⚠️ セキュリティ警告：アクセス権限がありません。再ログインしてください。");
      setView('login');
    }
  }, [view, token, setView, addLog]);

  // 🚀 3. 出撃演出（デプロイ・シーケンス）
  const triggerDeploySequence = useCallback(() => {
    if (isDeploying) return;
    setIsDeploying(true); 
    
    setTimeout(() => {
      setIsDeploying(false);
      setView('game');
    }, 2500);
  }, [isDeploying, setView]);

  // 🚀 4. Phaser ↔ React 連携（イベントリスナー統合）
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      if (socket.id) setStatus({ myId: socket.id });
    });

    socket.on(SERVER_EVENTS.COMMENCE_OPERATION, () => {
      addLog("🚀 全員のリンクを検知。出撃シークエンスを開始します。");
      triggerDeploySequence(); 
    });

    // 🚀 LOD連携：ズームレベルを監視し、HUDの表示密度を制御
    const handleZoomUpdate = (e: any) => {
      const zoom = e.detail.zoom ?? e.detail;
      setZoomLevel(zoom);
    };

    const handleUpdateStatus = (e: any) => {
      if (useGameStore.getState().isGameOver) return;
      setStatus(e.detail);
    };

    const handleDistrictSelected = (e: any) => {
      const current = useGameStore.getState();
      const payload = e.detail;
      const districtId = payload.districtId ?? payload;
      const districtName = payload.districtName || `地区 ${districtId}`;
      
      setStatus({ selectedDistrictId: districtId });

      if (current.view === 'game' && current.turn > 0 && current.isMyTurn) {
        openPrediction(districtId, districtName, payload.isMyTerritory, payload.isNeutral);
      }
    };

    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
    window.addEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate);

    return () => {
      socket.off('connect');
      socket.off(SERVER_EVENTS.COMMENCE_OPERATION); 
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
      window.removeEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate);
    };
  }, [setStatus, addLog, setZoomLevel, openPrediction, triggerDeploySequence]);

  // 🚀 ビュー制御ハンドラ
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

  // --- 🖼️ ビュー・レンダリング・ロジック ---
  let mainContent;

  switch (view) {
    case 'login':
      mainContent = <LoginView onLogin={handleLoginSubmit} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} />;
      break;
    case 'tutorial':
      mainContent = <TutorialView />;
      break;
    case 'setup':
      mainContent = <LobbySetupView onJoinSuccess={(id) => { setStatus({ roomId: id }); setView('lobby'); }} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenRanking={handleOpenRanking} />;
      break;
    case 'lobby':
      mainContent = <LobbyView roomId={roomId} players={players} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenRanking={handleOpenRanking} onAbort={() => setView('setup')} />;
      break;
    case 'selection':
      mainContent = <GodSelectionView onComplete={handleSelectionComplete} onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onBack={() => setView('setup')} />;
      break;
    case 'waiting':
      mainContent = <WaitingView onStart={triggerDeploySequence} />;
      break;
    case 'ranking':
      mainContent = <RankingView onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onBack={handleCloseRanking} />;
      break;
    case 'game':
      mainContent = (
        <div className="flex w-full h-full overflow-hidden bg-slate-950">
          <Sidebar onOpenSettings={() => setShowSettings(true)} onOpenHelp={() => setShowHelp(true)} onOpenInventory={() => setShowInventory(true)} />
          <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 z-0">
              <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(249,115,22,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(249,115,22,0.08)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
            </div>
            <div className="relative z-10 w-full h-full pointer-events-none flex flex-col">
              <HUD />
              <BattleModal />
              {isGameOver && (
                <ResultView 
                  onRestart={() => window.location.reload()} 
                  onOpenSettings={() => setShowSettings(true)} 
                  onOpenHelp={() => setShowHelp(true)}
                  onOpenRanking={handleOpenRanking}
                />
              )}
            </div>
          </main>
        </div>
      );
      break;
    default:
      mainContent = <div className="text-white">System Loading...</div>;
  }

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-200 font-body antialiased overflow-hidden select-none">
      {mainContent}
      
      <ErrorNotification />

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