// src/game/effects/PrayerHaloEffect.js
import { CEBU_PALETTE } from './CebuPalette.js';

/**
 * 祈りの光輪エフェクト（Stay選択時）
 * 聖人のハローをモチーフにした金の輪が頭上に静かに浮かぶ
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {Object} [opts] - { duration?, onComplete? }
 */
export function playPrayerHalo(scene, x, y, opts = {}) {
  const duration = opts.duration ?? 1200;
  const haloY    = y - 40;

  const halo = scene.add.graphics();
  halo.lineStyle(3, CEBU_PALETTE.GOLD_MAIN, 1);
  halo.strokeCircle(0, 0, 22);
  halo.fillStyle(CEBU_PALETTE.GOLD_LIGHT, 0.12);
  halo.fillCircle(0, 0, 22);
  halo.setPosition(x, haloY);
  halo.setAlpha(0);
  halo.setDepth(1000);

  // フェードインしながらゆっくり浮上 → ホールド → フェードアウト
  scene.tweens.add({
    targets:  halo,
    alpha:    { from: 0, to: 0.9 },
    y:        haloY - 10,
    duration: duration * 0.3,
    ease:     'Sine.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets:  halo,
        alpha:    0,
        y:        haloY - 20,
        duration: duration * 0.6,
        delay:    duration * 0.2,
        ease:     'Sine.easeIn',
        onComplete: () => {
          halo.destroy();
          opts.onComplete?.();
        },
      });
    },
  });
}
