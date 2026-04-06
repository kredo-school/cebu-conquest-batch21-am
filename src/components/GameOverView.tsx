import React from 'react';
import { useGameStore } from '../store';

// ✅ App.tsx での import { GameOverView } に合わせるため Named Export に変更
export const GameOverView: React.FC = () => {
  // Store から状態を取得
  const isGameOver = useGameStore((state) => state.isGameOver);

  // ゲームオーバーでない時は一切描画しない（これでチラつきを防止）
  if (!isGameOver) return null;

  return (
    <div style={{
      position: 'fixed', // 画面全体に固定
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#ffffff', // 純白
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999, // HUDやSidebar(1000)を完全に覆い隠す
      animation: 'fadeIn 1.5s ease-in-out'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <h1 style={{ 
        color: '#ff0000', 
        fontSize: '64px', 
        fontWeight: 'bold', 
        marginBottom: '10px',
        textAlign: 'center' 
      }}>
        MISSION FAILED
      </h1>
      
      <p style={{ 
        color: '#000', 
        fontSize: '20px', 
        marginBottom: '40px',
        textAlign: 'center' 
      }}>
        コマンダーの生命反応が消失。作戦を中断します。
      </p>

      <button 
        onClick={() => window.location.reload()} // ページをリロードして完全リセット
        style={{
          padding: '15px 40px',
          fontSize: '18px',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'transform 0.2s active'
        }}
      >
        RE-DEPLOY (再起動)
      </button>
    </div>
  );
};