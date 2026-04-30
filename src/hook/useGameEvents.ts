// src/hook/useGameEvents.ts
import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; //
import { useGameStore } from '../store';
import { emitToPhaser, PHASER_TO_REACT } from '../game/events/PhaserBridge'; //

export const useGameEvents = () => {
  const { 
    syncServerState, 
    setNpcs, 
    addLog, 
    myId,
    setStatus 
  } = useGameStore();

  useEffect(() => {
    if (!socket) return;

    // 1. サーバー全体のステート同期 (SYNC_STATE)
    socket.on(SERVER_EVENTS.SYNC_STATE, (data) => {
      syncServerState(data, myId);
    });

    // 2. 🚀 NPC情報の更新受信 (NPC_UPDATE)
    socket.on(SERVER_EVENTS.NPC_UPDATE, (npcData) => {
      setNpcs(npcData);
      emitToPhaser('react:updateNpcs', npcData);
    });

    // 3. ターン開始通知 (TURN_START)
    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      setStatus({ 
        isMyTurn: data.turnOwnerId === myId,
        turn: data.turn 
      });
      addLog(`📢 ターン ${data.turn} 開始！ ${data.turnOwnerId === myId ? 'あなたの番です' : '相手の番です'}`);
      
      emitToPhaser(PHASER_TO_REACT.TURN_START, { 
        turn: data.turn, 
        isMyTurn: data.turnOwnerId === myId 
      });
    });

    // 4. 戦闘結果の受信 (BATTLE_RESULT)
    socket.on(SERVER_EVENTS.BATTLE_RESULT, (result) => {
      addLog(`⚔️ バトル結果: ${result.winnerId === myId ? '勝利！' : '敗北...'}`);
      emitToPhaser(PHASER_TO_REACT.BATTLE_RESULT, result);
    });

    // 5. 領土更新通知 (TERRITORY_UPDATED)
    socket.on(SERVER_EVENTS.TERRITORY_UPDATED, (data) => {
      addLog(`🚩 地区 ${data.districtId} が ${data.ownerName} に占領されました`);
    });

    // クリーンアップ
    return () => {
      socket.off(SERVER_EVENTS.SYNC_STATE);
      socket.off(SERVER_EVENTS.NPC_UPDATE);
      socket.off(SERVER_EVENTS.TURN_START);
      socket.off(SERVER_EVENTS.BATTLE_RESULT);
      socket.off(SERVER_EVENTS.TERRITORY_UPDATED);
    };
  }, [myId, syncServerState, setNpcs, addLog, setStatus]);
};