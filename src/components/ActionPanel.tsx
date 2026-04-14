import React, { useEffect } from 'react';
import { useGameStore } from '../store';

export const ActionPanel: React.FC = () => {
  // 💡 storeからコンボ制に必要なデータを取得
  const turn = useGameStore(state => state.turn);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const stamina = useGameStore(state => state.stamina); 
  
  const attack = useGameStore(state => state.attack);
  const stay = useGameStore(state => state.stay);
  const endTurn = useGameStore(state => state.endTurn);

  // Phaserからの地区選択イベントを監視
  useEffect(() => {
    const handleDistrictSelect = (e: any) => {
      useGameStore.setState({ selectedDistrictId: e.detail });
    };
    window.addEventListener('DISTRICT_SELECTED', handleDistrictSelect);
    return () => window.removeEventListener('DISTRICT_SELECTED', handleDistrictSelect);
  }, []);

  // 出撃確定処理
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
          style={btnStyle(selectedDistrictId ? '#e67e22' : '#7f8c8d')}
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
  return (
    <div style={panelContainerStyle}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', width: '100%' }}>
        {/* ⚔️ Attack: AP 30消費 */}
        <button 
          onClick={() => selectedDistrictId && attack(selectedDistrictId)} 
          disabled={!selectedDistrictId || stamina < 30}
          style={btnStyle(selectedDistrictId && stamina >= 30 ? '#e74c3c' : '#555')}
        >
          ⚔️ Attack (30)
        </button>

        {/* 🧘 Stay: AP回復 */}
        <button onClick={stay} style={btnStyle('#27ae60')}>Stay (+30)</button>
      </div>

      {/* 🚀 ターン終了ボタン：これを押すまで手番は終わらない！ */}
      <button 
        onClick={() => endTurn()} 
        style={{ 
          width: '100%', 
          padding: '12px', 
          background: '#f39c12', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: 'pointer', 
          fontWeight: 'bold',
          borderBottom: '4px solid #e67e22' 
        }}
      >
        ⌛ TURN END (手番を交代)
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
  background: 'rgba(0,0,0,0.7)', 
  borderRadius: '12px', 
  width: '100%',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
};

const btnStyle = (bg: string) => ({ 
  padding: '12px', 
  background: bg, 
  color: 'white', 
  border: 'none', 
  borderRadius: '8px', 
  cursor: 'pointer', 
  fontWeight: 'bold' as const, 
  flex: 1,
  transition: '0.2s'
});