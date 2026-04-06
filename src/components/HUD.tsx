import React from 'react';
import { useGameStore } from '../store';

export const HUD: React.FC = () => {
  const { 
    currentDistrictName, districts, isMyTurn, turnOwner, myId, myTeam, turn, maxTurn, isSubmitted 
  } = useGameStore();

  // 1. 占領進捗の計算
  const isSelected = currentDistrictName && currentDistrictName !== "未展開" && currentDistrictName !== "";
  const actualCount = Object.values(districts).filter(id => id === myId).length;
  const conquestProgress = ((isSelected ? actualCount + 1 : actualCount) / 11) * 100;
  
  // Turn 0 (Standby) の時は 0%、それ以降は現在のターンに基づく進捗
  const turnProgress = (turn / maxTurn) * 100;

  // 2. ラベル判定（Turn 0 は INITIAL STANDBY、背景はグリーン）
  let statusLabel = "";
  if (turn === 0) {
    statusLabel = "▶ INITIAL STANDBY";
  } else if (isSubmitted) {
    statusLabel = `▶ STANDBY: SERVER`;
  } else if (isMyTurn) {
    statusLabel = isSelected ? "▶ MISSION ACTIVE" : "▶ SELECT SECTOR";
  } else {
    statusLabel = `▶ STANDBY: ${turnOwner}`;
  }

  // 3. 共通スタイル（視認性重視：白文字＋黒縁）
  const whiteText: React.CSSProperties = { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    textShadow: '0px 0px 4px #000, 1px 1px 2px #000',
    fontSize: '11px'
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 15px', zIndex: 1000, pointerEvents: 'none' }}>
      
      {/* 左：現在のセクター名 */}
      <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '8px 25px', clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)', borderBottom: '2px solid #fff', pointerEvents: 'auto' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>SECTOR</div>
        <div style={{ ...whiteText, fontSize: '13px' }}>{currentDistrictName || "地点未選択"}</div>
      </div>

      {/* 中央：メインパネル（STATUS & TURN） */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto' }}>
        <div style={{ 
          // Turn 0 の時はグリーン、Day 1 以降の自分のターンはイエロー
          background: (isMyTurn && !isSubmitted) ? (turn === 0 ? '#27ae60' : '#f1c40f') : '#334155', 
          color: '#fff', 
          padding: '2px 30px', fontSize: '11px', fontWeight: '900', clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0 100%)',
          transition: 'all 0.3s ease',
          boxShadow: (isMyTurn && !isSubmitted) ? `0 0 15px ${turn === 0 ? '#27ae60' : '#f1c40f'}` : 'none'
        }}>
          {statusLabel}
        </div>
        
        <div style={{ background: 'rgba(15, 23, 42, 0.95)', padding: '10px 20px', borderRadius: '0 0 15px 15px', border: '1px solid rgba(255,255,255,0.2)', minWidth: '220px' }}>
          
          {/* Status Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
            <span style={{ ...whiteText, width: '50px' }}>STATUS</span>
            <div style={{ flex: 1, height: '6px', background: '#000', margin: '0 10px', borderRadius: '3px', overflow: 'hidden', border: '1px solid #444' }}>
              <div style={{ 
                height: '100%', 
                width: `${Math.min(conquestProgress, 100)}%`, 
                backgroundColor: myTeam === 'red' ? '#ff3e3e' : '#00fbff', 
                boxShadow: `0 0 8px ${myTeam === 'red' ? '#ff3e3e' : '#00fbff'}`,
                transition: 'width 0.5s ease-out' 
              }} />
            </div>
            <span style={{ ...whiteText, width: '35px', textAlign: 'right' }}>{Math.round(conquestProgress)}%</span>
          </div>

          {/* Turn Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <span style={{ ...whiteText, width: '50px' }}>TURN</span>
            <div style={{ flex: 1, height: '6px', background: '#000', margin: '0 10px', borderRadius: '3px', overflow: 'hidden', border: '1px solid #444' }}>
              <div style={{ 
                height: '100%', 
                width: `${turnProgress}%`, 
                backgroundColor: '#f1c40f', 
                boxShadow: '0 0 8px #f1c40f',
                transition: 'width 1s ease' 
              }} />
            </div>
            {/* ✅ 修正：turn が 0 の時は Standby と表示し、1以上で 1/10 等の数値を表示 */}
            <span style={{ ...whiteText, width: '55px', textAlign: 'right' }}>
              {turn === 0 ? "Standby" : `${turn}/${maxTurn}`}
            </span>
          </div>
        </div>
      </div>

      {/* 右：プレイヤー情報 */}
      <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '8px 25px', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 100%)', borderBottom: `2px solid ${myTeam === 'red' ? '#ff3e3e' : '#00fbff'}`, pointerEvents: 'auto' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>COMMANDER ID</div>
        <div style={{ ...whiteText, fontSize: '11px' }}>{myId || "OFFLINE"}</div>
      </div>
    </div>
  );
};