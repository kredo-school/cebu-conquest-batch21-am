import React from 'react';
import { useGameStore } from '../store';
import socket from '../socket'; 
import { REACT_TO_PHASER } from '../game/events/PhaserBridge'; 
import { BuffCards } from './BuffCards'; 

export const Sidebar: React.FC = () => {
  // 🚀 修正：'store' 変数を作らず、必要な値だけを直接取り出す（エラー回避）
  const { 
    hp, stamina, blessing, turn, logs, 
    attack, defense, stay, escape,
    selectedDistrictId, playerName,
    isMyTurn, isSubmitted,
    selectedGodId, godsList 
  } = useGameStore();

  const selectedGod = godsList.find(g => g.id === selectedGodId);

  // 🚀 ボタンの有効/無効判定 (資料 No.38 要件：自分のターンかつ未提出、かつ出撃後)
  const isCommandDisabled = !isMyTurn || isSubmitted || turn === 0;

  const sectionStyle: React.CSSProperties = {
    background: '#fff', border: '2px solid #000', borderRadius: '10px',
    marginBottom: '5px', padding: '5px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px'
  };

  const buttonStyle = (disabled: boolean, bgColor: string): React.CSSProperties => ({
    borderRadius: '8px', border: '2px solid #000', fontWeight: 'bold', 
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '10px 5px', background: disabled ? '#bdc3c7' : bgColor, 
    color: disabled ? '#7f8c8d' : '#fff', fontSize: '11px', transition: 'all 0.2s',
    opacity: disabled ? 0.7 : 1,
    boxShadow: disabled ? 'none' : '0 3px 0 #000'
  });

  /**
   * 🧘 各コマンドのハンドラ
   * Store側でCustomEventの送信ロジックを共通化しているため、ここではStoreのアクションを呼ぶだけでOKです
   */
  const handleAttack = () => {
    if (!selectedDistrictId) return;
    attack(selectedDistrictId);
  };

  const handleDefense = () => defense();
  const handleStay = () => stay();
  const handleEscape = () => escape();

  return (
    <div style={{ background: '#6294e4', width: '380px', height: '100vh', borderLeft: '4px solid #000', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box' }}>
      
      {/* 🚀 ヘッダー：守護神とDay表示 (資料 No.37) */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <div style={{ ...sectionStyle, flex: 2, background: '#2c3e50', color: '#fff' }}>
          {selectedGod ? `🙏 ${selectedGod.name}` : "守護神未選択"}
        </div>
        <div style={{ ...sectionStyle, flex: 1, background: isMyTurn ? '#2980b9' : '#c0392b', color: '#fff' }}>
          {turn === 0 ? "Standby" : `Day ${turn}`}
        </div>
      </div>

      {/* 🚀 メインコンテンツ：2カラムレイアウト (資料 No.38案：左に情報、右に操作) */}
      <div style={{ display: 'flex', flex: 1, gap: '10px', overflow: 'hidden' }}>
        
        {/* 左カラム：ステータス ＆ ログ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ ...sectionStyle, background: '#ffadad', color: '#900' }}>❤️ HP: {hp}</div>
          <div style={{ ...sectionStyle, background: '#92d050' }}>🔋 AP: {stamina}</div>
          <div style={{ ...sectionStyle, background: '#ffe699' }}>✨ Blessing: {blessing.toFixed(1)}</div>
          
          <div style={{ ...sectionStyle, flex: 1, textAlign: 'left', fontSize: '10px', overflowY: 'auto', background: '#f8f9fa', padding: '5px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ borderBottom: '1px solid #eee', padding: '2px 0', color: i === 0 ? '#000' : '#7f8c8d', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* 右カラム：コマンドボタン ＆ バフカード */}
        <div style={{ width: '130px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>COMMANDS</div>
          
          <button onClick={handleAttack} disabled={isCommandDisabled || !selectedDistrictId} style={buttonStyle(isCommandDisabled || !selectedDistrictId, '#c0392b')}>
            ⚔️ Attack
          </button>
          
          <button onClick={handleDefense} disabled={isCommandDisabled} style={buttonStyle(isCommandDisabled, '#34495e')}>
            🛡️ Defense
          </button>
          
          <button onClick={handleStay} disabled={isCommandDisabled} style={buttonStyle(isCommandDisabled, '#27ae60')}>
            🧘 Stay
          </button>
          
          <button onClick={handleEscape} disabled={isCommandDisabled} style={buttonStyle(isCommandDisabled, '#d35400')}>
            🏃 Escape
          </button>

          <div style={{ marginTop: '10px', fontSize: '10px', fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>ACTIVE BUFFS</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <BuffCards />
          </div>
        </div>
      </div>

      {/* 下部：ミッション開始ボタン (turn 0 の時のみ表示) */}
      {turn === 0 && (
        <button 
          onClick={() => {
            if (!selectedDistrictId) return;
            // Phaserへ出撃地点を通知
            window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { detail: { districtId: selectedDistrictId } }));
            // サーバーへ準備完了を通知
            socket.emit("READY_TO_START", { username: playerName, startDistrictId: selectedDistrictId });
          }}
          style={{ 
            marginTop: '10px', padding: '15px', background: '#f1c40f', color: '#000', 
            fontWeight: 'bold', borderRadius: '10px', border: '2px solid #fff', cursor: 'pointer', 
            fontSize: '16px', boxShadow: '0 4px 0 #b7950b'
          }}
        >
          🚀 START MISSION
        </button>
      )}
    </div>
  );
};