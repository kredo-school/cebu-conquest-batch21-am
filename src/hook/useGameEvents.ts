// src/hooks/useGameEvents.ts

import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; 
import { useGameStore, Player } from '../store'; // 🚀 Player型をインポート
import { emitToPhaser, REACT_TO_PHASER, PHASER_TO_REACT } from '../game/events/PhaserBridge'; 

// サーバーから受信するプレイヤーデータの型定義
interface ServerPlayerPayload {
  playerId: string;
  id?: string;
  username?: string;
  playerName?: string;
  godId?: number | null;
  selectedGodId?: number | null;
  isReady?: boolean;
  [key: string]: unknown;
}

interface SyncStatePayload {
  players?: Record<string, ServerPlayerPayload> | ServerPlayerPayload[];
  [key: string]: unknown;
}

/**
 * 🛰️ useGameEvents: Socket.IO サーバーおよび Phaser からのリアルタイム同期を管理
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
    const handleStatsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { hp, stamina, atk, def, faith } = customEvent.detail;
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
    socket.on(SERVER_EVENTS.SYNC_STATE, (data: unknown) => {
      const currentView = useGameStore.getState().view;

      // 🚀 修正: unknownからRecord<string, Player>へキャスト
      const castedData = data as Record<string, Player>;
      syncServerState(castedData, myId);

      const payload = data as SyncStatePayload;
      if (payload.players) {
        const rawPlayers = payload.players;
        const playersArray = Array.isArray(rawPlayers) 
          ? rawPlayers 
          : Object.values(rawPlayers);
        
        setLobbyPlayers(playersArray.map((p) => ({
          playerId: (p.id || p.playerId) as string,
          username: p.username,
          playerName: p.playerName || p.username,
          godId: p.selectedGodId || p.godId || null,
          isReady: !!(p.selectedGodId || p.godId || p.isReady),
        })));
      }

      if (currentView === 'setup') {
        useGameStore.setState({ view: 'setup', roomId: undefined });
      }

      emitToPhaser(REACT_TO_PHASER.SYNC_MAP, data as Record<string, unknown>);
    });

    // 2. 🎮 試合開始通知 (gameStart)
    socket.on(SERVER_EVENTS.GAME_START, () => {
      addLog("🎮 サーバーが作戦開始を承認。システム同期中...");
      setGameStarted(true);
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { isFirstTurn: true });
    });

    // 3. 🤖 NPC情報の更新受信 (npcUpdate)
    socket.on(SERVER_EVENTS.NPC_UPDATE, (npcData: unknown) => {
      // 🚀 修正: ここでも期待される型 Record<string, Player> にキャスト
      const castedNpcs = npcData as Record<string, Player>; 
      setNpcs(castedNpcs);
      emitToPhaser(REACT_TO_PHASER.UPDATE_NPCS, npcData as Record<string, unknown>);
    });

    // 3.5. 📡 ロビー更新通知 (lobbyUpdated)
    socket.on('lobbyUpdated', (data: unknown) => {
      const payload = data as SyncStatePayload;
      if (payload?.players && Array.isArray(payload.players)) {
        setLobbyPlayers(payload.players.map((p) => ({
          playerId: (p.id || p.playerId) as string,
          username: p.username,
          playerName: p.playerName || p.username,
          godId: p.selectedGodId || p.godId || null,
          isReady: !!(p.selectedGodId || p.godId || p.isReady),
        })));
      }
    });

    // 4. 📢 ターン開始通知 (turnStart)
    socket.on(SERVER_EVENTS.TURN_START, (data: unknown) => {
      const payload = data as { turnOwnerId: string; turn: number };
      const isMe = payload.turnOwnerId === myId;
      setStatus({ 
        isMyTurn: isMe,
        turn: payload.turn 
      });
      addLog(`📢 Turn ${payload.turn} 開始: ${isMe ? 'あなたのフェーズです' : '敵対勢力のフェーズです'}`);
      
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, {
        turn: payload.turn, 
        isMyTurn: isMe 
      });
    });

    // 5. ⚔️ 戦闘結果の受信 (battleResult)
    socket.on(SERVER_EVENTS.BATTLE_RESULT, (result: unknown) => {
      const payload = result as { winnerId: string };
      addLog(`⚔️ 記録確認: ${payload.winnerId === myId ? '作戦成功（勝利）' : '作戦失敗（敗北）'}`);
      emitToPhaser(REACT_TO_PHASER.BATTLE_EFFECT, result as Record<string, unknown>);
    });

    // 6. 🚩 領土更新通知 (territoryUpdated)
    socket.on(SERVER_EVENTS.TERRITORY_UPDATED, (data: unknown) => {
      const payload = data as { districtId: string; ownerName: string };
      addLog(`🚩 地区 ${payload.districtId} が ${payload.ownerName} により制圧されました`);
      emitToPhaser(REACT_TO_PHASER.TERRITORY_EFFECT, data as Record<string, unknown>);
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
    socket.on(SERVER_EVENTS.GAME_OVER, (data: unknown) => {
      const payload = data as { winnerName: string; winnerId: string };
      addLog(`🏁 ミッション終了。勝者: ${payload.winnerName}`);
      setStatus({ isGameOver: true, winnerId: payload.winnerId });
      emitToPhaser(REACT_TO_PHASER.GAME_OVER_EFFECT, payload as Record<string, unknown>);
    });

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