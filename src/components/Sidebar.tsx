import React from 'react';
import { useGameStore } from '../store';
import socket from '../socket'; 
import { REACT_TO_PHASER } from '../game/events/PhaserBridge'; 
import { BuffCards } from './BuffCards'; 

export const Sidebar: React.FC = () => {
  const { 
    hp, stamina, blessing, turn, logs, 
    attack, defense, stay, escape,
    endTurn, // 🚀 Storeからターン終了関数を取得
    selectedDistrictId, playerName,
    isMyTurn, isSubmitted,
    selectedGodId, godsList 
  } = useGameStore();

  const selectedGod = godsList.find(g => g.id === selectedGodId);

  // 🚀 コンボシステムの肝：'isSubmitted'（ターン終了ボタン）を押すまでボタンは有効
  const isCommandDisabled = !isMyTurn || isSubmitted || turn === 0;

  const sectionStyle: React.CSSProperties = {
    background: '#fff', border: '2px solid #000', borderRadius: '10px',
    marginBottom: '5px', padding: '5px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px'
  };

  const buttonStyle = (disabled: boolean, bgColor: string): React.CSSProperties => ({
    borderRadius: '8px', border: '2px solid #000', fontWeight: 'bold', 
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '10px 5px', background: disabled ? '#bdc3c7' : bgColor, 
    color: disabled ? '#fff' : '#fff', fontSize: '11px', transition: 'all 0.2s',
    opacity: disabled ? 0.7 : 1,
    boxShadow: disabled ? 'none' : '0 3px 0 #000',
    width: '100%',
    marginBottom: '2px'
  });

  return (
    <div style={{ background: '#6294e4', width: '380px', height: '100vh', borderLeft: '4px solid #000', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box' }}>
      
      {/* ヘッダー：守護神 ＆ Day表示 */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        <div style={{ ...sectionStyle, flex: 2, background: '#2c3e50', color: '#fff' }}>
          {selectedGod ? `🙏 ${selectedGod.name}` : "守護神未選択"}
        </div>
        <div style={{ ...sectionStyle, flex: 1, background: isMyTurn ? '#2980b9' : '#c0392b', color: '#fff' }}>
          {turn === 0 ? "Standby" : `Day ${turn}`}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '10px', overflow: 'hidden' }}>
        
        {/* 左カラム：ステータス ＆ ログ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ ...sectionStyle, background: '#ffadad', color: '#900' }}>❤️ HP: {hp}</div>
          <div style={{ ...sectionStyle, background: stamina < 30 ? '#e74c3c' : '#92d050', color: stamina < 30 ? '#fff' : '#000' }}>
            🔋 AP: {stamina}
          </div>
          <div style={{ ...sectionStyle, background: '#ffe699' }}>✨ Blessing: {blessing.toFixed(1)}</div>
          
          <div style={{ ...sectionStyle, flex: 1, textAlign: 'left', fontSize: '10px', overflowY: 'auto', background: '#f8f9fa', padding: '5px' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ borderBottom: '1px solid #eee', padding: '2px 0', color: i === 0 ? '#000' : '#7f8c8d', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* 右カラム：コマンドボタン */}
        <div style={{ width: '130px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>COMMANDS</div>
          
          <button 
            onClick={() => selectedDistrictId && attack(selectedDistrictId)} 
            disabled={isCommandDisabled || !selectedDistrictId || stamina < 30} 
            style={buttonStyle(isCommandDisabled || !selectedDistrictId || stamina < 30, '#c0392b')}
          >
            ⚔️ Attack (30)
          </button>
          
          <button 
            onClick={() => defense()} 
            disabled={isCommandDisabled || stamina < 10} 
            style={buttonStyle(isCommandDisabled || stamina < 10, '#34495e')}
          >
            🛡️ Defense (10)
          </button>
          
          <button 
            onClick={() => stay()} 
            disabled={isCommandDisabled} 
            style={buttonStyle(isCommandDisabled, '#27ae60')}
          >
            🧘 Stay (+30)
          </button>
          
          <button 
            onClick={() => escape()} 
            disabled={isCommandDisabled} 
            style={buttonStyle(isCommandDisabled, '#d35400')}
          >
            🏃 Escape
          </button>

          {/* 🚀 ターン終了ボタン：APを使い切るか、戦略的に止めたい時に押す */}
          <div style={{ borderTop: '2px dashed rgba(255,255,255,0.5)', marginTop: '5px', paddingTop: '10px' }}>
            <button 
              onClick={() => {
                if(window.confirm("ターンを終了しますか？")) {
                  endTurn();
                }
              }} 
              disabled={!isMyTurn || isSubmitted} 
              style={buttonStyle(!isMyTurn || isSubmitted, '#f39c12')}
            >
              ⌛ END TURN
            </button>
          </div>

          <div style={{ marginTop: '10px', fontSize: '10px', fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>ACTIVE BUFFS</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <BuffCards />
          </div>
        </div>
      </div>

      {/* 下部：ミッション開始ボタン（Day 0のみ表示） */}
      {turn === 0 && (
        <button 
          onClick={() => {
            if (!selectedDistrictId) {
                alert("出撃地点を選択してください！");
                return;
            }
            // 🚀 以前の定義（101系ID）をPhaserとサーバーへ送信
            window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, { detail: { districtId: selectedDistrictId } }));
            socket.emit("READY_TO_START", { 
                username: playerName, 
                startDistrictId: selectedDistrictId,
                selectedGod: selectedGodId === 1 ? 'war' : (selectedGodId === 2 ? 'fertility' : 'guardian') 
            });
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