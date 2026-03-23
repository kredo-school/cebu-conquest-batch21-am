import React from 'react';
import { useGameStore } from '../store';

// 【役割】画面上部に浮かぶ「司令部情報パネル」
// ミッション：HUD実装（兵力、バフ状況のリアルタイム表示）
// ★ export 名を HUD に修正しました！
export const HUD: React.FC = () => {
  // Zustandストアから現在の状況を取得
  const { hp, blessing, players, stamina } = useGameStore();

  // 現在参加しているプレイヤーの数
  const playerCount = players ? Object.keys(players).length : 0;

  return (
    <div style={hudContainerStyle}>
      {/* 1. プレイヤー情報エリア */}
      <div style={hudSectionStyle}>
        <span style={iconStyle}>👤</span>
        <span style={textStyle}>部隊数: {playerCount}</span>
      </div>

      {/* 2. 兵力・HPエリア */}
      <div style={hudSectionStyle}>
        <span style={iconStyle}>❤️</span>
        <div style={healthBarBgStyle}>
          <div style={{ ...healthBarStyle, width: `${hp}%` }} />
        </div>
        <span style={textStyle}>{hp}</span>
      </div>

      {/* 3. スタミナエリア */}
      <div style={hudSectionStyle}>
        <span style={iconStyle}>🔋</span>
        <span style={textStyle}>ST: {stamina}</span>
      </div>

      {/* 4. 特産品バフ（マンゴー）エリア */}
      <div style={hudSectionStyle}>
        <span style={iconStyle}>🥭</span>
        <span style={textStyle}>信仰: {blessing}</span>
      </div>
    </div>
  );
};

// --- デザイン設定（モダンUI仕様） ---
const hudContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '20px',
  padding: '10px 25px',
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(8px)',
  borderRadius: '50px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
  zIndex: 10,
  pointerEvents: 'none',
};

const hudSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'white',
  fontSize: '14px',
  fontWeight: 'bold',
};

const iconStyle: React.CSSProperties = { fontSize: '18px' };
const textStyle: React.CSSProperties = { fontFamily: 'monospace', letterSpacing: '0.5px' };
const healthBarBgStyle: React.CSSProperties = { width: '60px', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' };
const healthBarStyle: React.CSSProperties = { height: '100%', background: 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 0.3s ease-out' };