import React from 'react';
import { useGameStore } from '../store';

export const ResultView: React.FC = () => {
  const { isGameOver, resultData, activeBuffs, resetGame, myId } = useGameStore();

  if (!isGameOver || !resultData) return null;

  const isWin = resultData.winnerName === useGameStore.getState().playerName;

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <h1 style={{ color: isWin ? '#f1c40f' : '#e74c3c', fontSize: '48px', margin: '0' }}>
          {isWin ? '🏆 MISSION COMPLETE' : '🚨 MISSION FAILED'}
        </h1>
        
        <div style={resultBoxStyle}>
          <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>GAME RESULT</h2>
          
          {/* 1. 勝者のプレイヤー名 */}
          <p style={dataLine}>WINNER: <span style={highlightText}>{resultData.winnerName}</span></p>
          
          {/* 2. 全プレイヤーの最終占有地区数と占有率 */}
          <div style={{ margin: '20px 0' }}>
            <p style={{ fontSize: '14px', marginBottom: '5px' }}>TERRITORY CONTROL</p>
            {Object.entries(resultData.scores).map(([name, score]) => (
              <div key={name} style={progressWrapper}>
                <span style={{ width: '80px' }}>{name}</span>
                <div style={progressBarBg}>
                  <div style={{ ...progressBarFill, width: `${(score / 11) * 100}%` }} />
                </div>
                <span style={{ width: '60px', textAlign: 'right' }}>{score} / 11</span>
              </div>
            ))}
          </div>

          {/* 3. 自分が獲得した特産品バフの一覧 */}
          <div style={{ textAlign: 'left', marginTop: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>ACQUIRED BUFFS:</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {activeBuffs.length > 0 ? activeBuffs.map(buff => (
                <span key={buff.id} style={buffTagStyle}>🍖 {buff.name}</span>
              )) : <span style={{ color: '#999' }}>None</span>}
            </div>
          </div>
        </div>

        {/* 4. 「もう一度プレイ」ボタン */}
        <button onClick={resetGame} style={retryButtonStyle}>PLAY AGAIN</button>
      </div>
    </div>
  );
};

// --- スタイル設定 ---
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000, color: '#fff' };
const containerStyle: React.CSSProperties = { textAlign: 'center', width: '450px', background: '#fff', color: '#333', padding: '40px', borderRadius: '20px' };
const resultBoxStyle: React.CSSProperties = { margin: '30px 0', padding: '20px', background: '#f8f9fa', borderRadius: '15px' };
const dataLine: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' };
const highlightText: React.CSSProperties = { color: '#2980b9' };
const progressWrapper: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', marginBottom: '8px' };
const progressBarBg: React.CSSProperties = { flex: 1, height: '10px', background: '#eee', borderRadius: '5px', overflow: 'hidden' };
const progressBarFill: React.CSSProperties = { height: '100%', background: '#3498db' };
const buffTagStyle: React.CSSProperties = { background: '#e1f5fe', color: '#0288d1', padding: '4px 8px', borderRadius: '5px', fontSize: '12px' };
const retryButtonStyle: React.CSSProperties = { padding: '15px 40px', background: '#2c3e50', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' };