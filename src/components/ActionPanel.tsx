import React, { useEffect } from 'react';
import { useGameStore } from '../store';

export const ActionPanel: React.FC = () => {
  // 💡 Zustandから必要な値とアクションをすべて取得
  const turn = useGameStore(state => state.turn);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const isSubmitted = useGameStore(state => state.isSubmitted);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  
  // アクション
  const attack = useGameStore(state => state.attack);
  const stay = useGameStore(state => state.stay);
  const defense = useGameStore(state => state.defense);
  const escape = useGameStore(state => state.escape);

  // --------------------------------------------------------
  // 🔴 1. Phaserからの選択イベントを監視（バックアップ用）
  // --------------------------------------------------------
  useEffect(() => {
    const handleDistrictSelect = (e: any) => {
      const districtId = e.detail;
      useGameStore.setState({ 
        selectedDistrictId: districtId,
      });
    };

    window.addEventListener('DISTRICT_SELECTED', handleDistrictSelect);
    return () => window.removeEventListener('DISTRICT_SELECTED', handleDistrictSelect);
  }, []);

  // --------------------------------------------------------
  // 🔴 2. ボタン押下時のハンドラー
  // --------------------------------------------------------
  const handleDeploy = () => {
    if (!selectedDistrictId) return;
    // Phaserへ配置を指示（PhaserBridge経由）
    window.dispatchEvent(new CustomEvent('COMMAND_DEPLOY_CONFIRM', { detail: { districtId: selectedDistrictId } }));
    // サーバーへ配置完了を通知（READY_TO_STARTはApp.tsx側の処理と連動）
    useGameStore.getState().nextTurn();
  };

  const handleAttack = () => {
    if (selectedDistrictId) {
      attack(selectedDistrictId);
    }
  };

  // ========================================================
  // 🖥️ UIレンダリング
  // ========================================================

  // ⭐️ [Turn 0] 初期配置フェーズ
  if (turn === 0) {
    return (
      <div style={panelContainerStyle}>
        <p style={{ fontWeight: 'bold', color: selectedDistrictId ? '#f1c40f' : '#e74c3c', marginBottom: '10px' }}>
          {selectedDistrictId ? `📍 ターゲット: エリア ${selectedDistrictId}` : '🗺️ 出撃地点を選択してください'}
        </p>
        <button
          onClick={handleDeploy}
          disabled={!selectedDistrictId}
          style={btnStyle(selectedDistrictId ? '#e67e22' : '#7f8c8d')}
        >
          {selectedDistrictId ? '🚀 出撃 (DEPLOY)' : 'STANDBY...'}
        </button>
      </div>
    );
  }

  // ⭐️ 相手のターンまたは送信後の待機状態
  if (!isMyTurn || isSubmitted) {
    return (
      <div style={panelContainerStyle}>
        <div style={{ color: '#aaa', fontStyle: 'italic' }}>
          {isSubmitted ? '📡 命令送信中...' : '⌛ 相手の行動を待っています'}
        </div>
      </div>
    );
  }

  // ⭐️ [Turn 1以降] 自分のターン：アクション選択
  return (
    <div style={{ ...panelContainerStyle, flexDirection: 'row', gap: '10px' }}>
      {/* ⚔️ Attackボタン: 地区を選択している時だけ赤く光る */}
      <button 
        onClick={handleAttack} 
        disabled={!selectedDistrictId}
        style={btnStyle(selectedDistrictId ? '#e74c3c' : '#555')}
      >
        {selectedDistrictId ? `⚔️ Attack (${selectedDistrictId})` : '⚔️ Select Target'}
      </button>

      <button onClick={stay} style={btnStyle('#27ae60')}>Stay</button>
      <button onClick={defense} style={btnStyle('#2980b9')}>Defense</button>
      <button onClick={escape} style={btnStyle('#95a5a6')}>Escape</button>
    </div>
  );
};

// --- スタイル定義 ---
const panelContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '15px',
  background: 'rgba(0,0,0,0.3)',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  width: '100%'
};

const btnStyle = (bg: string) => ({
  padding: '12px 18px', 
  background: bg, 
  color: 'white', 
  border: 'none', 
  borderRadius: '8px', 
  cursor: 'pointer', 
  fontWeight: 'bold' as const,
  fontSize: '14px',
  transition: 'all 0.2s ease',
  boxShadow: bg === '#e74c3c' ? '0 0 15px rgba(231, 76, 60, 0.4)' : 'none',
  minWidth: '100px'
});