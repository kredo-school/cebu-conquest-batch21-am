import React from 'react';
import { useGameStore } from '../store';

// ✅ App.tsx での名前付きインポートに合わせて export const に統一
export const Sidebar: React.FC = () => {
  const { 
    hp, stamina, blessing, turn, logs, 
    nextTurn, damage, addLog, saveGame, loadGame, 
    defense, stay, escape 
  } = useGameStore();

  const sectionStyle: React.CSSProperties = {
    background: '#fff', border: '3px solid #000', borderRadius: '15px',
    marginBottom: '8px', padding: '8px', textAlign: 'center', fontWeight: 'bold',
  };

  const buttonStyle: React.CSSProperties = {
    borderRadius: '10px', border: '2px solid #000', fontWeight: 'bold', cursor: 'pointer',
    padding: '8px', background: '#ecf0f1', fontSize: '12px', transition: 'all 0.2s'
  };

  return (
    <div style={{ background: '#6294e4', width: '320px', height: '100vh', borderLeft: '4px solid #000', display: 'flex', flexDirection: 'column', padding: '10px', boxSizing: 'border-box' }}>
      
      {/* ヘッダー：Day表示 */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
        <div style={{ ...sectionStyle, flex: 2, marginBottom: 0 }}>🇵🇭 Cebu</div>
        
        {/* ✅ 修正：turn が 0 の時は Standby（グレー）、1以上で Day X（青）を表示 */}
        <div style={{ 
          ...sectionStyle, 
          flex: 1.5, 
          background: turn === 0 ? '#7f8c8d' : '#2980b9', 
          color: '#fff', 
          marginBottom: 0,
          fontSize: '14px'
        }}>
          {turn === 0 ? "Standby" : `Day ${turn}`}
        </div>
      </div>

      {/* システムボタン */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
        <button onClick={saveGame} style={{...buttonStyle, flex: 1}}>Save</button>
        <button onClick={loadGame} style={{...buttonStyle, flex: 1}}>Load</button>
      </div>

      {/* ステータスパネル */}
      <div style={{ ...sectionStyle, background: '#ffadad', color: '#900' }}>❤️ HP: {hp}</div>
      <div style={{ ...sectionStyle, background: '#92d050' }}>🔋 Stamina: {stamina}</div>
      <div style={{ ...sectionStyle, background: '#ffe699' }}>✨ Blessing: {blessing.toFixed(1)}</div>

      {/* ログエリア */}
      <div style={{ 
        ...sectionStyle, 
        flex: 1, 
        textAlign: 'left', 
        fontSize: '12px', 
        overflowY: 'auto', 
        background: '#f8f9fa' 
      }}>
        <div style={{ padding: '5px' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ borderBottom: '1px solid #eee', padding: '4px 2px', color: '#333' }}>
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* 戦略アクションボタン */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginBottom: '10px' }}>
        <button onClick={defense} style={{ ...buttonStyle, background: '#34495e', color: 'white' }}>Defense</button>
        <button onClick={stay} style={{ ...buttonStyle, background: '#27ae60', color: 'white' }}>Stay</button>
        <button onClick={escape} style={{ ...buttonStyle, background: '#d35400', color: 'white' }}>Escape</button>
      </div>

      {/* メインアクション */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button 
          onClick={() => { damage(20); addLog("💥 敵の急襲！"); }} 
          style={{ padding: '10px', background: '#c0392b', color: 'white', fontWeight: 'bold', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
        >
          Test Attack
        </button>
        
        {/* ✅ 修正：Turn 0 は黄色の START MISSION ボタン、1以上は紺色の Action End */}
        <button 
          onClick={nextTurn}
          style={{ 
            padding: '15px', 
            background: turn === 0 ? '#f1c40f' : '#2c3e50', 
            color: turn === 0 ? '#000' : '#fff', 
            fontWeight: 'bold', 
            borderRadius: '10px', 
            border: '2px solid #fff',
            cursor: 'pointer',
            fontSize: '16px',
            boxShadow: '0 4px 0 #1a252f'
          }}
        >
          {turn === 0 ? "🚀 START MISSION" : "Action End (Next Day)"}
        </button>
      </div>
    </div>
  );
};