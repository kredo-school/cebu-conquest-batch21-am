// src/hook/useGameEvents.ts
import { useEffect } from 'react';
import socket from '../socket';
import { SERVER_EVENTS } from '../../shared/socketEvents.js'; 
import { useGameStore } from '../store';
// ✅ REACT_TO_PHASER を追加インポート
import { emitToPhaser, REACT_TO_PHASER } from '../game/events/PhaserBridge'; 

/**
 * 🛰️ useGameEvents: Socket.IO サーバーからのリアルタイム同期を管理
 * 担当: いっせい (React + Vite + TS)
 * 仕様: GDD v3.1 準拠 / Server State 同期
 */
export const useGameEvents = () => {
  const { 
    syncServerState, 
    setNpcs, 
    addLog, 
    myId,
    setStatus,
    setErrorMessage
  } = useGameStore();

  useEffect(() => {
    if (!socket) return;

    // 1. 🛡️ サーバー全体のステート同期 (SYNC_STATE)
    socket.on(SERVER_EVENTS.SYNC_STATE, (data) => {
      syncServerState(data, myId);
      // ✅ 修正: 文字列直書き 'react:syncMap' を定数に変更
      // ※ Phaser側で全地区の所有状況やユニット位置を再描画させる
      emitToPhaser(REACT_TO_PHASER.SYNC_MAP, data);
    });

    // 2. 🤖 NPC情報の更新受信 (NPC_UPDATE)
    socket.on(SERVER_EVENTS.NPC_UPDATE, (npcData) => {
      setNpcs(npcData);
      emitToPhaser(REACT_TO_PHASER.UPDATE_NPCS, npcData);
    });

    // 3. 📢 ターン開始通知 (TURN_START)
    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      const isMe = data.turnOwnerId === myId;
      setStatus({ 
        isMyTurn: isMe,
        turn: data.turn 
      });
      addLog(`📢 Turn ${data.turn} 開始: ${isMe ? 'あなたのフェーズです' : '敵対勢力のフェーズです'}`);
      
      // ✅ 修正: 文字列直書きを定数へ。Phaser 側で "YOUR TURN" 演出を走らせる
      emitToPhaser(REACT_TO_PHASER.TURN_START_EFFECT, {
        turn: data.turn, 
        isMyTurn: isMe 
      });
    });

    // 4. ⚔️ 戦闘結果の受信 (BATTLE_RESULT)
    socket.on(SERVER_EVENTS.BATTLE_RESULT, (result) => {
      addLog(`⚔️ 記録確認: ${result.winnerId === myId ? '作戦成功（勝利）' : '作戦失敗（敗北）'}`);
      // ✅ 修正: 定数化。Phaser 側のバトルアニメーション（爆発演出など）をトリガー
      emitToPhaser(REACT_TO_PHASER.BATTLE_EFFECT, result);
    });

    // 5. 🚩 領土更新通知 (TERRITORY_UPDATED)
    // ★GDD 5-2 指定：末尾の'd'必須の定数を SERVER_EVENTS から参照
    socket.on(SERVER_EVENTS.TERRITORY_UPDATED, (data) => {
      addLog(`🚩 地区 ${data.districtId} が ${data.ownerName} により制圧されました`);
      // ✅ 追加: マップの部分更新演出（タイル色変更アニメーションなど）
      emitToPhaser(REACT_TO_PHASER.TERRITORY_EFFECT, data);
    });

    // 6. 🚫 アクション拒否通知 (ACTION_REJECTED)
    socket.on(SERVER_EVENTS.ACTION_REJECTED, (data: { reason: string }) => {
      setErrorMessage(data.reason); 
      addLog(`⚠️ 指令拒否: ${data.reason}`);
    });

    // 7. 📥 汎用アクション結果 (ACTION_RESULT)
    socket.on(SERVER_EVENTS.ACTION_RESULT, (data: { success: boolean, message: string }) => {
      if (!data.success) {
        setErrorMessage(data.message);
      }
      addLog(data.message);
    });

    // 8. 🏆 ゲーム終了通知 (GAME_OVER)
    socket.on(SERVER_EVENTS.GAME_OVER, (data) => {
      addLog(`🏁 ミッション終了。勝者: ${data.winnerName}`);
      setStatus({ isGameOver: true, winnerId: data.winnerId });
      // ✅ 修正: 定数化
      emitToPhaser(REACT_TO_PHASER.GAME_OVER_EFFECT, data);
    });

    // クリーンアップ
    return () => {
      socket.off(SERVER_EVENTS.SYNC_STATE);
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