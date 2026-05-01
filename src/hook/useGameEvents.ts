// src/hook/useGameEvents.ts
import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; 
import { useGameStore } from '../store';
import { emitToPhaser, REACT_TO_PHASER } from '../game/events/PhaserBridge'; 

/**
 * 🛰️ useGameEvents: Socket.IO サーバーからのリアルタイム同期を管理
 * 修正内容: フロー制御を App.tsx に一任するため、ここでの setView('game') を廃止
 */
export const useGameEvents = () => {
  const { 
    syncServerState, 
    setNpcs, 
    addLog, 
    myId,
    setStatus,
    setErrorMessage
    // 🚀 setView は App.tsx の演出側で制御するため、ここでは使用しません
  } = useGameStore();

  useEffect(() => {
    if (!socket) return;

    // 1. 🛡️ サーバー全体のステート同期 (syncState)
    socket.on(SERVER_EVENTS.SYNC_STATE, (data) => {
      syncServerState(data, myId);
      
      // ✅ 修正: 強制的な setView('game') を削除。
      // これにより、再接続時などに勝手に画面が切り替わるのを防ぎます。

      // Phaser側へ同期命令
      emitToPhaser(REACT_TO_PHASER.SYNC_MAP, data);
    });

    // 2. 🎮 試合開始通知 (gameStart)
    socket.on(SERVER_EVENTS.GAME_START, () => {
      // ✅ 修正: ここでの setView('game') を削除。
      // 出撃のタイミングは App.tsx が COMMENCE_OPERATION を受信して演出後に制御します。
      addLog("🎮 サーバーが作戦開始を承認。システム同期中...");
      
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, { isFirstTurn: true });
    });

    // 3. 🤖 NPC情報の更新受信 (npcUpdate)
    socket.on(SERVER_EVENTS.NPC_UPDATE, (npcData) => {
      setNpcs(npcData);
      emitToPhaser(REACT_TO_PHASER.UPDATE_NPCS, npcData);
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
    };
  }, [myId, syncServerState, setNpcs, addLog, setStatus, setErrorMessage]);
};