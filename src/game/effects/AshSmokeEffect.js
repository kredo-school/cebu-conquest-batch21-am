// src/game/effects/AshSmokeEffect.js
import { CEBU_PALETTE } from './CebuPalette.js';

const SMOKE_COLORS = [
  CEBU_PALETTE.TERRACOTTA,
  CEBU_PALETTE.BRICK_DEEP,
  CEBU_PALETTE.ASH,
  CEBU_PALETTE.WHITE_SMOKE,
];

/**
 * 灰・煙エフェクト（敗北・HP減少時）
 * 教会の煙をモチーフにした赤茶〜灰のパーティクルが下方向へ散る
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {Object} [opts] - { duration?, count?, onComplete? }
 */
export function playAshSmoke(scene, x, y, opts = {}) {
  const duration = opts.duration ?? 700;
  const count    = opts.count    ?? 8;

  let completed = 0;

  for (let i = 0; i < count; i++) {
    // 下向きに広がる扇形（π*0.6 〜 π*1.4：おおよそ真下±72°）
    const angle  = Math.PI * 0.6 + Math.random() * Math.PI * 0.8;
    const dist   = 30 + Math.floor(Math.random() * 50);
    const color  = SMOKE_COLORS[i % SMOKE_COLORS.length];
    const radius = 3 + Math.floor(Math.random() * 5);
    const dur    = 500 + Math.floor(Math.random() * (duration - 500));

    const dot = scene.add.circle(x, y, radius, color)
      .setDepth(1000)
      .setAlpha(0.85);

    scene.tweens.add({
      targets:  dot,
      x:        x + Math.cos(angle) * dist,
      y:        y + Math.sin(angle) * dist,
      alpha:    0,
      scaleX:   0.3,
      scaleY:   0.3,
      duration: dur,
      ease:     'Power1',
      onComplete: () => {
        dot.destroy();
        completed++;
        if (completed === count) opts.onComplete?.();
      },
    });
  }
}
