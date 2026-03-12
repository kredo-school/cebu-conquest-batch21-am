import React from 'react';
import { Sidebar } from './components/Sidebar';
import { useGameStore } from './store';

const App: React.FC = () => {
  const { hp } = useGameStore();

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* 左側：あきらさんのマップが入る予定の場所 */}
      <div style={{ flex: 1, background: '#0a0e0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: 'white' }}>Map Area</h1>
      </div>

      {/* 右側：いっせいさんのサイドパネル */}
      <Sidebar />

      {/* ゲームオーバー画面 */}
      {hp <= 0 && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(223, 22, 22, 0.9)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <h1 style={{ color: 'dark', fontSize: '80px' }}>GAME OVER</h1>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', fontSize: '20px' }}>Try Again</button>
        </div>
      )}
    </div>
  );
};

export default App;