import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Phaser from "phaser";
import MainScene from "../game/scenes/MainScene";

interface PhaserGameProps {
  playerName: string;
}

// ✅ 名前を PhaserGameView にして、App.tsx での衝突を避けます
export const PhaserGameView = forwardRef<any, PhaserGameProps>((props, ref) => {
  const { playerName } = props;
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    get game() {
      return gameRef.current;
    },
    get scene() {
      return gameRef.current?.scene.getScene("MainScene");
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const config = {
      type: Phaser.AUTO,
      width: containerRef.current.offsetWidth || window.innerWidth - 320,
      height: containerRef.current.offsetHeight || window.innerHeight,
      backgroundColor: "#1a1a2e",
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [MainScene],
      parent: "phaser-container",
    };

    if (!gameRef.current) {
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.registry.set("playerName", playerName);
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [playerName]);

  // src/components/PhaserGame.tsx
  useEffect(() => {
    if (!containerRef.current) return;

    // 🛑 ピンチによるページ全体ズームを無効化
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    const container = containerRef.current;
    container.addEventListener("wheel", preventBrowserZoom, { passive: false });

    const config = {
      type: Phaser.AUTO,
      width: containerRef.current.offsetWidth || window.innerWidth - 320,
      height: containerRef.current.offsetHeight || window.innerHeight,
      backgroundColor: "#1a1a2e",
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [MainScene],
      parent: "phaser-container",
    };

    if (!gameRef.current) {
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.registry.set("playerName", playerName);
    }

    return () => {
      container.removeEventListener("wheel", preventBrowserZoom);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [playerName]);

  return (
    <div
      ref={containerRef}
      id="phaser-container"
      style={{ flex: 1, height: "100vh", position: "relative", overflow: "hidden" }}
    />
  );
});

export default PhaserGameView;
