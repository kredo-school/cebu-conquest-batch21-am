import React from 'react';
import { useGameStore } from '../store';

export const BuffCards: React.FC = () => {
  const { activeBuffs } = useGameStore();

  // バフがない時は何も表示しない
  if (activeBuffs.length === 0) return null;

  return (
    <div style={containerStyle}>
      {activeBuffs.map((buff) => (
        <div key={buff.id} style={cardStyle}>
          <div style={labelStyle}>SPECIALTY</div>
          <div style={nameStyle}>{buff.name}</div>
          <div style={effectStyle}>{buff.effect}</div>
        </div>
      ))}
    </div>
  );
};

// --- 🎨 デザイン（画像タスクの"カードUI"を意識） ---
const containerStyle: React.CSSProperties = {
  display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap'
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  color: 'white', padding: '10px', borderRadius: '8px',
  border: '1px solid #f1c40f', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  minWidth: '110px', textAlign: 'left'
};

const labelStyle: React.CSSProperties = { fontSize: '9px', color: '#f1c40f', letterSpacing: '1px' };
const nameStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 'bold', margin: '2px 0' };
const effectStyle: React.CSSProperties = { fontSize: '12px', color: '#2ecc71', fontWeight: 'bold' };