import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { HUD } from './components/HUD'; 
import { useGameStore } from './store';
import TitleScreen from './components/TitleScreen';
import { LoginView } from './components/LoginView'; 
import { PhaserGameView } from './components/PhaserGame'; // ✅ 名称衝突を回避したインポート
import socket from './socket';
import './App.css'; 

const App: React.FC = () => {
  // ✅ 任務：Zustand Store から司令官のステータスと機能を抽出
  const { hp, setStatus, syncServerState, damage, addLog } = useGameStore();
  
  // ✅ 任務：Phaser(MainScene)をReact側から操作するためのRef
  const gameRef = useRef<any>(null);

  // 画面遷移の状態管理
  const [view, setView] = useState<'title' | 'login' | 'waiting' | 'game'>('title');
  const [playerName, setPlayerName] = useState('');
  
  // ✅ 任務：マップ選択モードで今「ポチッ」と選ばれている地区ID
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    // --- 1. サーバー通信系イベントの購読 ---
    socket.on('syncState', (state) => syncServerState(state));

    // マッチング成功！
    socket.on('gameStart', (data) => {
      console.log('Matching Success!', data);
      setView('game'); 
    });

    // 満員時の処理
    socket.on('room_full', (data) => {
      alert(data.message);
      socket.disconnect();
      setView('title');
    });

    // バトル結果の反映
    socket.on('battleResult', (result) => {
      if (result.loserId === socket.id) {
        damage(result.hpDamage);
        addLog(`敗北... ${result.hpDamage}のダメージ！`);
      } else if (result.winnerId === socket.id) {
        addLog(`勝利！ 領地を確保した！`);
      }
    });

    // --- 2. Phaser側からのカスタムイベントをキャッチ ---
    
    // HP/スタミナ等のステータス更新をStoreに同期
    const handleUpdateStatus = (e: any) => setStatus(e.detail);
    
    // 地図上で地区がクリックされた際の通知
    const handleDistrictSelected = (e: any) => setSelectedId(e.detail);

    window.addEventListener("UPDATE_STATUS", handleUpdateStatus);
    window.addEventListener("DISTRICT_SELECTED", handleDistrictSelected);

    // クリーンアップ（二重登録防止）
    return () => {
      socket.off('syncState');
      socket.off('gameStart');
      socket.off('battleResult');
      socket.off('room_full');
      window.removeEventListener("UPDATE_STATUS", handleUpdateStatus);
      window.removeEventListener("DISTRICT_SELECTED", handleDistrictSelected);
    };
  }, [setStatus, syncServerState, damage, addLog]);

  // ✅ 任務：ログイン処理
  const handleLoginSubmit = (name: string) => {
    setPlayerName(name); 
    socket.connect();
    // チーム分け（issei司令官は常に情熱の赤チーム！）
    const selectedTeam = name === 'issei' ? 'red' : 'blue';
    socket.emit('join_game', { 
      userId: Math.floor(Math.random() * 1000), 
      username: name, 
      team: selectedTeam 
    });
    setView('waiting'); 
  };

  // ✅ 任務：地図で場所を選んだ後の「最終出撃確定」
  const handleFinalDeploy = () => {
    if (selectedId && gameRef.current?.scene) {
      // 1. サーバーへ開始地点を通知
      socket.emit("READY_TO_START", {
        username: playerName,
        startDistrictId: selectedId 
      });

      // 2. Phaserのシーンに「出撃確定」を伝え、配置モードを終了させる
      gameRef.current.scene.confirmDeployment(selectedId);
      
      // 3. 選択用UIを閉じる
      setSelectedId(null);
    }
  };

  // ─── 画面レンダリングの分岐 ───

  // 1. タイトル
  if (view === 'title') return <TitleScreen onStart={() => setView('login')} />;
  
  // 2. ログイン
  if (view === 'login') return <LoginView onLogin={handleLoginSubmit} />;
  
  // 3. 待機画面（ぐるぐるサークル復活版）
  if (view === 'waiting') {
    return (
      <div style={waitingContainerStyle}>
        {/* CSSアニメーションの定義を直接埋め込み */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        
        <h1 style={{fontSize: '48px', marginBottom: '20px'}}>Looking for a match...</h1>
        <p style={{fontSize: '18px', opacity: 0.8}}>「{playerName}」司令官、作戦待機中...</p>
        
        {/* 復活したぐるぐるサークル */}
        <div style={loaderCircleStyle} />
        
        <button onClick={() => setView('game')} style={debugButtonStyle}>(Debug) Force Start</button>
      </div>
    );
  }

  // 4. ゲーム本編
  return (
    <div style={gameMainContainerStyle}>
      <div style={gameViewportStyle}>
        {/* Phaser本体 */}
        <PhaserGameView ref={gameRef} playerName={playerName} />
        
        {/* ✅ 任務：出撃地点の選択確定ボタン */}
        {selectedId && (
          <div style={deployOverlayStyle}>
            <div style={deployBoxStyle}>
              <h2 style={{margin: '0 0 10px 0', color: '#f1c40f'}}>📍 DISTRICT {selectedId}</h2>
              <p style={{margin: '0 0 15px 0'}}>ここを本拠地として攻略を開始しますか？</p>
              <button onClick={handleFinalDeploy} style={deployButtonStyle}>
                降下開始 (Deploy)
              </button>
              <p style={{fontSize: '11px', marginTop: '10px', opacity: 0.6}}>※別の場所をタップして変更可能です</p>
            </div>
          </div>
        )}

        {/* HUD（画面通知等） */}
        <HUD />

        {/* ゲームオーバー演出 */}
        {hp <= 0 && (
          <div style={gameOverOverlayStyle}>
            <h1 style={{ color: 'white', fontSize: '80px', textShadow: '0 0 20px red', margin: 0 }}>MISSION FAILED</h1>
            <button 
              style={retryButtonStyle}
              onClick={() => window.location.reload()}
            >
              再出撃 (Re-deploy)
            </button>
          </div>
        )}
      </div>
      
      {/* 右側の情報パネル（HP/STバー連携） */}
      <Sidebar />
    </div>
  );
};

// ─── スタイル定義（司令官のこだわりを凝縮） ───

const gameMainContainerStyle: React.CSSProperties = { display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#1a1a2e', overflow: 'hidden' };
const gameViewportStyle: React.CSSProperties = { flex: 1, position: 'relative' };

const waitingContainerStyle: React.CSSProperties = { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' };
const loaderCircleStyle: React.CSSProperties = { marginTop: '40px', border: '8px solid rgba(255, 255, 255, 0.1)', borderTop: '8px solid #3b82f6', borderRadius: '50%', width: '60px', height: '60px', animation: 'spin 1s linear infinite' };

const deployOverlayStyle: React.CSSProperties = { position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 500 };
const deployBoxStyle: React.CSSProperties = { background: 'rgba(26, 26, 46, 0.95)', padding: '25px', borderRadius: '15px', border: '2px solid #f1c40f', color: 'white', textAlign: 'center', boxShadow: '0 0 30px rgba(0,0,0,0.7)' };
const deployButtonStyle: React.CSSProperties = { background: '#f1c40f', color: '#1a1a2e', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px' };

const gameOverOverlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const retryButtonStyle: React.CSSProperties = { marginTop: '30px', padding: '15px 30px', fontSize: '20px', cursor: 'pointer', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const debugButtonStyle: React.CSSProperties = { marginTop: '40px', padding: '10px 20px', background: '#334155', color: '#94a3b8', border: 'none', cursor: 'pointer', borderRadius: '5px' };

export default App;