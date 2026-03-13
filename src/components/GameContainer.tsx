import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
// import { MainScene } from '../game/scenes/MainScene'; // あきらさんのScene
import { EventBus } from '../game/EventBus'; // 橋渡し役

// 陣地情報の型定義（必要に応じて拡張してください）
interface TerritoryData {
  id: number;
  name: string;
  buff: string;
}

export const GameContainer: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryData | null>(null);

  useEffect(() => {
    // 1. Phaserの初期化（二重起動防止）
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'phaser-game', // return内のdivのIDと一致させる
        width: 800,
        height: 600,
        backgroundColor: '#2d2d2d',
        // scene: [MainScene],
        physics: {
          default: 'arcade',
          arcade: { debug: false }
        },
        callbacks: {
          postBoot: (game) => {
            // ゲーム起動完了を通知
            EventBus.emit('current-game-ready', game);
          }
        }
      });
    }

    // 2. Phaserからのイベント（陣地タップ）を受け取る [cite: 30, 102]
    EventBus.on('territory-selected', (data: TerritoryData) => {
      console.log("セブ島の地区が選択されました:", data);
      setSelectedTerritory(data); // ReactのStateに保存してUIに反映
    });

    // クリーンアップ処理
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      EventBus.removeListener('territory-selected');
    };
  }, []);

  const handleAction = (actionType: 'attack' | 'stay') => {
    if (!selectedTerritory) return;

    // 3. ReactからPhaserへアクションを送信 [cite: 102]
    EventBus.emit('react-command-action', {
      type: actionType,
      id: selectedTerritory.id
    });

    // アクション後にパネルを閉じるなどの処理
    if (actionType === 'stay') setSelectedTerritory(null);
  };

  return (
    <div style={{ position: 'relative', width: '800px', height: '600px', margin: '0 auto' }}>
      {/* Phaserが描画されるキャンバス */}
      <div id="phaser-game" style={{ width: '100%', height: '100%' }} />

      {/* 4. いつのミッション：HUD/UIレイヤー [cite: 2, 100] */}
      {selectedTerritory && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <h3>📍 {selectedTerritory.name}</h3>
          <p>獲得できるバフ: {selectedTerritory.buff}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => handleAction('attack')} style={{ padding: '10px 20px', cursor: 'pointer', background: '#ff4444', border: 'none', color: 'white', fontWeight: 'bold' }}>
              攻める
            </button>
            <button onClick={() => handleAction('stay')} style={{ padding: '10px 20px', cursor: 'pointer', background: '#4444ff', border: 'none', color: 'white', fontWeight: 'bold' }}>
              Stay (回復)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};