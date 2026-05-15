/**
 * SoundManager — BGM・SE を一元管理するシングルトン
 */

const BGM_FILES = {
  login:   '/assets/audio/bgm/login-joinroom.mp3',
  waiting: '/assets/audio/bgm/waiting.mp3',
  map:     '/assets/audio/bgm/maingame.mp3',
  battle:  '/assets/audio/bgm/battle.mp3',
  winner:  '/assets/audio/bgm/winner.mp3',
  loser:   '/assets/audio/bgm/loser.mp3',
};

const SE_FILES = {
  click:   '/assets/audio/se/click_non_button.mp3',
  move:    '/assets/audio/se/moving.mp3',
  capture: '/assets/audio/se/territory_control.mp3',
};

const FADE_MS    = 1000; // 🚀 1秒かけて滑らかにフェード
const DEFAULT_BGM_VOLUME = 0.5;
const SE_VOLUME  = 0.8;

class SoundManager {
  constructor() {
    this._bgmKey    = null;   // 現在再生中のBGMキー
    this._scene     = null;   // Phaser.Scene
    this._phaserBgm = null;   // Phaser.Sound.BaseSound
    this._htmlBgm   = null;   // HTMLAudioElement
    this._muted     = false;
    this.bgmVolume  = DEFAULT_BGM_VOLUME; // 🚀 ユーザー設定から上書きされる値
    this._isFading  = false;  // フェード中フラグ
    this._pendingBgmKey = null; 
  }

  // ─── アセットロード ───────────────────
  preloadAssets(scene) {
    scene.load.audio('bgm_maingame', 'assets/audio/bgm/maingame.mp3');
    scene.load.audio('bgm_battle_music', 'assets/audio/bgm/battle.mp3');
    scene.load.audio('bgm_waiting', 'assets/audio/bgm/waiting.mp3');

    const seKeys = [
      'click_non_button',
      'healing',
      'moving',
      'airport',
      'emergency',
      'escape',
      'battle',
      'territory_control',
    ];
    for (const key of seKeys) {
      scene.load.audio(`se_${key}`, `assets/audio/se/${key}.mp3`);
    }
  }

  // ─── Phaserシーン登録・解除 ───────────────────
  setScene(scene) {
    this._scene = scene;

    if (this._htmlBgm) {
      // 🚀 HTML BGMを滑らかにフェードアウトさせてから停止
      const audio = this._htmlBgm;
      this._htmlBgm = null;
      this._fadeHtml(audio, audio.volume, 0, () => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

    if (this._bgmKey) {
      const key = this._bgmKey;
      this._bgmKey = null; 
      this.playBgm(key);
    }
  }

  clearScene() {
    if (this._phaserBgm) {
      this._phaserBgm.stop();
      this._phaserBgm.destroy();
      this._phaserBgm = null;
    }
    this._scene = null;
  }

  // ─── BGM ────────────────────────────────────────

  playBgm(key) {
    if (!BGM_FILES[key]) return;
    if (key === this._bgmKey) return;

    if (this._isFading) {
      this._pendingBgmKey = key;
      return;
    }

    this._bgmKey = key;

    if (this._scene) {
      this._fadeOutPhaser(() => this._startPhaser(key));
    } else {
      this._fadeOutHtml(() => this._startHtml(key));
    }
  }

  // ─── SE ─────────────────────────────────────────
  playSe(key) {
    if (this._muted || !SE_FILES[key]) return;

    const phaserKey = `se_${key}`;
    if (this._scene?.cache.audio.has(phaserKey)) {
      this._scene.sound.play(phaserKey, { volume: SE_VOLUME });
      return;
    }

    const audio = new Audio(SE_FILES[key]);
    audio.volume = SE_VOLUME;
    audio.play().catch(() => {});
  }

  // ─── 設定反映 ────────────────────────────────────

  setBgmVolume(volume) {
    this.bgmVolume = volume;
    const targetVol = this._muted ? 0 : volume;
    if (this._phaserBgm) this._phaserBgm.setVolume(targetVol);
    if (this._htmlBgm)   this._htmlBgm.volume = targetVol;
  }

  setMuted(muted) {
    this._muted = muted;
    this.setBgmVolume(this.bgmVolume);
  }

  get isMuted() { return this._muted; }

  // ─── Phaser内部処理 ──────────────────────────────────

  _fadeOutPhaser(onComplete) {
    if (!this._phaserBgm) { onComplete(); return; }
    const bgm = this._phaserBgm;
    this._phaserBgm = null;
    this._isFading = true;
    
    this._scene.tweens.add({
      targets: bgm,
      volume: 0,
      duration: FADE_MS,
      onComplete: () => {
        bgm.stop();
        bgm.destroy();
        this._isFading = false;
        if (this._pendingBgmKey) {
          const next = this._pendingBgmKey;
          this._pendingBgmKey = null;
          this.playBgm(next);
        } else {
          onComplete();
        }
      },
    });
  }

  _startPhaser(key) {
    const phaserKey = `bgm_${key === 'map' ? 'maingame' : key === 'battle' ? 'battle_music' : key}`;
    if (!this._scene?.cache.audio.has(phaserKey)) return;

    const bgm = this._scene.sound.add(phaserKey, { loop: true, volume: 0 });
    this._phaserBgm = bgm;
    bgm.play();

    // 🚀 BGM_VOLUME ではなく、ユーザー設定の this.bgmVolume へフェード
    this._scene.tweens.add({
      targets: bgm,
      volume: this._muted ? 0 : this.bgmVolume,
      duration: FADE_MS
    });
  }

  // ─── HTML Audio内部処理 ──────────────────────────────

  _fadeOutHtml(onComplete) {
    if (!this._htmlBgm) { onComplete(); return; }
    const audio = this._htmlBgm;
    this._htmlBgm = null;
    this._isFading = true;

    this._fadeHtml(audio, audio.volume, 0, () => {
      audio.pause();
      audio.currentTime = 0;
      this._isFading = false;
      if (this._pendingBgmKey) {
        const next = this._pendingBgmKey;
        this._pendingBgmKey = null;
        this.playBgm(next);
      } else {
        onComplete();
      }
    });
  }

  _startHtml(key) {
    const audio = new Audio(BGM_FILES[key]);
    audio.loop = true;
    audio.volume = 0;
    this._htmlBgm = audio;

    audio.play().then(() => {
      // 🚀 ユーザー設定の音量へフェードイン
      this._fadeHtml(audio, 0, this._muted ? 0 : this.bgmVolume, null);
    }).catch((e) => {
      if (import.meta.env.DEV) console.warn(`[SoundManager] HTML再生失敗: ${key}`, e);
    });
  }

  _fadeHtml(audio, from, to, onComplete) {
    const interval = 50;
    const steps = FADE_MS / interval;
    const stepValue = (to - from) / steps;
    let current = from;

    const timer = setInterval(() => {
      current += stepValue;
      const done = stepValue >= 0 ? current >= to : current <= to;
      
      if (done) {
        audio.volume = Math.max(0, Math.min(1, to));
        clearInterval(timer);
        onComplete?.();
      } else {
        audio.volume = Math.max(0, Math.min(1, current));
      }
    }, interval);
  }

  /**
   * Phaserキーを直接指定してBGMを再生する。
   */
  playBGM(phaserKey) { // 🚀 修正：未使用の引数 config を削除
    if (!this._scene) return;
    // 名前を正規化して playBgm に飛ばす
    const key = phaserKey.replace('bgm_', '').replace('_music', '');
    this.playBgm(key);
  }

  playSE(key) {
    this.playSe(key.replace('se_', ''));
  }

  playSEChain(keys, delayMs = 1500) {
    if (!keys.length) return;
    this.playSE(keys[0]);
    for (let i = 1; i < keys.length; i++) {
      this._scene?.time.delayedCall(delayMs * i, () => {
        this.playSE(keys[i]);
      });
    }
  }
}

export default new SoundManager();