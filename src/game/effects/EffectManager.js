// src/game/effects/EffectManager.js
import { playCrossFlash  } from './CrossFlashEffect.js';
import { playBellRipple  } from './BellRippleEffect.js';
import { playHolyLight   } from './HolyLightEffect.js';
import { playAshSmoke    } from './AshSmokeEffect.js';
import { playPrayerHalo  } from './PrayerHaloEffect.js';
import { CEBU_PALETTE    } from './CebuPalette.js';

export default class EffectManager {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * 攻撃側エフェクト（ACTION_RESULT受信時・攻撃者位置）
   * → 十字架の閃光（マゼランクロスモチーフ）
   */
  playSlashEffect(x, y) {
    playCrossFlash(this.scene, x, y);
  }

  /**
   * 被攻撃側エフェクト（ACTION_RESULT受信時・対象位置）
   * → 灰・煙 + 鐘の波紋1回（ダメージを受けた荘厳な表現）
   */
  playExplosionEffect(x, y) {
    playAshSmoke(this.scene, x, y);
    playBellRipple(this.scene, x, y, { rings: 1, color: CEBU_PALETTE.WHITE_SMOKE });
  }

  /**
   * 占領完了エフェクト（_syncDistricts で地区が自陣になった瞬間）
   * → 鐘の波紋3回（占領の喜び）+ 金テキスト浮上
   */
  playCapturePopup(x, y) {
    playBellRipple(this.scene, x, y, { rings: 3 });
    this._playGoldText(x, y, '+1 SPOT');
  }

  // ─── 内部ヘルパー ───────────────────────────────────────

  /**
   * 金色テキストがゆっくり浮かび上がってフェードアウトする
   * （占領ポップアップ用。派手なジャンプ・バウンスは使わない）
   */
  _playGoldText(x, y, label) {
    const text = this.scene.add
      .text(x, y, label, {
        fontSize:        '20px',
        fontFamily:      'serif',
        color:           '#D4AF37',
        stroke:          '#6B3410',
        strokeThickness: 3,
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(3000)
      .setAlpha(0);

    this.scene.tweens.add({
      targets:  text,
      alpha:    { from: 0, to: 1 },
      y:        y - 20,
      duration: 400,
      ease:     'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets:  text,
          alpha:    0,
          y:        y - 60,
          duration: 700,
          delay:    400,
          ease:     'Sine.easeIn',
          onComplete: () => text.destroy(),
        });
      },
    });
  }
}
