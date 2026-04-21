import React from 'react';
import { useGameStore } from '../store';

export const BuffCards: React.FC = () => {
  const { activeBuffs } = useGameStore();

  // 🚀 バフがない時は「NO DATA」と表示するか、あるいは何も出さない
  if (activeBuffs.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', textAlign: 'center', marginTop: '20px' }}>
        - NO SPECIALTY DATA -
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {activeBuffs.map((buff) => (
        <div key={buff.id} style={cardStyle}>
          <div style={labelStyle}>SPECIALTY CHIP</div>
          <div style={nameStyle}>{buff.name}</div>
          <div style={effectStyle}>▶ {buff.effect}</div>
          
          {/* 🚀 装飾用のバー（ミリタリー感を演出） */}
          <div style={{ height: '2px', background: '#f1c40f', width: '30%', marginTop: '5px' }} />
        </div>
      ))}
    </div>
  );
};

// --- 🎨 デザイン：タクティカル・データチップ風 ---
const containerStyle: React.CSSProperties = {
  display: 'flex', 
  flexDirection: 'column', // Sidebar内なので縦に並べる
  gap: '8px', 
  marginTop: '10px',
  width: '100%'
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.8)',
  color: 'white', 
  padding: '8px 12px', 
  borderRadius: '4px',
  borderLeft: '4px solid #f1c40f', // 左側にアクセントライン
  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  textAlign: 'left',
  position: 'relative',
  overflow: 'hidden',
  animation: 'fadeIn 0.3s ease-out'
};

const labelStyle: React.CSSProperties = { 
  fontSize: '8px', 
  color: '#f1c40f', 
  letterSpacing: '1px',
  opacity: 0.8 
};

const nameStyle: React.CSSProperties = { 
  fontSize: '12px', 
  fontWeight: 'bold', 
  margin: '2px 0',
  color: '#fff'
};

const effectStyle: React.CSSProperties = { 
  fontSize: '11px', 
  color: '#2ecc71', // 効果はポジティブな緑
  fontWeight: 'bold',
  textShadow: '0 0 5px rgba(46, 204, 113, 0.3)'
};