import React from 'react';
import { useGameStore } from '../store';

export const ActionPanel: React.FC = () => {
  const { addStamina } = useGameStore();

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      <button 
        style={{ padding: '10px 20px', background: '#c0392b', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }} 
        onClick={() => {
          alert('Attack!!!');
          // addStamina(-20); // 🔋 攻撃するとスタミナを20消費
        }}
      >
        Attack!
      </button>

      <button 
        style={{ padding: '10px 20px', background: '#2980b9', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }} 
        onClick={() => {
          alert('Resting...');
          addStamina(30); // 🔋 休むとスタミナが30回復！
        }}
      >
        Rest & Recover
      </button>
    </div>
  );
};