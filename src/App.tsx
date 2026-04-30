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

// 🚀 追加：カスタムフック（通信司令塔）
import { useGameEvents } from './hook/useGameEvents';

// 🔴 ブリッジ定数とイベント定数
import { PHASER_TO_REACT } from './game/events/PhaserBridge';
import { SERVER_EVENTS } from '../shared/socketEvents.js';

const App: React.FC = () => {
  // 🛰️ 通信イベントの監視を開始（NPC更新やステータス同期をバックグラウンドで実行）
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
    view 
  } = useGameStore();
  
  const gameRef = useRef<any>(null);
  
  const [isDeploying, setIsDeploying] = useState(false); 
  const [showSettings, setShowSettings] = useState(false); 
  const [showHelp, setShowHelp] = useState(false); 
  const [showInventory, setShowInventory] = useState(false); 
  const [playerName, setLocalPlayerName] = useState('');

  // 🚀 1. セキュリティ・ガード（トークンなしでの侵入を阻止）
  useEffect(() => {
    const gameViews = ['tutorial', 'setup', 'lobby', 'selection', 'waiting', 'game', 'ranking'];
    if (!token && gameViews.includes(view)) {
      addLog("⚠️ セキュリティ警告：アクセス権限がありません。再ログインしてください。");
      setView('login');
    }
  }, [view, token, setView, addLog]);

  // 🚀 2. 出撃演出（デプロイ・シーケンス）
  const triggerDeploySequence = useCallback(() => {
    if (isDeploying) return;
    setIsDeploying(true); 
    
    // 2.5秒のスキャン・デプロイ演出の後にゲーム画面へ
    setTimeout(() => {
      setIsDeploying(false);
      setView('game');
    }, 2500);
  }, [isDeploying, setView]);

  // 🚀 3. Phaser ↔ React 連携（UI的な橋渡し）
  useEffect(() => {
    // デバッグ用：グローバルからストアを覗けるように設定
    (window as any).useGameStore = useGameStore;

    socket.on('connect', () => {
      if (socket.id) setStatus({ myId: socket.id });
    });

    // ゲーム開始時のフロー
    socket.on(SERVER_EVENTS.GAME_START, () => setView('selection'));

    // 全員準備完了後の出撃信号
    socket.on(SERVER_EVENTS.COMMENCE_OPERATION, () => {
      addLog("🚀 全員のリンクを検知。出撃シークエンスを開始します。");
      triggerDeploySequence(); 
    });

    // ゲーム終了のUI反映
    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      setStatus({ isGameOver: true, winnerId: data.winnerId });
    });

    // 🚀 LOD連携：Phaserからのズーム情報をHUDに反映
    const handleZoomUpdate = (e: any) => {
      const zoom = e.detail.zoom ?? e.detail;
      setZoomLevel(zoom);
    };

    const handleUpdateStatus = (e: any) => {
      const current = useGameStore.getState();
      if (current.isGameOver) return;
      setStatus(e.detail);
    };

    // 🚀 地区選択：ゲーム本編中かつ自分のターンのみ予測画面を開く
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

    // --- イベントリスナー登録 ---
    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
    window.addEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate);

    return () => {
      socket.off(SERVER_EVENTS.GAME_START);
      socket.off(SERVER_EVENTS.COMMENCE_OPERATION); 
      socket.off(SERVER_EVENTS.GAME_OVER);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleUpdateStatus);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleDistrictSelected);
      window.removeEventListener(PHASER_TO_REACT.ZOOM_UPDATED, handleZoomUpdate);
    };
  }, [setStatus, addLog, setZoomLevel, openPrediction, triggerDeploySequence, setView]);

  // 🚀 ビュー制御ハンドラ
  const handleOpenRanking = () => setView('ranking');
  const handleCloseRanking = () => setView('setup');

  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    // ログイン成功時にSocketを起動
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

  // --- 🖼️ UI 決定ロジック ---
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
    // ⚔️ ゲーム本編：メインインターフェース
    mainContent = (
      <div className="flex w-full h-full overflow-hidden bg-slate-950">
        {/* サイドバー：ステータス管制 */}
        <Sidebar 
          onOpenSettings={() => setShowSettings(true)} 
          onOpenHelp={() => setShowHelp(true)} 
          onOpenInventory={() => setShowInventory(true)} 
        />
        
        {/* メインマップ：Phaser & HUD */}
        <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 z-0">
            <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
            {/* 背景グリッド：サイバー感の演出 */}
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
  }

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-200 font-body antialiased overflow-hidden select-none">
      {mainContent}
      
      {/* 📡 全画面共通の通知システム */}
      <ErrorNotification />

      {/* 🚀 出撃ローディング演出（Deploy Overlay） */}
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

      {/* 共通オーバーレイ・モーダル */}
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