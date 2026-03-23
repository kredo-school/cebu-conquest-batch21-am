import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import MainScene from '../game/scenes/MainScene';

// 【役割】Reactから届く playerName（名前）を引数として受け取ります
export default function PhaserGame({ playerName }) {
  // 【役割】作成したゲーム本体を保存しておくための「手」です
  const gameRef = useRef(null);

  useEffect(() => {
    // --- 1. 設定書（config）の作成 ---
    const config = {
      type: Phaser.AUTO,
      
      // 【意味】親要素（div）のサイズに合わせる
      // 【役割】100%にすることで、画面いっぱいに地図が広がります
      width: '100%',
      height: '100%',
      
      backgroundColor: '#1a1a2e',
      
      // 【意味】スケールマネージャー
      // 【役割】画面のリサイズに合わせて、ゲーム画面を自動調整します
      scale: {
        mode: Phaser.Scale.RESIZE, 
        autoCenter: Phaser.Scale.CENTER_BOTH, 
      },

      scene: [MainScene],
      
      // 【意味】ゲームを表示する場所
      // 【役割】下の return にある id="phaser-container" と紐付けます
      parent: 'phaser-container',
    };

    // --- 2. ゲームの起動 ---
    // 【役割】設定書をもとに Phaser の世界を生成します
    const game = new Phaser.Game(config);
    gameRef.current = game;

    // --- 3. バケツリレー（最重要！） ---
    // 【意味】Phaserの「共有ロッカー（Registry）」に名前を入れる
    // 【役割】Reactで入力された名前を、Phaserの MainScene.js から見える場所に置きます
    // これにより「playerName が定義されているが使われていない」エラーも解決します
    game.registry.set('playerName', playerName);

    // --- 4. お掃除（クリーンアップ） ---
    // 【役割】画面が切り替わったときに、古いゲームを破棄してメモリを守ります
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
      }
    };

    // 【意味】監視リスト
    // 【役割】playerName が届いた瞬間、または変わった瞬間にこの処理を動かします
  }, [playerName]); 

  // --- 5. 舞台（コンテナ）の用意 ---
  // 【意味】画面全体（幅100vw、高さ100vh）を確保する
  // 【役割】ここにPhaserのキャンバスが描画されます
  return (
    <div 
      id="phaser-container" 
      style={{ 
        flex: 1,
        height: '100vh', 
        position: 'relative', 
        top: 0, 
        left: 0 
        }} 
    />
  );
}