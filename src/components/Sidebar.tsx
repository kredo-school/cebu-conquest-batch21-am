import React from 'react';
import { useGameStore } from '../store';
import socket from '../socket'; 
import { REACT_TO_PHASER } from '../game/events/PhaserBridge'; 

export const Sidebar: React.FC = () => {
  const { 
    hp, stamina, blessing, turn, logs, 
    nextTurn, addLog, 
    defense, stay, escape,
    selectedDistrictId, playerName,
    isMyTurn, isSubmitted, turnOwner // 🚀 ターン管理用の状態を追加
  } = useGameStore();

  // 🚀 ボタンの有効/無効判定 (資料 No.83-85 要件)
  // 1. 自分のターンではない
  // 2. 既に行動を提出済み (isSubmitted)
  // 3. 出撃前 (turn === 0) は戦略コマンド不可
  const isCommandDisabled = !isMyTurn || isSubmitted || turn === 0;

  const sectionStyle: React.CSSProperties = {
    background: '#fff', border: '3px solid #000', borderRadius: '15px',
    marginBottom: '8px', padding: '8px', textAlign: 'center', fontWeight: 'bold',
  };

  const buttonStyle = (disabled: boolean): React.CSSProperties => ({
    borderRadius: '10px', border: '2px solid #000', fontWeight: 'bold', 
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '8px', background: disabled ? '#bdc3c7' : '#ecf0f1', 
    fontSize: '12px', transition: 'all 0.2s',
    opacity: disabled ? 0.6 : 1,
  });

  /**
   * 🚀 出撃 / ターン終了ボタンのハンドラ
   */
  const handleMainAction = () => {
    if (turn === 0) {
      if (!selectedDistrictId) {
        addLog("⚠️ 出撃地点を地図から選んでください！");
        return;
      }

      // Phaserへ出撃確定を通知
      window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, {
        detail: { districtId: selectedDistrictId }
      }));

      // サーバーへ出撃を通知
      socket.emit("READY_TO_START", { 
        username: playerName || "Guest", 
        startDistrictId: selectedDistrictId 
      });

      addLog(`🚀 地区 ${selectedDistrictId} から出撃！`);
      // サーバーからの turnStart イベントを待つため、ここでは nextTurn() は呼ばず同期を待つ設計が理想
    } else {
      // 自分のターンでまだ何もしてない場合、パス（Stay）として送信
      if (isMyTurn && !isSubmitted) {
        handleStay();
      }
    }
  };

  /**
   * 🧘 各コマンドのハンドラ（Phaser通知 + サーバー送信）
   */
  const handleDefense = () => {
    defense(); // Store更新
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEFEND)); 
  };

  const handleStay = () => {
    stay(); // Store更新
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_STAY)); 
  };

  const handleEscape = () => {
    escape(); // Store更新
    window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_ESCAPE));
  };

  return (
    <div style={{ background: '#6294e4', width: '320px', height: '100vh', borderLeft: '4px solid #000', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box' }}>
      
      {/* ヘッダー：Day / ターン所有者表示 */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
        <div style={{ ...sectionStyle, flex: 2, marginBottom: 0 }}>🇵🇭 Cebu Conquest</div>
        <div style={{ 
          ...sectionStyle, 
          flex: 1.5, 
          background: !isMyTurn ? '#c0392b' : (turn === 0 ? '#7f8c8d' : '#2980b9'), 
          color: '#fff', 
          marginBottom: 0,
          fontSize: '12px'
        }}>
          {turn === 0 ? "Standby" : `Day ${turn} [${isMyTurn ? "YOU" : "ENEMY"}]`}
        </div>
      </div>

      {/* ステータスパネル */}
      <div style={{ ...sectionStyle, background: '#ffadad', color: '#900' }}>❤️ HP: {hp}</div>
      <div style={{ ...sectionStyle, background: '#92d050' }}>🔋 AP: {stamina}</div>
      <div style={{ ...sectionStyle, background: '#ffe699' }}>✨ Blessing: {blessing.toFixed(1)}</div>

      {/* ログエリア */}
      <div style={{ ...sectionStyle, flex: 1, textAlign: 'left', fontSize: '11px', overflowY: 'auto', background: '#f8f9fa' }}>
        <div style={{ padding: '5px' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ borderBottom: '1px solid #eee', padding: '4px 2px', color: i === 0 ? '#000' : '#7f8c8d', fontWeight: i === 0 ? 'bold' : 'normal' }}>
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* 🚀 戦略アクションボタン (Week 3 拡張) */}
      <div style={{ marginBottom: '5px', fontSize: '10px', fontWeight: 'bold', color: '#fff' }}>
        COMMAND MENU {isSubmitted && " - SUBMITTED"}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginBottom: '10px' }}>
        <button 
          onClick={handleDefense} 
          disabled={isCommandDisabled}
          style={{ ...buttonStyle(isCommandDisabled), background: '#34495e', color: 'white' }}
        >
          Defense
        </button>
        <button 
          onClick={handleStay} 
          disabled={isCommandDisabled}
          style={{ ...buttonStyle(isCommandDisabled), background: '#27ae60', color: 'white' }}
        >
          Stay
        </button>
        <button 
          onClick={handleEscape} 
          disabled={isCommandDisabled}
          style={{ ...buttonStyle(isCommandDisabled), background: '#d35400', color: 'white' }}
        >
          Escape
        </button>
      </div>

      {/* メインアクション */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button 
          onClick={handleMainAction}
          disabled={turn !== 0 && (isSubmitted || !isMyTurn)}
          style={{ 
            padding: '15px', 
            background: turn === 0 ? '#f1c40f' : (isCommandDisabled ? '#7f8c8d' : '#2c3e50'), 
            color: turn === 0 ? '#000' : '#fff', 
            fontWeight: 'bold', 
            borderRadius: '10px', 
            border: '2px solid #fff',
            cursor: (turn !== 0 && (isSubmitted || !isMyTurn)) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            boxShadow: '0 4px 0 #1a252f',
            opacity: (turn !== 0 && (isSubmitted || !isMyTurn)) ? 0.7 : 1
          }}
        >
          {turn === 0 ? "🚀 START MISSION" : (isSubmitted ? "Waiting for Server..." : "Action End")}
        </button>
      </div>
    </div>
  );
};