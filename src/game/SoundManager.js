/**
 * SoundManager — BGM・SE を一元管理するシングルトン
 *
 * 【配置するファイル】
 *   public/assets/audio/bgm/
 *     bgm_title.mp3   … タイトル画面
 *     bgm_lobby.mp3   … ログイン・ロビー画面
 *     bgm_map.mp3     … マップゲーム中（通常）
 *     bgm_battle.mp3  … 攻撃アクション時
 *
 *   public/assets/audio/se/
 *     se_click.mp3    … 地区タップ・キー操作
 *     se_move.mp3     … 初期配置確定
 *     se_capture.mp3  … 陣地獲得
 *
 * 【使い方】
 *   import SoundManager from '../game/SoundManager';
 *   SoundManager.playBgm('map');      // BGM 切り替え（フェード付き）
 *   SoundManager.playSe('capture');   // SE 単発再生
 *   SoundManager.setMuted(true);      // ミュート切り替え
 */

const BGM_FILES = {
  title:  '/assets/audio/bgm/bgm_title.mp3',
  lobby:  '/assets/audio/bgm/bgm_lobby.mp3',
  map:    '/assets/audio/bgm/bgm_map.mp3',
  battle: '/assets/audio/bgm/bgm_battle.mp3',
};

const SE_FILES = {
  click:   '/assets/audio/se/se_click.mp3',
  move:    '/assets/audio/se/se_move.mp3',
  capture: '/assets/audio/se/se_capture.mp3',
};

const FADE_MS    = 800;
const BGM_VOLUME = 0.5;
const SE_VOLUME  = 0.8;

class SoundManager {
  constructor() {
    this._bgmKey    = null;   // 現在再生中のBGMキー
    this._scene     = null;   // Phaser.Scene（game中のみ非null）
    this._phaserBgm = null;   // Phaser.Sound.BaseSound
    this._htmlBgm   = null;   // HTMLAudioElement
    this._muted     = false;
  }

  // ─── Phaserシーン登録・解除 ───────────────────

  /**
   * MainScene.create() から呼ぶ。
   * HTML BGMが流れていた場合は停止してPhaserに引き継ぐ。
   */
  setScene(scene) {
    this._scene = scene;

    if (this._htmlBgm) {
      this._htmlBgm.pause();
      this._htmlBgm = null;
    }

    // 既に再生中だったキーをPhaser側で再開
    if (this._bgmKey) {
      const key = this._bgmKey;
      this._bgmKey = null; // 強制再起動のためリセット
      this.playBgm(key);
    }
  }

  /**
   * MainScene.shutdown() から呼ぶ。
   */
  clearScene() {
    if (this._phaserBgm) {
      this._phaserBgm.stop();
      this._phaserBgm.destroy();
      this._phaserBgm = null;
    }
    this._scene = null;
  }

  // ─── BGM ────────────────────────────────────────

  /**
   * BGMを切り替える。同じキーは無視。フェードアウト→フェードインで遷移。
   * @param {string} key - 'title' | 'lobby' | 'map' | 'battle'
   */
  playBgm(key) {
    if (!BGM_FILES[key]) return;
    if (key === this._bgmKey) return;
    this._bgmKey = key;

    if (this._scene) {
      this._fadeOutPhaser(() => this._startPhaser(key));
    } else {
      this._fadeOutHtml(() => this._startHtml(key));
    }
  }

  // ─── SE ─────────────────────────────────────────

  /**
   * SEを単発再生する。ファイルがなければ無音で素通りする。
   * @param {string} key - 'click' | 'move' | 'capture'
   */
  playSe(key) {
    if (this._muted || !SE_FILES[key]) return;

    const phaserKey = `se_${key}`;
    if (this._scene?.cache.audio.has(phaserKey)) {
      this._scene.sound.play(phaserKey, { volume: SE_VOLUME });
      return;
    }

    // Phaserなし／ロード前のフォールバック
    const audio = new Audio(SE_FILES[key]);
    audio.volume = SE_VOLUME;
    audio.play().catch(() => {});
  }

  // ─── ミュート ────────────────────────────────────

  setMuted(muted) {
    this._muted = muted;
    const vol = muted ? 0 : BGM_VOLUME;
    if (this._phaserBgm) this._phaserBgm.setVolume(vol);
    if (this._htmlBgm)   this._htmlBgm.volume = vol;
  }

  get isMuted() { return this._muted; }

  // ─── Phaser内部 ──────────────────────────────────

  _fadeOutPhaser(onComplete) {
    if (!this._phaserBgm) { onComplete(); return; }
    const bgm = this._phaserBgm;
    this._phaserBgm = null;
    this._scene.tweens.add({
      targets: bgm,
      volume: 0,
      duration: FADE_MS,
      onComplete: () => { bgm.stop(); bgm.destroy(); onComplete(); },
    });
  }

  _startPhaser(key) {
    const phaserKey = `bgm_${key}`;
    if (!this._scene?.cache.audio.has(phaserKey)) return;
    const bgm = this._scene.sound.add(phaserKey, { loop: true, volume: 0 });
    bgm.play();
    this._scene.tweens.add({ targets: bgm, volume: BGM_VOLUME, duration: FADE_MS });
    this._phaserBgm = bgm;
  }

  // ─── HTML Audio内部 ──────────────────────────────

  _fadeOutHtml(onComplete) {
    if (!this._htmlBgm) { onComplete(); return; }
    const audio = this._htmlBgm;
    this._htmlBgm = null;
    this._fadeHtml(audio, audio.volume, 0, () => { audio.pause(); onComplete(); });
  }

  _startHtml(key) {
    const audio = new Audio(BGM_FILES[key]);
    audio.loop = true;
    audio.volume = 0;
    audio.play().catch(() => {});
    this._fadeHtml(audio, 0, BGM_VOLUME, null);
    this._htmlBgm = audio;
  }

  _fadeHtml(audio, from, to, onComplete) {
    const steps  = FADE_MS / 50;
    const step   = (to - from) / steps;
    let   current = from;
    audio.volume  = Math.max(0, Math.min(1, from));

    const timer = setInterval(() => {
      current += step;
      const done = step >= 0 ? current >= to : current <= to;
      if (done) {
        audio.volume = Math.max(0, Math.min(1, to));
        clearInterval(timer);
        onComplete?.();
      } else {
        audio.volume = Math.max(0, Math.min(1, current));
      }
    }, 50);
  }
}

export default new SoundManager();
