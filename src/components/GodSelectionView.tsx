import React from 'react';
import { useGameStore } from '../store';

export const GodSelectionView: React.FC = () => {
  const { godsList, selectGod, selectedGodId, isAuthenticated } = useGameStore();

  // ログイン済み かつ まだ神様を選んでいない時だけ表示
  if (!isAuthenticated || selectedGodId !== null) return null;

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <h1 style={titleStyle}>🙏 守護神を選択してください</h1>
        <p style={subTitleStyle}>選んだ神様によって、初期ステータスやボーナスが変化します。</p>
        
        <div style={gridStyle}>
          {godsList.map((god) => (
            <div key={god.id} style={cardStyle}>
              <div style={iconStyle}>{god.id === 1 ? '⚔️' : god.id === 2 ? '🌱' : '📖'}</div>
              <h2 style={godNameStyle}>{god.name}</h2>
              
              <div style={infoBoxStyle}>
                <div style={labelStyle}>✨ ステータスボーナス</div>
                <div style={valueStyle}>{god.bonus}</div>
              </div>

              <div style={infoBoxStyle}>
                <div style={labelStyle}>📦 初期所持アイテム</div>
                <div style={valueStyle}>{god.item}</div>
              </div>

              <button 
                onClick={() => selectGod(god.id)} 
                style={buttonStyle}
                onMouseOver={(e) => e.currentTarget.style.background = '#27ae60'}
                onMouseOut={(e) => e.currentTarget.style.background = '#2ecc71'}
              >
                この神の加護を受ける
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- スタイル定義 ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
  background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.9), rgba(52, 152, 219, 0.9))',
  display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000,
  backdropFilter: 'blur(8px)'
};

const containerStyle: React.CSSProperties = {
  background: '#fff', padding: '40px', borderRadius: '30px', textAlign: 'center',
  width: '900px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '5px solid #fff'
};

const titleStyle: React.CSSProperties = { color: '#2c3e50', fontSize: '28px', marginBottom: '10px' };
const subTitleStyle: React.CSSProperties = { color: '#7f8c8d', marginBottom: '30px' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' };

const cardStyle: React.CSSProperties = {
  background: '#f8f9fa', padding: '25px', borderRadius: '20px', border: '2px solid #eee',
  display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.2s'
};

const iconStyle: React.CSSProperties = { fontSize: '50px', marginBottom: '15px' };
const godNameStyle: React.CSSProperties = { fontSize: '22px', color: '#2c3e50', marginBottom: '20px' };
const infoBoxStyle: React.CSSProperties = { width: '100%', marginBottom: '15px', textAlign: 'left' };
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#95a5a6', fontWeight: 'bold', textTransform: 'uppercase' };
const valueStyle: React.CSSProperties = { fontSize: '14px', color: '#34495e', fontWeight: 'bold' };

const buttonStyle: React.CSSProperties = {
  marginTop: 'auto', width: '100%', padding: '12px', background: '#2ecc71', color: '#fff',
  border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s'
};