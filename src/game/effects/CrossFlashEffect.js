// src/game/effects/CrossFlashEffect.js
import { CEBU_PALETTE } from './CebuPalette.js';

/**
 * 十字架の閃光エフェクト（攻撃成功時）
 * マゼランクロスをモチーフにした縦長の光の柱が二段階で発光する
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {Object} [opts] - { duration?, scale?, onComplete? }
 */
export function playCrossFlash(scene, x, y, opts = {}) {
  const duration = opts.duration ?? 600;
  const scale    = opts.scale    ?? 1.0;

  const cross = scene.add.graphics();
  cross.fillStyle(CEBU_PALETTE.GOLD_LIGHT, 1);
  cross.fillRect(x - 2,           y - 60 * scale, 4,           120 * scale); // 縦
  cross.fillRect(x - 30 * scale,  y - 2,          60 * scale,  4           ); // 横
  cross.setAlpha(0);
  cross.setDepth(1000);

  // フェードイン → ホールド → フェードアウト（二段階）
  scene.tweens.add({
    targets:  cross,
    alpha:    { from: 0, to: 1 },
    duration: duration * 0.2,
    onComplete: () => {
      // 白に切り替えてさらに輝かせる
      cross.clear();
      cross.fillStyle(CEBU_PALETTE.WHITE_PURE, 1);
      cross.fillRect(x - 2,          y - 60 * scale, 4,          120 * scale);
      cross.fillRect(x - 30 * scale, y - 2,          60 * scale, 4          );

      scene.tweens.add({
        targets:  cross,
        alpha:    0,
        duration: duration * 0.6,
        delay:    duration * 0.2,
        onComplete: () => {
          cross.destroy();
          opts.onComplete?.();
        },
      });
    },
  });
}
