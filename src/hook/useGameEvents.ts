/// <reference types="vite/client" />
import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; 
import { useGameStore, Player } from '../store'; 
import { emitToPhaser, REACT_TO_PHASER, PHASER_TO_REACT } from '../game/events/PhaserBridge'; 
import { playBGM } from '../hook/useBGM'; 

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
 * 🛰️ useGameEvents: Manages persistent real-time socket streams & Phaser bridge datalinks.
 * Resolved: Aligned incoming Phaser event payload keys safely into UI state architectures.
 */
export const useGameEvents = () => {
  useEffect(() => {
    if (!socket) return;

    // 0. 🔌 Connection Lifecycle Recovery Handler
    const handleConnect = () => {
      useGameStore.setState({ myId: socket.id });
      const { roomId, playerName } = useGameStore.getState();
      if (roomId && typeof roomId === 'string' && roomId.length > 0 && playerName) {
        socket.emit('RECOVER_CONNECTION', { roomId, playerName });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected && !useGameStore.getState().myId) { handleConnect(); }

    // A. 🎮 Phaser Instance -> React UI State Synchronization
    const handleStatsUpdate = (e: Event) => {
      const ce = e as CustomEvent;
      const { hp, stamina, atk, def, faith } = ce.detail;
      
      useGameStore.getState().setStatus({ 
        hp: hp, 
        ap: stamina,       // stamina → ap (UIキー変換)
        atk: atk, 
        def: def, 
        blessing: faith    // faith → blessing (UIキー変換)
      });
    };

    const handleSelectDistrict = (e: Event) => {
      const ce = e as CustomEvent;
      const { districtId, districtName, isMyTerritory, isNeutral, spotId } = ce.detail;
      useGameStore.getState().updateSelectedDistrict({ districtId, districtName, isMyTerritory, isNeutral, spotId });
    };

    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);

    // B. 📡 Socket.IO Server -> Client Protocol Synchronization

    // 1. Core Server State Sync Matrix
    const handleSyncState = (data: unknown) => {
      const store = useGameStore.getState();
      
      // 🚀 修正ポイント: すでにゲームオーバー状態（真の決着状態）であるならば、
      // サーバーから遅れて降ってくる古い同期データによる状態の巻き戻し・上書きを完全にブロックする
      if (store.isGameOver) return;

      const currentView = store.view;
      const payload = data as SyncStatePayload; 

      store.syncServerState(payload as unknown as Record<string, unknown>, socket.id || store.myId);

      // Update Active Lobby Operator Registries
      if (payload.players) {
        const rawPlayers = payload.players;
        const playersArray = Array.isArray(rawPlayers) ? rawPlayers : Object.values(rawPlayers);
        
        store.setLobbyPlayers(playersArray.map((p) => ({
          playerId: (p.id || p.playerId) as string,
          username: p.username,
          playerName: p.playerName || p.username,
          godId: p.selectedGodId || p.godId || null,
          isReady: !!p.isReady,
        })));
      }

      if (currentView === 'setup' && !payload.roomId) {
        useGameStore.setState({ view: 'setup', roomId: undefined });
      }

      // Route data matrices seamlessly to active Phaser instance
      emitToPhaser(REACT_TO_PHASER.SYNC_MAP, {
        players: payload.players, 
        districts: payload.districts,
        turn: payload.turn,
        status: payload.status || 'playing'
      });
    };

    // 2. Mission Commencement Protocol
    const handleGameBegin = (_data: unknown) => {
      const store = useGameStore.getState();
      store.addLog("🎮 Mission commencement authorized.");
      store.setGameStarted(true);
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { isFirstTurn: true });

      const rawPlayers = store.players; 
      if (rawPlayers && rawPlayers.length > 0) {
        const playersMap: Record<string, Player> = {};
        rawPlayers.forEach((p) => {
          const key = p.id;
          if (key) playersMap[key] = p;
        });
        
        emitToPhaser(REACT_TO_PHASER.SYNC_MAP, {
          players: playersMap, 
          districts: store.districts,
          turn: store.turn,
          status: 'playing',
        });
      }
    };

    // 3. Auxiliary AI Unit Modifiers
    const handleNpcUpdate = (npcData: unknown) => {
      useGameStore.getState().setNpcs(npcData as Record<string, Player>);
      emitToPhaser(REACT_TO_PHASER.UPDATE_NPCS, npcData as Record<string, unknown>);
    };

    // 4. Tactical Phase Rotations
    const handleTurnStart = (data: unknown) => {
      const store = useGameStore.getState();
      const payload = data as { turnOwnerId?: string; turn: number; isMyTurn?: boolean };
      const currentMyId = store.myId;
      const isMe = payload.isMyTurn !== undefined ? payload.isMyTurn : payload.turnOwnerId === currentMyId;
      
      console.log(`[TURN_START] turn=${payload.turn} isMyTurn=${isMe} turnOwnerId=${payload.turnOwnerId} mySocketId=${socket.id}`);
      
      store.setStatus({ isMyTurn: isMe, turn: payload.turn, isSubmitted: false });
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { turn: payload.turn, isMyTurn: isMe });
      
      store.updateSelectedDistrict(null);
    };

    // 5. Combat Engagement Resolution Logs
    const handleBattleResult = (result: unknown) => {
      emitToPhaser(REACT_TO_PHASER.BATTLE_EFFECT, result as Record<string, unknown>);
      useGameStore.getState().updateSelectedDistrict(null);
    };

    // 6. Network Grid Dominance Updates
    const handleTerritoryUpdated = (data: unknown) => {
      const store = useGameStore.getState();
      const playersMap: Record<string, unknown> = {};
      store.players.forEach((p) => {
        if (p.id) playersMap[p.id] = p;
      });
      emitToPhaser(REACT_TO_PHASER.TERRITORY_EFFECT, {
        ...(data as Record<string, unknown>),
        players: playersMap,
      });
      useGameStore.getState().updateSelectedDistrict(null);
    };

    // 7. Core Command Execution Rejections
    const handleActionRejected = (data: { reason: string }) => {
      const store = useGameStore.getState();
      store.setErrorMessage(data.reason); 
      store.addLog(`⚠️ Command Rejected: ${data.reason}`);
      useGameStore.getState().updateSelectedDistrict(null);
    };

    // 8. Operation Termination Matrix
    const handleGameOver = (data: unknown) => {
      const store = useGameStore.getState();
      // 🚀 修正: payload にサーバー計算済みの score を期待
      const payload = data as { winnerName: string; winnerId: string; score?: number };
      
      // ストアのゲームオーバー状態を確定
      store.setStatus({ isGameOver: true, winnerId: payload.winnerId });
      
      // 🚀 修正: サーバーから届いた確定スコアをセット（なければ null のまま）
      if (typeof payload.score === 'number') {
        store.setFinalScore(payload.score);
      }
      
      const isWinner = store.myId === payload.winnerId;
      playBGM(isWinner ? 'winner' : 'loser');
      
      setTimeout(() => {
        useGameStore.getState().setStatus({ view: 'ranking' });
      }, 1500);

      emitToPhaser(REACT_TO_PHASER.GAME_OVER_EFFECT, {
        ...payload,
        isWinner: isWinner,
      });
      
      store.updateSelectedDistrict(null);
    };

    // 9. Incoming Comms Feed Infiltration (Tactical Chat Streams)
    const handleReceiveChat = (data: { username: string; message: string }) => {
      useGameStore.getState().addLog({ sender: data.username || 'Operator', message: data.message });
    };

    const handleActionResult = () => {
      useGameStore.setState({ isSubmitted: true });
      useGameStore.getState().updateSelectedDistrict(null);
    };

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
    socket.on(SERVER_EVENTS.ACTION_RESULT, handleActionResult); 

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
      socket.off(SERVER_EVENTS.ACTION_RESULT, handleActionResult);
      socket.off('connect', handleConnect);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);
    };
  }, []); 
};

export default useGameEvents;