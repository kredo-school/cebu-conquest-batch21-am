// src/components/ActionPanel.tsx

import React, { useEffect } from 'react';
import { useGameStore } from '../store';

export const ActionPanel: React.FC = () => {
  // 💡 値を個別に取得することで、Reactに「値が変わったら絶対に画面を更新しろ」と強制する
  const turn = useGameStore(state => state.turn);
  const selectedDistrictId = useGameStore(state => state.selectedDistrictId);
  const isSubmitted = useGameStore(state => state.isSubmitted);
  const isMyTurn = useGameStore(state => state.isMyTurn);
  const stay = useGameStore(state => state.stay);
  const defense = useGameStore(state => state.defense);
  const escape = useGameStore(state => state.escape);

  // --------------------------------------------------------
  // 🔴 1. Phaserからの「地区クリック」イベントを受け取る
  // --------------------------------------------------------
  useEffect(() => {
    const handleDistrictSelect = (e: any) => {
      const districtId = e.detail;
      console.log("🔥 Zustandを強制更新します！ 地区ID:", districtId);
      
      // 💡 setStatusの不具合を回避し、setStateで直接Storeを上書きする！
      useGameStore.setState({ 
        selectedDistrictId: districtId,
        currentDistrictName: `エリア ${districtId}` 
      });
    };

    window.addEventListener('DISTRICT_SELECTED', handleDistrictSelect);
    return () => window.removeEventListener('DISTRICT_SELECTED', handleDistrictSelect);
  }, []);

  // --------------------------------------------------------
  // 🔴 2. 出撃（DEPLOY）ボタンを押したときの処理
  // --------------------------------------------------------
  const handleDeploy = () => {
    if (!selectedDistrictId) return;
    console.log("🚀 出撃指令！地区ID:", selectedDistrictId);

    // Phaserに出撃（キャラ配置と領地の色塗り）を直接文字列で通知！
    window.dispatchEvent(new CustomEvent('COMMAND_DEPLOY_CONFIRM', { detail: { districtId: selectedDistrictId } }));

    // ストアのターンを1に進める
    useGameStore.getState().nextTurn();
  };

  // ========================================================
  // 🖥️ UIのレンダリング出し分け
  // ========================================================

  // ⭐️ [Turn 0] 初期スタンバイ状態（出撃地点を選ばせる）
  if (turn === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}>
        <p style={{ fontWeight: 'bold', color: selectedDistrictId ? '#f1c40f' : '#e74c3c', marginBottom: '10px' }}>
          {selectedDistrictId ? `📍 選択完了: エリア ${selectedDistrictId}` : '🗺️ マップから出撃地点を選択してください'}
        </p>
        <button
          onClick={handleDeploy}
          disabled={!selectedDistrictId}
          style={btnStyle(selectedDistrictId ? '#e67e22' : '#7f8c8d')}
        >
          {selectedDistrictId ? '🚀 ここから出撃する (DEPLOY)' : 'STANDBY...'}
        </button>
      </div>
    );
  }

  // ⭐️ [Turn 1以降] 通常のアクションモード
  if (!isMyTurn || isSubmitted) {
    return <div style={{ color: '#aaa', textAlign: 'center', padding: '10px' }}>相手のターン、または処理待ちです...</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '10px' }}>
      <button onClick={stay} style={btnStyle('#27ae60')}>Stay</button>
      <button onClick={defense} style={btnStyle('#2980b9')}>Defense</button>
      <button onClick={escape} style={btnStyle('#7f8c8d')}>Escape</button>
    </div>
  );
};

const btnStyle = (bg: string) => ({
  padding: '10px 20px', 
  background: bg, 
  color: 'white', 
  border: 'none', 
  borderRadius: '5px', 
  cursor: 'pointer', 
  fontWeight: 'bold' as const
});