// src/components/PhaserGame.tsx
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Phaser from "phaser";
import MainScene from "../game/scenes/MainScene";
import { PHASER_TO_REACT } from "../game/events/PhaserBridge"; // 🚀 追加
import { useGameStore } from "../store"; // ✅ GDD v3.1: lookupData 参照用に追加

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

  // 🚀 1. ゲーム本体の初期化
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // 🛑 ブラウザのピンチズーム無効化
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    
    const container = containerRef.current;
    container.addEventListener("wheel", preventBrowserZoom, { passive: false });

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: container.offsetWidth,
      height: container.offsetHeight,
      backgroundColor: "#020617", // slate-950に統一
      scale: { 
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [MainScene],
      parent: "phaser-container",
      render: {
        antialias: true,
        roundPixels: true // Windowsでの描画の滲みを防止
      }
    };

    if (!gameRef.current) {
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.registry.set("playerName", playerName);
    }

    // 🚀 GDD v3.1 ID整合性チェック（開発用デバッグログ）
    const validateIdFormat = (e: any) => {
      const id = e.detail?.districtId || e.detail;
      if (id) {
        // GDD v3.1: 地区は3桁、Spotは5桁
        const isSpot = id >= 10000 && id <= 99999;
        const isDistrict = id >= 100 && id <= 999;
        
        let islandName = "UNKNOWN";
        const lookupData = useGameStore.getState().lookupData;

        // lookupDataから親島を特定
        if (lookupData && lookupData.districts) {
          let targetDistrict = null;
          if (isDistrict) {
             targetDistrict = lookupData.districts.get(id);
          } else if (isSpot && lookupData.spots) {
             const spot = lookupData.spots.get(id);
             if (spot) targetDistrict = lookupData.districts.get(spot.parentDistrictId);
          }

          if (targetDistrict && lookupData.areas && lookupData.islands) {
             const area = lookupData.areas.get(targetDistrict.parentAreaId);
             if (area) {
               const island = lookupData.islands.get(area.parentIslandId);
               if (island) islandName = island.name.toUpperCase();
             }
          }
        }

        console.log(
          `%c 🛰️ PHASER ID CHECK %c ID: ${id} %c FORMAT: ${isSpot ? 'SPOT (5-DIGIT)' : (isDistrict ? 'DISTRICT (3-DIGIT)' : 'INVALID')} %c Island: ${islandName}`,
          "background: #f97316; color: white; font-weight: bold; padding: 2px 4px; border-radius: 4px 0 0 4px;",
          "background: #1e293b; color: #f97316; padding: 2px 4px;",
          isSpot || isDistrict ? "background: #16a34a; color: white; padding: 2px 4px;" : "background: #dc2626; color: white; padding: 2px 4px;",
          "color: #94a3b8; padding: 2px 4px;"
        );
      }
    };

    window.addEventListener(PHASER_TO_REACT.SELECT_DISTRICT, validateIdFormat);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      container.removeEventListener("wheel", preventBrowserZoom);
      window.removeEventListener(PHASER_TO_REACT.SELECT_DISTRICT, validateIdFormat);
    };
  }, []); 

  // 🚀 2. プレイヤー名の同期
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.registry.set("playerName", playerName);
    }
  }, [playerName]);

  return (
    <div 
      ref={containerRef} 
      id="phaser-container" 
      className="w-full h-full relative overflow-hidden flex-1 bg-slate-950"
    >
      {/* 🚀 コーナー装飾：Phaserキャンバスの上にサイバーパンクな意匠を重ねる */}
      <div className="absolute inset-0 pointer-events-none z-10 border border-white/5">
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500/40"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-500/40"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-orange-500/40"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-orange-500/40"></div>
      </div>
    </div>
  );
});

export default PhaserGameView;