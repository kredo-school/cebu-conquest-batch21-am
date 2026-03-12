import React from 'react';
import { useGameStore } from '../store';

export const HUD: React.FC = () => {
  // 1. 受け取るものを hp, blessing, stamina の3つだけに絞る
  const { hp, blessing, stamina } = useGameStore();

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%',
      height: '50px', background: 'rgba(0, 0, 0, 0.7)',
      color: 'white', display: 'flex', alignItems: 'center',
      justifyContent: 'space-around', borderBottom: '2px solid #f1c40f',
      zIndex: 100, backdropFilter: 'blur(5px)', 
    }}>
      {/* ❤️ HPを表示 */}
      <div>❤️ HP: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{hp}</span></div>
      
      {/* ✨ Blessingを表示（数字として表示するように変更） */}
      <div>✨ Blessing: <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{blessing}</span></div>
      
      {/* 🔋 Staminaを表示 */}
      <div>🔋 Stamina: <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>{stamina}</span></div>
    </div>
  );
};