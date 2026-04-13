import React from 'react';
import { useGameStore } from '../store';

export const GameOverView: React.FC = () => {
  // 🔴 判定に必要な情報を Store からすべて取得
  const { isGameOver, districts, myId, hp, resetGame } = useGameStore();

  if (!isGameOver) return null;

  // --- ⚔️ 勝敗判定ロジック ---
  const myCores = Object.values(districts).filter(ownerId => ownerId === myId).length;
  const totalOccupied = Object.values(districts).filter(ownerId => ownerId !== null).length;
  const enemyCores = totalOccupied - myCores;

  // 敗北条件：HPが0、または地区数が敵より少ない
  const isDeath = hp <= 0;
  const isWin = !isDeath && myCores > enemyCores;

  // 結果に応じたスタイル設定
  const themeColor = isWin ? '#f1c40f' : '#ff0000'; // 勝てば金、負ければ赤
  const bgColor = isWin ? '#0f172a' : '#ffffff';  // 勝てば宇宙（紺）、負ければ白
  const textColor = isWin ? '#ffffff' : '#000000';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: bgColor,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 1.5s ease-in-out',
      color: textColor,
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <h1 style={{ color: themeColor, fontSize: '64px', fontWeight: 'bold', marginBottom: '10px' }}>
        {isWin ? '🏆 MISSION COMPLETE' : '🚨 MISSION FAILED'}
      </h1>
      
      <p style={{ fontSize: '24px', marginBottom: '20px' }}>
        {isDeath ? 'コマンダーの生命反応が消失。' : `作戦終了。領地の確保を完了。`}
      </p>

      {/* 📊 戦績スコアの表示 */}
      <div style={{ 
        background: isWin ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
        padding: '20px 40px', borderRadius: '15px', marginBottom: '40px' 
      }}>
        <div style={{ fontSize: '18px', opacity: 0.8 }}>FINAL SCORE</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
          YOU: {myCores} <span style={{ color: themeColor }}>VS</span> ENEMY: {enemyCores}
        </div>
      </div>

      <button 
        onClick={() => {
          resetGame(); // Storeをリセット
          window.location.reload(); // ページをリロードしてPhaserも初期化
        }}
        style={{
          padding: '15px 50px',
          fontSize: '20px',
          background: themeColor,
          color: isWin ? '#000' : '#fff',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s'
        }}
      >
        RE-DEPLOY (再起動)
      </button>
    </div>
  );
};