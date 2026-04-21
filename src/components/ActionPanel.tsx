import React, { useEffect } from 'react';
import { useGameStore } from '../store';

export const ActionPanel: React.FC = () => {
  // 💡 storeからデータを取得
  const turn = useGameStore(state => state.turn);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const stamina = useGameStore(state => state.stamina); 
  
  // アクション関数
  const attack = useGameStore(state => state.attack);
  const stay = useGameStore(state => state.stay);
  const defend = useGameStore(state => state.defend); // 防御アクションも追加
  const endTurn = useGameStore(state => state.endTurn);

  // Phaserからの地区選択イベントを監視
  useEffect(() => {
    const handleDistrictSelect = (e: any) => {
      useGameStore.setState({ selectedDistrictId: e.detail });
    };
    window.addEventListener('DISTRICT_SELECTED', handleDistrictSelect);
    return () => window.removeEventListener('DISTRICT_SELECTED', handleDistrictSelect);
  }, []);

  // 出撃確定処理 (Turn 0)
  const handleDeploy = () => {
    if (!selectedDistrictId) return;
    window.dispatchEvent(new CustomEvent('COMMAND_DEPLOY_CONFIRM', { detail: { districtId: selectedDistrictId } }));
    useGameStore.getState().nextTurn();
  };

  // ⭐️ [Turn 0] 初期配置フェーズ
  if (turn === 0) {
    return (
      <div style={panelContainerStyle}>
        <p style={{ fontWeight: 'bold', color: selectedDistrictId ? '#f1c40f' : '#e74c3c', marginBottom: '10px' }}>
          {selectedDistrictId ? `📍 出撃地点: エリア ${selectedDistrictId}` : '🗺️ 出撃地点を選択してください'}
        </p>
        <button
          onClick={handleDeploy}
          disabled={!selectedDistrictId}
          style={btnStyle(selectedDistrictId ? '#e67e22' : '#7f8c8d', !selectedDistrictId)}
        >
          🚀 出撃 (DEPLOY)
        </button>
      </div>
    );
  }

  // ⭐️ 相手のターン待機状態
  if (!isMyTurn) {
    return (
      <div style={panelContainerStyle}>
        <div style={{ color: '#aaa', fontWeight: 'bold' }}>⌛ 相手の行動を待っています...</div>
      </div>
    );
  }

  // ⭐️ [Turn 1以降] 自分のターン：スタミナの限り連続で行動可能
  // サーバーの消費AP(5)に合わせてチェック
  const canAttack = selectedDistrictId && stamina >= 5;

  return (
    <div style={panelContainerStyle}>
      {/* 選択中の地区情報 */}
      <div style={{ color: '#f1c40f', fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
        {selectedDistrictId ? `選択中: エリア ${selectedDistrictId}` : '攻撃先を選んでください'}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', width: '100%' }}>
        {/* ⚔️ Attack: AP 5消費 (サーバーのロジックに合わせました) */}
        <button 
          onClick={() => selectedDistrictId && attack(selectedDistrictId)} 
          disabled={!canAttack}
          style={btnStyle('#e74c3c', !canAttack)}
        >
          ⚔️ 攻撃 (5)
        </button>

        {/* 🛡️ Defend: AP 0消費 (防御を固める) */}
        <button 
          onClick={defend} 
          disabled={stamina < 0} // 基本いつでも可能
          style={btnStyle('#3498db', false)}
        >
          🛡️ 防御 (0)
        </button>

        {/* 🧘 Stay: AP大幅回復 */}
        <button 
          onClick={stay} 
          style={btnStyle('#27ae60', false)}
        >
          🧘 休息 (+30)
        </button>
      </div>

      {/* 🚀 ターン終了ボタン：これを押すまで手番は終わらない！ */}
      <button 
        onClick={() => endTurn()} 
        style={endTurnBtnStyle}
      >
        ⌛ ターン終了 (手番交代)
      </button>
    </div>
  );
};

// --- スタイル定義 ---
const panelContainerStyle: React.CSSProperties = { 
  display: 'flex', 
  flexDirection: 'column', 
  alignItems: 'center', 
  padding: '15px', 
  background: 'rgba(0,0,0,0.85)', 
  borderRadius: '12px', 
  width: '100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.1)'
};

// 💡 ポイント：disabledの状態を受け取って、opacityとgrayscaleを適用
const btnStyle = (bg: string, disabled: boolean): React.CSSProperties => ({ 
  padding: '12px 8px', 
  background: bg, 
  color: 'white', 
  border: 'none', 
  borderRadius: '8px', 
  cursor: disabled ? 'not-allowed' : 'pointer', 
  fontWeight: 'bold', 
  flex: '1 1 45%', // 2列に並びやすく調整
  transition: '0.3s all ease',
  // 🚀 グレーアウト演出
  opacity: disabled ? 0.4 : 1,
  filter: disabled ? 'grayscale(100%)' : 'none',
  transform: disabled ? 'scale(0.95)' : 'none',
  fontSize: '14px'
});

const endTurnBtnStyle: React.CSSProperties = { 
  width: '100%', 
  padding: '14px', 
  background: 'linear-gradient(to bottom, #f39c12, #e67e22)', 
  color: 'white', 
  border: 'none', 
  borderRadius: '8px', 
  cursor: 'pointer', 
  fontWeight: 'bold',
  fontSize: '16px',
  boxShadow: '0 4px 0 #d35400',
  marginTop: '5px'
};