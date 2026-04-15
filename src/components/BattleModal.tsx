import React from 'react';
import { useGameStore } from '../store';

export const BattleModal: React.FC = () => {
  const { 
    predictionModalOpen, 
    targetDistrictInfo, 
    atk, blessing, attack, closePrediction, stamina 
  } = useGameStore();

  if (!predictionModalOpen || !targetDistrictInfo) return null;

  const finalAtk = atk * blessing;
  const enemyDef = targetDistrictInfo.enemyDef || 40;
  const winRate = (finalAtk / (finalAtk + enemyDef)) * 100;

  // 🚀 staminaを引数として受け取るように修正してエラーを解消
  const getBtnStyle = (bg: string, canClick: boolean) => ({
    flex: 1,
    padding: '14px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: canClick ? 'pointer' : 'not-allowed',
    fontWeight: 'bold',
    fontSize: '16px',
    boxShadow: '0 4px 0 rgba(0,0,0,0.2)'
  } as React.CSSProperties);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ color: '#2c3e50', margin: '0 0 10px 0', fontSize: '22px' }}>⚔️ バトル予測</h2>
        <hr style={{ border: '0.5px solid #eee' }} />
        
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e67e22', margin: '15px 0' }}>
          対象：{targetDistrictInfo.name}
        </div>

        <div style={infoBoxStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>自分の最終ATK:</span>
            <span style={{ fontWeight: 'bold' }}>{finalAtk.toFixed(1)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>相手の推定DEF:</span>
            <span style={{ fontWeight: 'bold' }}>{enemyDef}</span>
          </div>
        </div>

        <div style={resultStyle}>
          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>予測勝率</div>
          <div style={{ fontSize: '40px', color: '#e74c3c', fontWeight: '900' }}>
            {winRate.toFixed(1)}<span style={{ fontSize: '20px' }}>%</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            onClick={() => attack(targetDistrictInfo.id)} 
            disabled={stamina < 30}
            style={getBtnStyle(stamina >= 30 ? '#e74c3c' : '#7f8c8d', stamina >= 30)}
          >
            {stamina >= 30 ? '🔥 攻撃開始 (-30)' : 'AP不足'}
          </button>
          
          <button onClick={closePrediction} style={getBtnStyle('#95a5a6', true)}>
            やめる
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 };
const modalStyle: React.CSSProperties = { background: '#fff', padding: '30px', borderRadius: '25px', border: '6px solid #2c3e50', width: '340px', textAlign: 'center', boxShadow: '0 15px 40px rgba(0,0,0,0.5)' };
const infoBoxStyle: React.CSSProperties = { background: '#f8f9fa', padding: '15px', borderRadius: '12px', textAlign: 'left', margin: '15px 0', fontSize: '14px', border: '1px solid #ddd' };
const resultStyle: React.CSSProperties = { margin: '20px 0', padding: '15px', border: '2px solid #e74c3c', borderRadius: '18px', background: '#fff5f5' };