import React from 'react';
import { useGameStore } from '../store';

export const GameOverView: React.FC = () => {
  // 🚀 Storeからサーバー確定の勝敗データを取得
  const { isGameOver, resultData, myId, resetGame } = useGameStore();

  if (!isGameOver || !resultData) return null;

  // --- ⚔️ 勝敗判定ロジック ---
  // resultData.winnerName または winnerId を使用して判定
  const isWin = resultData.winnerName === useGameStore.getState().playerName || 
                Object.keys(resultData.scores).find(id => id === myId && resultData.winnerName === "YOU");
  
  // 自分のスコアと敵のスコアを抽出
  const myScore = resultData.scores[myId] || 0;
  const enemyScore = Object.entries(resultData.scores)
    .filter(([id]) => id !== myId)
    .reduce((sum, [_, score]) => sum + (score as number), 0);

  // 結果に応じたスタイル設定 (タクティカルなダークテーマを維持)
  const themeColor = isWin ? '#f1c40f' : '#e74c3c'; // 勝てば金、負ければ警告赤
  const bgColor = '#0f172a'; // 常に宇宙（紺）ベースで没入感を出す
  const textColor = '#ffffff';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: bgColor,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 20000, // 全てのUI（モーダル含む）の最前面へ
      animation: 'fadeIn 1s ease-in-out',
      color: textColor,
      textAlign: 'center',
      fontFamily: 'Orbitron, sans-serif',
      backgroundImage: `radial-gradient(circle at center, ${themeColor}22 0%, ${bgColor} 70%)`
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
      `}</style>

      {/* 🚀 スキャンライン演出（TVノイズ風） */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%', pointerEvents: 'none' }} />

      <h1 style={{ 
        color: themeColor, 
        fontSize: '72px', 
        fontWeight: '900', 
        marginBottom: '10px',
        letterSpacing: '8px',
        textShadow: `0 0 20px ${themeColor}`
      }}>
        {isWin ? '🏆 MISSION COMPLETE' : '🚨 MISSION FAILED'}
      </h1>
      
      <p style={{ fontSize: '24px', marginBottom: '30px', opacity: 0.8 }}>
        {isWin ? 'セブ島の制圧に成功。全エリアを支配下に置きました。' : '作戦失敗。コマンダーは直ちに撤退してください。'}
      </p>

      {/* 📊 戦績スコア ＆ MVP表示 */}
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '30px 60px', 
        borderRadius: '20px', 
        border: `1px solid ${themeColor}55`,
        marginBottom: '40px',
        boxShadow: `0 0 30px ${themeColor}22`
      }}>
        <div style={{ fontSize: '14px', color: themeColor, marginBottom: '10px', letterSpacing: '2px' }}>FINAL DOMINATION</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '15px' }}>
          {myScore} <span style={{ fontSize: '24px', opacity: 0.5 }}>VS</span> {enemyScore}
        </div>
        
        {/* 🚀 MVPの表示（盛り上がりポイント！） */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
          <span style={{ fontSize: '14px', opacity: 0.6 }}>BATTLE MVP: </span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1c40f' }}>
            {resultData.mvp || "Calculating..."}
          </span>
        </div>
      </div>

      <button 
        onClick={() => resetGame()} 
        style={{
          padding: '18px 60px',
          fontSize: '20px',
          background: themeColor,
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: `0 0 20px ${themeColor}66`,
          transition: '0.3s',
          letterSpacing: '2px'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        RE-DEPLOY (再出撃)
      </button>

      <div style={{ marginTop: '30px', fontSize: '12px', opacity: 0.4 }}>
        CEBU CONQUEST PROTOCOL v1.0 - DISCONNECTED
      </div>
    </div>
  );
};