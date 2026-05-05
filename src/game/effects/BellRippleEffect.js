// src/game/effects/BellRippleEffect.js
import { CEBU_PALETTE } from './CebuPalette.js';

/**
 * 鐘の波紋エフェクト（占領完了・攻撃失敗時）
 * 教会の鐘をモチーフにした同心円が外側へ広がりフェードアウトする
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {Object} [opts] - { duration?, rings?, color?, onComplete? }
 */
export function playBellRipple(scene, x, y, opts = {}) {
  const duration = opts.duration ?? 800;
  const rings    = opts.rings    ?? 3;
  const color    = opts.color    ?? CEBU_PALETTE.GOLD_MAIN;

  let completed = 0;

  for (let i = 0; i < rings; i++) {
    const ring = scene.add.graphics();
    ring.lineStyle(2, color, 1);
    ring.strokeCircle(0, 0, 20);
    ring.setPosition(x, y);
    ring.setAlpha(0.9);
    ring.setDepth(1000);

    scene.tweens.add({
      targets:  ring,
      scaleX:   4,
      scaleY:   4,
      alpha:    0,
      duration: duration,
      delay:    i * 240,
      ease:     'Power1',
      onComplete: () => {
        ring.destroy();
        completed++;
        if (completed === rings) opts.onComplete?.();
      },
    });
  }
}
