import React from 'react';
import { useGameStore } from '../store';

export const HUD: React.FC = () => {
  // Storeから取得。store.tsで型を定義したから、もう赤波線は出ないはずだ。
  const { currentDistrictName, districts, isMyTurn, turnOwner, myId, myTeam } = useGameStore();

  const occupiedCount = Object.values(districts).filter(id => id === myId).length;
  const conquestProgress = (occupiedCount / 11) * 100;

  const textStyle: React.CSSProperties = { color: '#ffffff', fontSize: '12px', fontWeight: 'bold', textShadow: '1px 1px 2px #000' };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px', zIndex: 1000, pointerEvents: 'none' }}>
      {/* 左：SECTOR */}
      <div style={{ background: 'rgba(15,23,42,0.9)', padding: '10px 20px', borderBottom: '2px solid #fff', pointerEvents: 'auto' }}>
        <div style={{ fontSize: '8px', color: '#aaa' }}>SECTOR</div>
        <div style={textStyle}>{currentDistrictName}</div>
      </div>

      {/* 中央：STATUS */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto' }}>
        <div style={{ background: isMyTurn ? '#f1c40f' : '#334155', color: isMyTurn ? '#000' : '#fff', padding: '2px 20px', fontSize: '10px', fontWeight: 'bold' }}>
          {isMyTurn ? "▶ MISSION ACTIVE" : `▶ STANDBY: ${turnOwner}`}
        </div>
        <div style={{ background: 'rgba(15,23,42,0.9)', padding: '5px 20px', borderRadius: '0 0 10px 10px', display: 'flex', alignItems: 'center' }}>
          <span style={textStyle}>🚩 STATUS </span>
          <div style={{ width: '80px', height: '6px', background: '#000', margin: '0 10px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${conquestProgress}%`, backgroundColor: myTeam === 'red' ? '#ff3e3e' : '#00fbff', transition: 'width 1s ease' }} />
          </div>
          <span style={textStyle}>{occupiedCount} / 11</span>
        </div>
      </div>

      {/* 右：COMMS */}
      <div style={{ background: 'rgba(15,23,42,0.9)', padding: '10px 20px', borderBottom: '2px solid #fff', textAlign: 'right', pointerEvents: 'auto' }}>
        <div style={{ fontSize: '8px', color: '#aaa' }}>COMMS</div>
        <div style={textStyle}>02 ONLINE</div>
      </div>
    </div>
  );
};