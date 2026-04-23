import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Phaser from "phaser";
import MainScene from "../game/scenes/MainScene";

interface PhaserGameProps {
  playerName: string;
}

export const PhaserGameView = forwardRef<any, PhaserGameProps>((props, ref) => {
  const { playerName } = props;
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    get game() { return gameRef.current; },
    get scene() { return gameRef.current?.scene.getScene('MainScene'); }
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    
    const config = {
      type: Phaser.AUTO,
      width: containerRef.current.offsetWidth || window.innerWidth - 320,
      height: containerRef.current.offsetHeight || window.innerHeight,
      backgroundColor: "#1a1a2e",
      // 🚀 【修正】RESIZEモードと矛盾する autoCenter: CENTER_BOTH を削除しました
      // これでリサイズ時にカメラ位置が狂うのを防ぎます
      scale: { 
        mode: Phaser.Scale.RESIZE 
      },
      scene: [MainScene],
      parent: "phaser-container",
    };

    // 🚀 【重要】二重起動を防ぐため、存在しない時だけ新規作成
    if (!gameRef.current) {
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.registry.set("playerName", playerName);
    }

    return () => {
      // コンポーネントが完全に消える時だけ破棄する
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
    // 🚀 【修正】依存配列から playerName を削除して空 [] にしました
    // これにより、ログインして名前が決まった瞬間にゲームが最初からやり直しになるバグを防ぎます
  }, []); 

  return (
    <div 
      ref={containerRef} 
      id="phaser-container" 
      style={{ flex: 1, height: "100vh", position: "relative", overflow: "hidden" }} 
    />
  );
});

export default PhaserGameView;