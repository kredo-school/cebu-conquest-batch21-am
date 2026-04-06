import React from 'react';
import { useGameStore } from '../store';

export const ActionPanel: React.FC = () => {
  const { isSubmitted, isMyTurn, stay, defense, escape } = useGameStore();

  if (!isMyTurn || isSubmitted) {
    return <div style={{ color: '#aaa', textAlign: 'center' }}>相手のターン、または処理待ちです...</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '10px' }}>
      <button onClick={stay} style={btnStyle('#27ae60')}>Stay</button>
      <button onClick={defense} style={btnStyle('#2980b9')}>Defense</button>
      <button onClick={escape} style={btnStyle('#7f8c8d')}>Escape</button>
    </div>
  );
};

const btnStyle = (bg: string) => ({
  padding: '10px 20px', background: bg, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' as const
});