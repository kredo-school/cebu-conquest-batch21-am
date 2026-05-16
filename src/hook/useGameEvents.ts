/// <reference types="vite/client" />
import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; 
import { useGameStore, Player } from '../store'; 
import { emitToPhaser, REACT_TO_PHASER, PHASER_TO_REACT } from '../game/events/PhaserBridge'; 

// 🚀 サーバーから受信するプレイヤー情報の詳細定義
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

// 🚀 サーバーから受信する全体同期データの構造定義
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

// 🚀 ReactからPhaserへ渡す地区情報の型定義 (TSエラー回避用)
interface DistrictPayload {
  districtId: number;
  districtName: string;
  isMyTerritory: boolean;
  isNeutral: boolean;
  spotId?: number;
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

    // 0. 🔌 接続時同期
    const handleConnect = () => {
      setStatus({ myId: socket.id });
      const { roomId, playerName } = useGameStore.getState();
      if (roomId && typeof roomId === 'string' && roomId.length > 0 && playerName) {
        socket.emit('RECOVER_CONNECTION', { roomId, playerName });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected && !useGameStore.getState().myId) { handleConnect(); }

    // A. Phaser → React 同期
    const handleStatsUpdate = (e: Event) => {
      const ce = e as CustomEvent;
      const { hp, stamina, atk, def, faith } = ce.detail;
      setStatus({ hp, ap: stamina, atk, def, blessing: faith });
    };

    const handleSelectDistrict = (e: Event) => {
      const ce = e as CustomEvent;
      const { districtId, districtName, isMyTerritory, isNeutral, spotId } = ce.detail;
      updateSelectedDistrict({ districtId, districtName, isMyTerritory, isNeutral, spotId });
    };

    window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);
    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);

    // B. Socket.IO サーバー → クライアント 同期

    // 1. 🛡️ サーバー全体のステート同期
    const handleSyncState = (data: unknown) => {
      const currentView = useGameStore.getState().view;
      const payload = data as SyncStatePayload; 

      // Reactのストア更新（内部で配列変換などを行う）
      syncServerState(payload as unknown as Record<string, unknown>, myId);

      // LobbyUI用の更新
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

      if (currentView === 'setup' && !payload.roomId) {
        useGameStore.setState({ view: 'setup', roomId: undefined });
      }

      // Phaser側へ通知 (playersをObjectのまま渡すことを明示)
      emitToPhaser(REACT_TO_PHASER.SYNC_MAP, {
        players: payload.players, // サーバーから届いた Object/Map 形式を維持
        districts: payload.districts,
        turn: payload.turn,
        status: payload.status || 'playing'
      });
    };

    // 2. 🎮 試合開始
    const handleGameBegin = (_data: unknown) => {
      addLog("🎮 Mission commencement authorized.");
      setGameStarted(true);
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { isFirstTurn: true });

      const state = useGameStore.getState();
      const rawPlayers = state.players; // Zustand内はArrayになっている可能性があるため
      if (rawPlayers && rawPlayers.length > 0) {
        const playersMap: Record<string, Player> = {};
        rawPlayers.forEach((p) => {
          const key = p.id;
          if (key) playersMap[key] = p;
        });
        
        // Phaserへ通知
        emitToPhaser(REACT_TO_PHASER.SYNC_MAP, {
          players: playersMap, // Phaserが処理しやすいMap形式
          districts: state.districts,
          turn: state.turn,
          status: 'playing',
        });
      }
    };

    // 3. 🤖 NPC更新
    const handleNpcUpdate = (npcData: unknown) => {
      setNpcs(npcData as Record<string, Player>);
      emitToPhaser(REACT_TO_PHASER.UPDATE_NPCS, npcData as Record<string, unknown>);
    };

    // 4. 📢 ターン開始
    const handleTurnStart = (data: unknown) => {
      const payload = data as { turnOwnerId?: string; turn: number; isMyTurn?: boolean };
      const isMe = payload.isMyTurn !== undefined ? payload.isMyTurn : payload.turnOwnerId === myId;
      setStatus({ isMyTurn: isMe, turn: payload.turn });
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { turn: payload.turn, isMyTurn: isMe });
      
      // 🚀 修正: キャストなしでそのまま null を渡す
      updateSelectedDistrict(null);
    };

    // 5. ⚔️ 戦闘結果
    const handleBattleResult = (result: unknown) => {
      emitToPhaser(REACT_TO_PHASER.BATTLE_EFFECT, result as Record<string, unknown>);

      updateSelectedDistrict(null);
    };

    // 6. 🚩 領土更新
    const handleTerritoryUpdated = (data: unknown) => {
      emitToPhaser(REACT_TO_PHASER.TERRITORY_EFFECT, data as Record<string, unknown>);

      updateSelectedDistrict(null);
    };

    // 7. 🚫 拒否
    const handleActionRejected = (data: { reason: string }) => {
      setErrorMessage(data.reason); 
      addLog(`⚠️ Command Rejected: ${data.reason}`);

      updateSelectedDistrict(null);
    };

    // 8. 🏆 終了
    const handleGameOver = (data: unknown) => {
      const payload = data as { winnerName: string; winnerId: string };
      setTimeout(() => {
        setStatus({ isGameOver: true, winnerId: payload.winnerId, view: 'ranking' });
      }, 1500);
      emitToPhaser(REACT_TO_PHASER.GAME_OVER_EFFECT, payload as unknown as Record<string, unknown>);

      updateSelectedDistrict(null);
    };

    // 9. 💬 チャット
    const handleReceiveChat = (data: { username: string; message: string }) => {
      addLog({ sender: data.username || 'Operator', message: data.message });
    };

    const handleActionResult = () => {
      updateSelectedDistrict(null);
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
    socket.on('actionResult', handleActionResult); 

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
      socket.off('actionResult', handleActionResult);
      socket.off('connect', handleConnect);
      window.removeEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdate);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, handleSelectDistrict);
    };
  }, [myId, syncServerState, setNpcs, addLog, setStatus, setErrorMessage, setLobbyPlayers, setGameStarted, updateSelectedDistrict]);
};

export default useGameEvents;