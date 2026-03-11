import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from '../game/scenes/MainScene';

export default function PhaserGame() {
  const gameRef = useRef(null);

  useEffect(() => {
    const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  scene: [MainScene],
  parent: 'phaser-container',
};

    gameRef.current = new Phaser.Game(config);

    // クリーンアップ（コンポーネントが消えたときGameを破棄）
    return () => {
      gameRef.current.destroy(true);
    };
  }, []);

  return <div id="phaser-container" />;
}