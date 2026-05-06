// src/game/effects/HolyLightEffect.js
import { CEBU_PALETTE } from './CebuPalette.js';

/**
 * 聖光（god-rays）エフェクト（バフ発動・勝利時）
 * サントニーニョ教会に差し込む光をモチーフにした縦の光の筋が上から降り注ぐ
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {Object} [opts] - { duration?, rays?, onComplete? }
 */
export function playHolyLight(scene, x, y, opts = {}) {
  const duration = opts.duration ?? 1000;
  const rayCount = opts.rays     ?? 5;

  // 事前にオフセット・高さを決定（Math.random を使用）
  const rayData = Array.from({ length: rayCount }, (_, i) => ({
    offsetX: Math.floor(Math.random() * 60) - 30,   // -30〜+30
    height:  80 + Math.floor(Math.random() * 70),   // 80〜150
    delay:   i * 80,
  }));

  let completed = 0;

  rayData.forEach(({ offsetX, height, delay }) => {
    const ray = scene.add.graphics();
    // 白から金へのグラデーション風（上が白・下が金）
    ray.fillStyle(CEBU_PALETTE.WHITE_PURE, 0.5);
    ray.fillRect(-2, -height, 4, height * 0.6);
    ray.fillStyle(CEBU_PALETTE.GOLD_LIGHT, 0.7);
    ray.fillRect(-2, -height * 0.4, 4, height * 0.4);
    ray.setPosition(x + offsetX, y);
    ray.setAlpha(0);
    ray.setDepth(1000);

    scene.tweens.add({
      targets:  ray,
      alpha:    { from: 0, to: 0.85 },
      duration: duration * 0.3,
      delay,
      yoyo:     true,
      hold:     duration * 0.3,
      ease:     'Sine.easeInOut',
      onComplete: () => {
        ray.destroy();
        completed++;
        if (completed === rayCount) opts.onComplete?.();
      },
    });
  });
}
