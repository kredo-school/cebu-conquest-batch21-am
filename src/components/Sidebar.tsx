import React from 'react';
import { useGameStore } from '../store';

export const Sidebar: React.FC = () => {
  const { hp, stamina, blessing, day, logs, nextDay, addLog, damage, saveGame, loadGame } = useGameStore();

  const buttonStyle: React.CSSProperties = {
    flex: 1, 
    borderRadius: '20px', 
    border: '2px solid #000', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    padding: '5px',
    background: '#ecf0f1'
  };

  const sectionStyle: React.CSSProperties = {
    background: '#fff',
    border: '3px solid #000',
    borderRadius: '15px',
    marginBottom: '8px',
    padding: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
  };

  return (
    <div style={{
      background: '#6294e4', width: '320px', height: '100vh',
      borderLeft: '4px solid #000', display: 'flex', flexDirection: 'column',
      padding: '10px', boxSizing: 'border-box', fontFamily: 'sans-serif'
    }}>
      {/* 日付ヘッダー */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
        <div style={{ ...sectionStyle, flex: 2, marginBottom: 0 }}>🇵🇭 Cebu</div>
        <div style={{ ...sectionStyle, flex: 1, background: '#2980b9', color: '#fff', marginBottom: 0 }}>
          {String(day).padStart(2, '0')}
          {day === 1 ? 'day' : 'days'}
        </div>
      </div>

      {/* 3. 💾 セーブ・ロード */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
        <button onClick={() => saveGame()} style={buttonStyle}>Save</button>
        <button onClick={() => loadGame()} style={buttonStyle}>Load</button>
        <button style={buttonStyle}>Pause</button>
      </div>

      {/* ステータス */}
      <div style={{ ...sectionStyle, background: '#ffadad', color: '#900' }}>
        ❤️ HP: {hp}
      </div>
      <div style={{ ...sectionStyle, background: '#92d050' }}>
        🔋 Stamina: {stamina}
      </div>
      <div style={{ ...sectionStyle, background: '#ffe699' }}>
        ✨ Blessing: {blessing}
      </div>

      {/* ログエリア */}
      <div style={{ ...sectionStyle, flex: 1, textAlign: 'left', fontSize: '13px', overflowY: 'auto' }}>
        {logs.map((log, i) => <div key={i}>・{log}</div>)}
      </div>

      {/* アクションボタン */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button 
          onClick={() => {
            damage(20);
            addLog("enemy attack 20 damage!");
          }}
          style={{ padding: '10px', background: '#c0392b', color: 'white', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer' }}
        >
          Test Attack
        </button>
        
        <button 
          onClick={() => {
            // 1. まず「今の日の終わり」をログに出す
            const currentDay = String(day).padStart(2, '0');
            addLog(`Day ${currentDay} Finish`);

            // 2. 日付を次に進める（ここで store の day が +1 される）
            nextDay();

            // 3. 進んだ後の「次の日の始まり」をログに出す
            const nextDayStr = String(day + 1).padStart(2, '0');
            addLog(`Day ${nextDayStr} Start`);
          }}
          style={{ padding: '15px', background: '#7f7f7f', color: 'white', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer' }}
        >
          Action End
        </button>
      </div>
    </div>
  );
};