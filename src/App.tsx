import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { HUD } from './components/HUD'; // 3. HUDコンポーネントを追加
import { GameContainer } from './components/GameContainer'; // 4. 先ほど作ったコンポーネント
import { useGameStore } from './store';
import TitleScreen from './components/TitleScreen';

const App: React.FC = () => {
  const { hp } = useGameStore();

  // 🚩 画面の状態管理
  const [view, setView] = useState<'title' | 'login' | 'game'>('title');

  // --- タイトル画面 ---
  if (view === 'title') {
    return <TitleScreen onStart={() => setView('login')} />;
  }

  // --- ログイン画面 (なおさんのAPI連携待ち) ---
  if (view === 'login') {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', 
        background: '#1e293b', color: 'white' 
      }}>
        <h1 style={{ fontSize: '40px' }}>LOGIN</h1>
        <p>ここに、なおさんの /api/login と連携するフォームを実装します</p>
        <button 
          onClick={() => setView('game')} 
          style={{ marginTop: '20px', padding: '15px 30px', fontSize: '20px', cursor: 'pointer' }}
        >
          Login (デバッグ用)
        </button>
      </div>
    );
  }

  // --- ゲーム本編 (view === 'game') ---
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {/*  マップエリア（あきらさんのPhaserをマウント） [cite: 98] */}
      <div style={{ flex: 1, background: '#0a0e0d' }}>
        <GameContainer />
      </div>

      {/*  サイドパネル：詳細情報など */}
      <Sidebar />

      {/* ゲームオーバー画面 */}
      {hp <= 0 && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(223, 22, 22, 0.9)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <h1 style={{ color: 'white', fontSize: '80px' }}>GAME OVER</h1>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', fontSize: '20px' }}>Try Again</button>
        </div>
      )}
    </div>
  );
};

export default App;