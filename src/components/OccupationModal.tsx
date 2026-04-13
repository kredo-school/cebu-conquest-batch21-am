import React from 'react';
import { useGameStore } from '../store';
import socket from '../socket';

export const OccupationModal: React.FC = () => {
  const { 
    isModalOpen, targetDistrict, setModal, 
    stamina, playerName, blessing, atk, addLog, setStatus 
  } = useGameStore();

  if (!isModalOpen || !targetDistrict) return null;

  // --- ⚔️ バトル予測計算ロジック (Task No.29 要件) ---
  const finalAtk = atk * blessing; // 自分の最終ATK
  const enemyDef = 40;            // 相手の推定DEF (Week2時点のモック値)
  
  // 勝率計算式： P = A / (A + D)
  const winProbability = (finalAtk / (finalAtk + enemyDef)) * 100;

  const handleAttack = () => {
    // 1. スタミナチェック
    if (stamina < 20) {
      alert("AP（スタミナ）が足りません！");
      return;
    }

    // 2. サーバーへ攻撃アクションを送信
    socket.emit('actionSubmit', {
      type: 'attack',
      targetId: targetDistrict.id,
      username: playerName,
      finalAtk: finalAtk // 補正済みの攻撃力を送る
    });

    // 3. ローカル更新
    setStatus({ stamina: stamina - 20 });
    addLog(`⚔️ 進軍：${targetDistrict.name} へ攻撃！ (予測勝率: ${winProbability.toFixed(1)}%)`);

    // 4. モーダルを閉じる
    setModal(false);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2 style={{ color: '#e74c3c', marginTop: 0, fontSize: '24px' }}>⚔️ 占領作戦</h2>
        <h3 style={{ margin: '10px 0', color: '#333' }}>{targetDistrict.name}</h3>

        {/* 📊 バトル予測表示エリア (No.29 要件) */}
        <div style={predictionBoxStyle}>
          <div style={statLineStyle}>
            <span>自分の最終ATK:</span>
            <span style={statValueStyle}>{finalAtk.toFixed(1)}</span>
          </div>
          <div style={statLineStyle}>
            <span>相手の推定DEF:</span>
            <span style={statValueStyle}>{enemyDef}</span>
          </div>
          <div style={{ ...statLineStyle, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
            <span style={{ fontWeight: 'bold' }}>予測勝率:</span>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#2ecc71' }}>
              {winProbability.toFixed(1)}%
            </span>
          </div>
        </div>

        <p style={{ color: '#666', fontSize: '14px', margin: '15px 0' }}>
          消費AP: 20 <br />
          <span style={{ opacity: 0.8 }}>(現在保持AP: {stamina})</span>
        </p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={handleAttack} style={attackButtonStyle}>攻撃する</button>
          <button onClick={() => setModal(false)} style={cancelButtonStyle}>やめる</button>
        </div>
      </div>
    </div>
  );
};

// --- 🎨 デザイン設定 ---
const overlayStyle: React.CSSProperties = { 
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
  backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', 
  alignItems: 'center', zIndex: 3000 
};

const modalStyle: React.CSSProperties = { 
  background: '#fff', padding: '25px', borderRadius: '20px', textAlign: 'center', 
  color: '#333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', width: '320px' 
};

const predictionBoxStyle: React.CSSProperties = {
  background: '#f8f9fa', padding: '15px', borderRadius: '12px', 
  margin: '15px 0', border: '1px solid #eee'
};

const statLineStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  fontSize: '14px', margin: '4px 0'
};

const statValueStyle: React.CSSProperties = {
  fontWeight: 'bold', color: '#2c3e50'
};

const attackButtonStyle: React.CSSProperties = { 
  padding: '12px 24px', background: '#e74c3c', color: '#fff', border: 'none', 
  borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px'
};

const cancelButtonStyle: React.CSSProperties = { 
  padding: '12px 24px', background: '#bdc3c7', color: '#fff', border: 'none', 
  borderRadius: '10px', cursor: 'pointer', fontSize: '16px' 
};