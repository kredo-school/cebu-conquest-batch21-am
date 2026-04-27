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
    get game() {
      return gameRef.current;
    },
    get scene() {
      return gameRef.current?.scene.getScene("MainScene");
    },
  }));

  // 🚀 1. ゲーム本体の初期化（マウント時に1回だけ実行）
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // 🛑 ピンチによるページ全体ズームを無効化
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    const container = containerRef.current;
    container.addEventListener("wheel", preventBrowserZoom, { passive: false });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: container.offsetWidth || window.innerWidth - 320,
      height: container.offsetHeight || window.innerHeight,
      backgroundColor: "#1a1a2e",
      // 🚀 RESIZEモードを維持
      scale: { 
        mode: Phaser.Scale.RESIZE 
      },
      scene: [MainScene],
      parent: "phaser-container",
    };

    // 🚀 二重起動を防ぐため、存在しない時だけ新規作成
    if (!gameRef.current) {
      const game = new Phaser.Game(config);
      gameRef.current = game;
      // 初回名前セット
      game.registry.set("playerName", playerName);
    }

    return () => {
      // コンポーネントが完全に消える時だけ破棄する
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      container.removeEventListener("wheel", preventBrowserZoom);
    };
    // 🚀 依存配列を空にすることで、playerNameが変わってもゲームを再起動させない
  }, []); 

  // 🚀 2. プレイヤー名の同期（名前がReact側で確定・変更された時だけPhaserに伝える）
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set("playerName", playerName);
    }
  }, [playerName]);

  return (
    // 🚀 修正：インラインスタイルの `height: "100vh"` を廃止し、親に追従する `w-full h-full` に変更。
    // これにより、Windowsでの小数点以下のピクセル計算ズレ（スクロールバーの発生）を防ぎます。
    <div 
      ref={containerRef} 
      id="phaser-container" 
      className="w-full h-full relative overflow-hidden flex-1"
    />
  );
});

export default PhaserGameView;