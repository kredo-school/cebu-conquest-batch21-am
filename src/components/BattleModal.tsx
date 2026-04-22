import React from 'react';
import { useGameStore } from '../store';

export const BattleModal: React.FC = () => {
  const { 
    predictionModalOpen, 
    targetDistrictInfo, 
    atk, blessing, attack, closePrediction, stamina 
  } = useGameStore();

  if (!predictionModalOpen || !targetDistrictInfo) return null;

  // 🚀 計算ロジック
  const finalAtk = atk * blessing;
  const enemyDef = targetDistrictInfo.enemyDef || 40;
  const winRate = (finalAtk / (finalAtk + enemyDef)) * 100;

  // 🚀 サーバーのAP消費量(5)に合わせて判定を修正
  const AP_COST = 5;
  const canAttack = stamina >= AP_COST;

  const getBtnStyle = (bg: string, canClick: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '14px',
    background: canClick ? bg : '#7f8c8d',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: canClick ? 'pointer' : 'not-allowed',
    fontWeight: 'bold',
    fontSize: '16px',
    boxShadow: canClick ? '0 4px 0 rgba(0,0,0,0.2)' : 'none',
    transition: '0.2s all',
    opacity: canClick ? 1 : 0.7
  });

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
          {/* 🚀 APコストを 5 に修正 */}
          <button 
            onClick={() => attack(targetDistrictInfo.id)} 
            disabled={!canAttack}
            style={getBtnStyle('#e74c3c', canAttack)}
          >
            {canAttack ? `🔥 攻撃開始 (-${AP_COST})` : 'AP不足'}
          </button>
          
          <button onClick={closePrediction} style={getBtnStyle('#95a5a6', true)}>
            やめる
          </button>
        </div>
      </div>
    </div>
  );
};

// スタイル定義（確実に最前面に出るよう zIndex を調整）
const overlayStyle: React.CSSProperties = { 
  position: 'fixed', 
  top: 0, 
  left: 0, 
  width: '100vw', 
  height: '100vh', 
  background: 'rgba(0,0,0,0.85)', 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  zIndex: 10001 // PhaserGame(1000)やHUD(1000)より高く設定
};

const modalStyle: React.CSSProperties = { 
  background: '#fff', 
  padding: '30px', 
  borderRadius: '25px', 
  border: '6px solid #2c3e50', 
  width: '340px', 
  textAlign: 'center', 
  boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
  pointerEvents: 'auto' 
};

const infoBoxStyle: React.CSSProperties = { 
  background: '#f8f9fa', 
  padding: '15px', 
  borderRadius: '12px', 
  textAlign: 'left', 
  margin: '15px 0', 
  fontSize: '14px', 
  border: '1px solid #ddd' 
};

const resultStyle: React.CSSProperties = { 
  margin: '20px 0', 
  padding: '15px', 
  border: '2px solid #e74c3c', 
  borderRadius: '18px', 
  background: '#fff5f5' 
};