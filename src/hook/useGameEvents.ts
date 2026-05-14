// src/hooks/useGameEvents.ts

import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; 
import { useGameStore, Player } from '../store'; 
import { emitToPhaser, REACT_TO_PHASER, PHASER_TO_REACT } from '../game/events/PhaserBridge'; 

// 🚀 サーバーから受信するプレイヤーデータの型定義
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

// 🚀 サーバーから受信する全体同期データの型定義
interface SyncStatePayload {
  roomId?: string;
  players?: Record<string, ServerPlayerPayload> | ServerPlayerPayload[];
  districts?: Record<string, string>;
  turn?: number;
  status?: string;
  gameStarted?: boolean;
  isGameOver?: boolean;
  winnerId?: string;
  winnerName?: string;
  phase?: string;
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
    setGameStarted,
    updateSelectedDistrict 
  } = useGameStore();

  useEffect(() => {
    if (!socket) return;

    // 0. 🔌 接続時にIDを同期
    const handleConnect = () => {
      console.log("🔌 Connected to server. ID:", socket.id);
      setStatus({ myId: socket.id });
      const { roomId, playerName } = useGameStore.getState();
      
      if (roomId && typeof roomId === 'string' && roomId.length > 0 && playerName) {
        socket.emit('RECOVER_CONNECTION', { roomId, playerName });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected && !useGameStore.getState().myId) {
      handleConnect();
    }

    // A. Phaser → React 同期リスナー
    const handleStatsUpdate = (e: Event) => {
      const ce = e as CustomEvent;
      const { hp, stamina, atk, def, faith } = ce.detail;
      setStatus({ hp, ap: stamina, atk, def, blessing: faith });
    };

    const handleSelectDistrict = (e: Event) => {
      const ce = e as CustomEvent;
      const { districtId, districtName, isMyTerritory, isNeutral } = ce.detail;
      updateSelectedDistrict({ districtId, districtName, isMyTerritory, isNeutral });
    };

    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);

    // B. Socket.IO サーバー → クライアント 同期リスナー

    // 1. 🛡️ サーバー全体のステート同期
    const handleSyncState = (data: unknown) => {
      const currentView = useGameStore.getState().view;
      const payload = data as SyncStatePayload; // 🚀 any を排除
      
      const castedPlayers = (payload.players || {}) as Record<string, Player>;
      syncServerState(castedPlayers, myId);

      if (payload.players) {
        const rawPlayers = payload.players;
        const playersArray = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
        
        setLobbyPlayers(playersArray.map((p) => ({
          playerId: (p.id || p.playerId) as string,
          username: p.username,
          playerName: p.playerName || p.username,
          godId: p.selectedGodId || p.godId || null,
          isReady: !!p.isReady,
        })));
      }

      // 🚀 修正: Ln 111 の any を排除
      if (currentView === 'setup' && !payload.roomId) {
        useGameStore.setState({ view: 'setup', roomId: undefined });
      }

      emitToPhaser(REACT_TO_PHASER.SYNC_MAP, payload as unknown as Record<string, unknown>);
    };

    // 2. 🎮 試合開始通知
    const handleGameBegin = (_data: unknown) => {
      addLog("🎮 Server approved operation. Synchronizing system...");
      setGameStarted(true);
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { isFirstTurn: true });

      const state = useGameStore.getState();
      const rawPlayers = state.players;
      if (rawPlayers && rawPlayers.length > 0) {
        const playersMap: Record<string, Player> = {};
        rawPlayers.forEach((p) => {
          // 🚀 修正: Ln 134, 135 の any を排除
          const key = p.id;
          if (key) playersMap[key] = p;
        });
        
        // 🚀 修正: Ln 139 の any を排除 (state は GameState 型なので直接アクセス可能)
        emitToPhaser(REACT_TO_PHASER.SYNC_MAP, {
          players: playersMap,
          districts: state.districts,
          turn: state.turn,
          status: 'playing',
        });
      }
    };

    // 3. 🤖 NPC情報の更新
    const handleNpcUpdate = (npcData: unknown) => {
      const castedNpcs = npcData as Record<string, Player>; 
      setNpcs(castedNpcs);
      emitToPhaser(REACT_TO_PHASER.UPDATE_NPCS, npcData as Record<string, unknown>);
    };

    // 4. 📢 ターン開始通知
    const handleTurnStart = (data: unknown) => {
      const payload = data as { turnOwnerId?: string; activePlayerId?: string; turn: number; isMyTurn?: boolean };
      const isMe = payload.isMyTurn !== undefined ? payload.isMyTurn : (payload.turnOwnerId === myId || payload.activePlayerId === myId);

      setStatus({ isMyTurn: isMe, turn: payload.turn });
      addLog(`📢 Turn ${payload.turn} Start: ${isMe ? 'Your Turn' : 'Enemy turn'}`);
      
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { turn: payload.turn, isMyTurn: isMe });
    };

    // 5. ⚔️ 戦闘結果の受信
    const handleBattleResult = (result: unknown) => {
      const payload = result as { winnerId: string };
      addLog(`⚔️ Combat Record: ${payload.winnerId === myId ? 'Operation Successful' : 'Operation Failed'}`);
      emitToPhaser(REACT_TO_PHASER.BATTLE_EFFECT, result as Record<string, unknown>);
    };

    // 6. 🚩 領土更新通知
    const handleTerritoryUpdated = (data: unknown) => {
      const payload = data as { districtId: string; ownerName: string };
      addLog(`🚩 Sector ${payload.districtId} secured by ${payload.ownerName}`);
      emitToPhaser(REACT_TO_PHASER.TERRITORY_EFFECT, data as Record<string, unknown>);
    };

    // 7. 🚫 アクション拒否
    const handleActionRejected = (data: { reason: string }) => {
      setErrorMessage(data.reason); 
      addLog(`⚠️ Command Rejected: ${data.reason}`);
    };

    // 8. 🏆 ゲーム終了通知
    const handleGameOver = (data: unknown) => {
      const payload = data as { winnerName: string; winnerId: string };
      const isWinner = payload.winnerId === myId;

      addLog(isWinner ? "🏆 MISSION COMPLETE: Area secured!" : "💀 MISSION FAILED: Neural link severed...");
      
      setTimeout(() => {
        setStatus({ isGameOver: true, winnerId: payload.winnerId, view: 'ranking' });
      }, 1500);

      emitToPhaser(REACT_TO_PHASER.GAME_OVER_EFFECT, payload as unknown as Record<string, unknown>);
    };

    // 9. 💬 チャットメッセージ
    const handleReceiveChat = (data: { username: string; message: string }) => {
      addLog({ sender: data.username || 'Operator', message: data.message });
    };

    // ====== リスナーの登録 ======
    socket.on(SERVER_EVENTS.SYNC_STATE, handleSyncState);
    socket.on(SERVER_EVENTS.GAME_START, handleGameBegin);
    socket.on(SERVER_EVENTS.COMMENCE_OPERATION, handleGameBegin); 
    socket.on(SERVER_EVENTS.NPC_UPDATE, handleNpcUpdate);
    socket.on(SERVER_EVENTS.TURN_START, handleTurnStart);
    socket.on(SERVER_EVENTS.BATTLE_RESULT, handleBattleResult);
    socket.on(SERVER_EVENTS.TERRITORY_UPDATED, handleTerritoryUpdated);
    socket.on(SERVER_EVENTS.ACTION_REJECTED, handleActionRejected);
    socket.on(SERVER_EVENTS.GAME_OVER, handleGameOver);
    socket.on(SERVER_EVENTS.RECEIVE_CHAT, handleReceiveChat);

    return () => {
      socket.off(SERVER_EVENTS.SYNC_STATE, handleSyncState);
      socket.off(SERVER_EVENTS.GAME_START, handleGameBegin);
      socket.off(SERVER_EVENTS.COMMENCE_OPERATION, handleGameBegin);
      socket.off(SERVER_EVENTS.NPC_UPDATE, handleNpcUpdate);
      socket.off(SERVER_EVENTS.TURN_START, handleTurnStart);
      socket.off(SERVER_EVENTS.BATTLE_RESULT, handleBattleResult);
      socket.off(SERVER_EVENTS.TERRITORY_UPDATED, handleTerritoryUpdated);
      socket.off(SERVER_EVENTS.ACTION_REJECTED, handleActionRejected);
      socket.off(SERVER_EVENTS.GAME_OVER, handleGameOver);
      socket.off(SERVER_EVENTS.RECEIVE_CHAT, handleReceiveChat);
      socket.off('connect', handleConnect);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);
    };
  }, [myId, syncServerState, setNpcs, addLog, setStatus, setErrorMessage, setLobbyPlayers, setGameStarted, updateSelectedDistrict]);
};