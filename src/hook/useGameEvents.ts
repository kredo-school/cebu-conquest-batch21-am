// src/hooks/useGameEvents.ts

import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; 
import { useGameStore } from '../store';
import { emitToPhaser, REACT_TO_PHASER, PHASER_TO_REACT } from '../game/events/PhaserBridge'; 

/**
 * 🛰️ useGameEvents: Socket.IO サーバーおよび Phaser からのリアルタイム同期を管理
 * 修正内容: 
 * 1. フロー制御を App.tsx に一任するため setView を排除
 * 2. GDD v3.1 準拠: Phaser からの STATS_UPDATED リスナーを追加
 */
export const useGameEvents = () => {
  const { 
    syncServerState, 
    setNpcs, 
    addLog, 
    myId,
    setStatus,
    setErrorMessage,
    setLobbyPlayers,
    setGameStarted
  } = useGameStore();

  useEffect(() => {
    if (!socket) return;

    // ---------------------------------------------------------
    // A. Phaser → React 同期リスナー (Task 3: HUD更新用)
    // ---------------------------------------------------------
    // 🚀 修正: anyを排除。標準のEvent型で受け取り、CustomEventにキャストして安全にdetailを展開
    const handleStatsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { hp, stamina, atk, def, faith } = customEvent.detail;
      // GDD 4-1 のパラメータ名に基づき Zustand を更新
      setStatus({ 
        hp, 
        ap: stamina, 
        atk, 
        def, 
        blessing: faith 
      });
    };

    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);

    // ---------------------------------------------------------
    // B. Socket.IO サーバー → クライアント 同期リスナー
    // ---------------------------------------------------------

    // 1. 🛡️ サーバー全体のステート同期 (syncState)
    socket.on(SERVER_EVENTS.SYNC_STATE, (data) => {
      // 🚀 修正: 現在の画面状態を直接取得
      const currentView = useGameStore.getState().view;

      syncServerState(data, myId);

      // 🚀 lobbyPlayers 同期: syncStateのペイロードに players が含まれていれば lobbyPlayers も更新
      if (data.players) {
        const rawPlayers = data.players as Record<string, unknown>;
        
        // 修正箇所: 配列として明示的にキャストし、map内の引数 p の型指定を外して推論させる
        const playersArray = (Array.isArray(data.players) ? data.players : Object.values(rawPlayers)) as Record<string, unknown>[];
        
        setLobbyPlayers(playersArray.map((p) => ({
          playerId: p.id as string,
          username: p.username as string | undefined,
          playerName: (p.playerName || p.username) as string | undefined,
          godId: (p.selectedGodId || p.godId || null) as number | null,
          isReady: !!(p.selectedGodId || p.godId || p.isReady),
        })));
      }

      // 🚀 ゴースト遷移ブロック 2（最終防衛線）:
      // TACTICAL SETUP 画面にいる間に、サーバーが過去の部屋情報（roomId）を送ってきて
      // syncServerState が勝手に view を 'lobby' に変えてしまっても、強制的に 'setup' に引き戻す！
      if (currentView === 'setup') {
        useGameStore.setState({ view: 'setup', roomId: undefined });
      }

      // Phaser側へ同期命令
      emitToPhaser(REACT_TO_PHASER.SYNC_MAP, data);
    });

    // 2. 🎮 試合開始通知 (gameStart)
    socket.on(SERVER_EVENTS.GAME_START, () => {
      addLog("🎮 サーバーが作戦開始を承認。システム同期中...");
      setGameStarted(true);
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { isFirstTurn: true });
    });

    // 3. 🤖 NPC情報の更新受信 (npcUpdate)
    socket.on(SERVER_EVENTS.NPC_UPDATE, (npcData) => {
      setNpcs(npcData);
      emitToPhaser(REACT_TO_PHASER.UPDATE_NPCS, npcData);
    });

    // 3.5. 📡 ロビー更新通知 (lobbyUpdated)
    // サーバーがロビー参加者の変更を通知するイベント
    socket.on('lobbyUpdated', (data: { players?: Record<string, unknown>[] }) => {
      if (data.players) {
        // 修正箇所: 引数 p の型指定を外し、TSの推論に任せる
        setLobbyPlayers(data.players.map((p) => ({
          playerId: (p.id || p.playerId) as string,
          username: p.username as string | undefined,
          playerName: (p.playerName || p.username) as string | undefined,
          godId: (p.selectedGodId || p.godId || null) as number | null,
          isReady: !!(p.selectedGodId || p.godId || p.isReady),
        })));
      }
    });

    // 4. 📢 ターン開始通知 (turnStart)
    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      const isMe = data.turnOwnerId === myId;
      setStatus({ 
        isMyTurn: isMe,
        turn: data.turn 
      });
      addLog(`📢 Turn ${data.turn} 開始: ${isMe ? 'あなたのフェーズです' : '敵対勢力のフェーズです'}`);
      
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, {
        turn: data.turn, 
        isMyTurn: isMe 
      });
    });

    // 5. ⚔️ 戦闘結果の受信 (battleResult)
    socket.on(SERVER_EVENTS.BATTLE_RESULT, (result) => {
      addLog(`⚔️ 記録確認: ${result.winnerId === myId ? '作戦成功（勝利）' : '作戦失敗（敗北）'}`);
      emitToPhaser(REACT_TO_PHASER.BATTLE_EFFECT, result);
    });

    // 6. 🚩 領土更新通知 (territoryUpdated)
    socket.on(SERVER_EVENTS.TERRITORY_UPDATED, (data) => {
      addLog(`🚩 地区 ${data.districtId} が ${data.ownerName} により制圧されました`);
      emitToPhaser(REACT_TO_PHASER.TERRITORY_EFFECT, data);
    });

    // 7. 🚫 アクション拒否通知 (actionRejected)
    socket.on(SERVER_EVENTS.ACTION_REJECTED, (data: { reason: string }) => {
      setErrorMessage(data.reason); 
      addLog(`⚠️ 指令拒否: ${data.reason}`);
    });

    // 8. 📥 汎用アクション結果 (actionResult)
    socket.on(SERVER_EVENTS.ACTION_RESULT, (data: { success: boolean, message: string }) => {
      if (!data.success) {
        setErrorMessage(data.message);
      }
      addLog(data.message);
    });

    // 9. 🏆 ゲーム終了通知 (gameOver)
    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      addLog(`🏁 ミッション終了。勝者: ${data.winnerName}`);
      setStatus({ isGameOver: true, winnerId: data.winnerId });
      emitToPhaser(REACT_TO_PHASER.GAME_OVER_EFFECT, data);
    });

    // クリーンアップ
    return () => {
      socket.off(SERVER_EVENTS.SYNC_STATE);
      socket.off(SERVER_EVENTS.GAME_START);
      socket.off(SERVER_EVENTS.NPC_UPDATE);
      socket.off(SERVER_EVENTS.TURN_START);
      socket.off(SERVER_EVENTS.BATTLE_RESULT);
      socket.off(SERVER_EVENTS.TERRITORY_UPDATED);
      socket.off(SERVER_EVENTS.ACTION_REJECTED);
      socket.off(SERVER_EVENTS.ACTION_RESULT);
      socket.off(SERVER_EVENTS.GAME_OVER);
      socket.off('lobbyUpdated');
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);
    };
  }, [myId, syncServerState, setNpcs, addLog, setStatus, setErrorMessage, setLobbyPlayers, setGameStarted]);
};