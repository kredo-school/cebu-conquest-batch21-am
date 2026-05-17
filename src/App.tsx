import { emitToPhaser, REACT_TO_PHASER } from "./game/events/PhaserBridge";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import socket from "./socket";
import { useGameStore, MasterData } from "./store";

import { Sidebar } from "./components/Sidebar";
import { ResultView } from "./components/ResultView";
import { HUD } from "./components/HUD";
import { PhaserGameView, PhaserGameHandle } from "./components/PhaserGame";
import { LoginView } from "./components/LoginView";
import { LobbySetupView } from "./components/LobbySetupView";
import { LobbyView } from "./components/LobbyView";
import { GodSelectionView } from "./components/GodSelectionView";
import { WaitingView } from "./components/WaitingView";
import { BattleModal } from "./components/BattleModal";
import { SettingsView } from "./components/SettingsView";
import { RankingView } from "./components/RankingView";
import { HelpModal } from "./components/HelpModal";
import { InventoryModal } from "./components/InventoryModal";
import { TutorialView } from "./components/TutorialView";
import { ErrorNotification } from "./components/ErrorNotification";
import { AudioController } from "./components/AudioController";
import { useGameEvents } from "./hook/useGameEvents";
import { stopBGM } from "./hook/useBGM";

const App: React.FC = () => {
  // 🛰️ Phaser信号とサーバーイベント（gameOver等）をここで一括管理
  useGameEvents();

  const {
    addLog,
    playerName: storePlayerName,
    token,
    hasSeenTutorial,
    isGameOver,
    roomId,
    players,
    setView,
    view,
    authenticatedFetch,
    setLookupData,
  } = useGameStore(
    useShallow((state) => ({
      addLog: state.addLog,
      playerName: state.playerName,
      token: state.token,
      hasSeenTutorial: state.hasSeenTutorial,
      isGameOver: state.isGameOver,
      roomId: state.roomId,
      players: state.players,
      setView: state.setView,
      view: state.view,
      authenticatedFetch: state.authenticatedFetch,
      setLookupData: state.setLookupData,
    })),
  );

  const gameRef = useRef<PhaserGameHandle | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [playerName, setLocalPlayerName] = useState("");

  // ゲーム開始時：HTML側の曲を止めてPhaser側の戦闘BGMへ切り替え
  useEffect(() => {
    if (view === "game") {
      stopBGM();
      emitToPhaser(REACT_TO_PHASER.START_GAME_BGM);
    }
  }, [view]);

  const handleAbortGame = useCallback(() => {
    if (window.confirm("Abort mission and return to setup?")) {
      // 🚀 I-6: roomId: undefined を roomId: '' に統一
      useGameStore.setState({ roomId: "", players: [] });
      setView("setup");
    }
  }, [setView]);

  // マスターデータ同期
  useEffect(() => {
    if (token) {
      const init = async () => {
        try {
          const res = await authenticatedFetch<MasterData>("master-data.php");
          if (res && res.status === "success") {
            setLookupData(res.data);
          }
        } catch (_e) {
          addLog("❌ Data synchronization failed");
        }
      };
      init();
    }
  }, [token, authenticatedFetch, setLookupData, addLog]);

  // 出撃演出
  const triggerDeploySequence = useCallback(() => {
    if (isDeploying) return;
    setIsDeploying(true);

    setTimeout(() => {
      setIsDeploying(false);
      setView("game");

      // Phaser の create() 完了を待ってからイベントを送る
      // （setView('game') 直後はまだ Phaser が初期化されていないため）
      setTimeout(() => {
        const { selectedGodId, selectedDistrictId: startId } = useGameStore.getState();

        // SET_AVATAR 再送（GodSelectionView での dispatch 時は Phaser 未起動だったため）
        if (selectedGodId) {
          const GOD_KEY_MAP: Record<number, string> = {
            1: "god-neil",
            2: "god-garry",
            3: "god-shem",
            4: "god-quisie",
            5: "god-eduardo",
            6: "god-kurt",
            7: "god-stephen",
            8: "god-bernardine",
          };
          const godKey = GOD_KEY_MAP[selectedGodId];
          if (godKey) {
            window.dispatchEvent(
              new CustomEvent(REACT_TO_PHASER.SET_AVATAR, {
                detail: { godKey, godId: selectedGodId },
              }),
            );
          }
        }

        if (startId) {
          window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.START_GAME_BGM));
        }
      }, 500);
    }, 2500);
  }, [isDeploying, setView]);

  // 🚀 I-5: GAME_START および COMMENCE_OPERATION の重複リスナーを削除
  // (状態更新は useGameEvents.ts が、出撃アニメーションは WaitingView.tsx が担当します)

  const handleLoginSubmit = async (name: string) => {
    setLocalPlayerName(name);
    // 🚀 I-6: roomId: undefined を roomId: '' に統一
    useGameStore.setState({ roomId: "", players: [] });
    setView("setup");
    setTimeout(() => {
      if (socket && !socket.connected) {
        socket.connect();
      }
    }, 100);
  };

  const handleLobbyStart = () => {
    if (!hasSeenTutorial) {
      setView("tutorial");
    } else {
      setView("selection");
    }
  };

  const handleSelectionComplete = useCallback(() => {
    setView("waiting");
  }, [setView]);

  const handleOpenRanking = () => setShowRanking(true);

  // --- 🖼️ コンテンツ切り替え ---
  let mainContent;
  switch (view) {
    case "login":
      mainContent = (
        <LoginView
          onLogin={handleLoginSubmit}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
        />
      );
      break;
    case "setup":
      mainContent = (
        <LobbySetupView
          onJoinSuccess={(id) => {
            useGameStore.getState().setStatus({ roomId: id });
            setView("lobby");
          }}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          onOpenRanking={handleOpenRanking}
        />
      );
      break;
    case "lobby":
      // 🚀 I-6: onAbort時の roomId: undefined を roomId: '' に統一
      mainContent = (
        <LobbyView
          roomId={roomId}
          players={players}
          onStart={handleLobbyStart}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          onOpenRanking={handleOpenRanking}
          onAbort={() => {
            useGameStore.setState({ roomId: "", players: [] });
            setView("setup");
          }}
        />
      );
      break;
    case "tutorial":
      mainContent = <TutorialView onComplete={() => setView("selection")} />;
      break;
    case "selection":
      mainContent = (
        <GodSelectionView
          onComplete={handleSelectionComplete}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          onBack={() => setView("lobby")}
        />
      );
      break;
    case "waiting":
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
    case "game":
      mainContent = (
        <div className="flex w-full h-full overflow-hidden bg-slate-950">
          <Sidebar
            onOpenSettings={() => setShowSettings(true)}
            onOpenHelp={() => setShowHelp(true)}
            onOpenInventory={() => setShowInventory(true)}
          />
          <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center">
            <PhaserGameView ref={gameRef} playerName={playerName || storePlayerName} />
            <HUD />
            <BattleModal />

            {/* 🚀 HP0敗北時などに Phaser の上にリザルトを重ねる演出 */}
            {isGameOver && (
              <ResultView
                onRestart={() => window.location.reload()}
                onOpenRanking={handleOpenRanking}
                onOpenSettings={() => setShowSettings(true)}
                onOpenHelp={() => setShowHelp(true)}
              />
            )}
          </main>
        </div>
      );
      break;
    case "ranking":
      mainContent = (
        <RankingView
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          onBack={() => setView("setup")}
        />
      );
      break;
    default:
      mainContent = <div className="text-white font-fix text-left">Neural Link Active...</div>;
  }

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-200 overflow-hidden select-none text-left">
      <AudioController isSettingsOpen={showSettings} />

      <div className="w-full h-full relative overflow-hidden touch-pan-y custom-scrollbar">
        {mainContent}
      </div>

      <ErrorNotification />

      {isDeploying && (
        <div className="fixed inset-0 z-[200000] bg-slate-950 flex flex-col items-center justify-center animate-fadeIn backdrop-blur-3xl">
          <div className="text-6xl font-black text-white italic uppercase mb-8 font-fix text-center tracking-tighter shadow-2xl">
            Deploying Squad...
          </div>
          <div className="h-2 w-96 bg-slate-900 rounded-full overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(234,88,12,0.3)]">
            <div className="h-full bg-orange-600 animate-[progressBar_2.5s_linear_forwards] shadow-[0_0_15px_#ea580c]"></div>
          </div>
          <p className="mt-4 text-orange-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse font-fix">
            Synchronizing neural link to Cebu Sector
          </p>
        </div>
      )}
      {showSettings && (
        <div className="fixed inset-0 z-[300000]">
          <SettingsView onBack={() => setShowSettings(false)} />
        </div>
      )}
      {showHelp && (
        <div className="fixed inset-0 z-[310000]">
          <HelpModal onClose={() => setShowHelp(false)} />
        </div>
      )}
      {showRanking && (
        <div className="fixed inset-0 z-[320000]">
          <RankingView
            onBack={() => setShowRanking(false)}
            onOpenSettings={() => setShowSettings(true)}
            onOpenHelp={() => setShowHelp(true)}
          />
        </div>
      )}
      {showInventory && (
        <div className="fixed inset-0 z-[330000]">
          <InventoryModal onClose={() => setShowInventory(false)} />
        </div>
      )}

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
