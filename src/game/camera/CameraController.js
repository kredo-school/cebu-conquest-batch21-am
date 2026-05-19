// src/game/camera/CameraController.js

import Phaser from "phaser";
import { ZOOM, FOLLOW, PAN } from "./ZoomConfig.js";

/**
 * カメラ制御を一元化するコントローラ。
 *
 * 責務:
 *   - setBounds によるマップ外はみ出し防止
 *   - startFollow による自プレイヤーの lerp 追従
 *   - ドラッグ・ホイール・ピンチ・キー操作のズーム/パン制御
 *   - ドラッグ中は一時的に follow 停止、ドラッグ終了後に自動再開
 *
 * 使い方（MainScene.js より）:
 *   this.cameraController = new CameraController(this);
 *   this.cameraController.setup(this.tiledMap, MAP_SCALE);
 *   // プレイヤーが配置されたら
 *   this.cameraController.follow(this.player);
 *   // update() 内で
 *   this.cameraController.update();
 */
export default class CameraController {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;

    this._dragMoved = false;
    this._followTarget = null;
    this._resumeFollowTimer = null;
    this._mapWidth = 0;
    this._mapHeight = 0;

    this._onZoomChanged = null;  // (newZoom) => void
    this._onHoverChanged = null; // (worldPoint) => void
  }

  /**
   * マップサイズを与えて初期化する。
   * @param {Phaser.Tilemaps.Tilemap} tiledMap
   * @param {number} mapScale
   */
  setup(tiledMap, mapScale = 1) {
    this._mapWidth = tiledMap.widthInPixels * mapScale;
    this._mapHeight = tiledMap.heightInPixels * mapScale;

    // A-2 修正点1: setBounds でマップ外を映さない
    this.cam.setBounds(0, 0, this._mapWidth, this._mapHeight);
    this.cam.setZoom(ZOOM.DEFAULT);

    this._setupPointerHandlers();
    this._setupWheelHandler();
    this._setupKeyboard();
  }

  /** @param {(zoom:number) => void} cb */
  onZoomChanged(cb) {
    this._onZoomChanged = cb;
  }

  /** @param {(worldPoint:{x:number,y:number}) => void} cb */
  onHoverChanged(cb) {
    this._onHoverChanged = cb;
  }

  /**
   * 自プレイヤーへの追従を開始。
   * A-2 修正点2: startFollow + lerp で滑らかに追従
   * @param {Phaser.GameObjects.GameObject} target
   */
  follow(target) {
    if (!target || !FOLLOW.ENABLED) return;
    this._followTarget = target;
    this.cam.startFollow(target, true, FOLLOW.LERP_X, FOLLOW.LERP_Y);
  }

  stopFollow() {
    this.cam.stopFollow();
  }

  /**
   * 一時的に follow を止め、一定時間後に再開する。
   * ユーザーがドラッグやキーでカメラを動かしたときに使う。
   */
  _suspendFollowTemporarily() {
    if (!this._followTarget) return;
    this.cam.stopFollow();

    if (this._resumeFollowTimer) {
      this._resumeFollowTimer.remove(false);
    }
    this._resumeFollowTimer = this.scene.time.delayedCall(
      FOLLOW.RESUME_DELAY_MS,
      () => {
        if (this._followTarget) {
          this.cam.startFollow(this._followTarget, true, FOLLOW.LERP_X, FOLLOW.LERP_Y);
        }
      }
    );
  }

  isDragging() {
    return this._dragMoved;
  }

  // ─── Pointer (drag / hover) ────────────────────

  _setupPointerHandlers() {
    const input = this.scene.input;

    input.on("pointerdown", () => {
      this._dragMoved = false;
      this.scene._dragMoved = false; // MainScene 側にも同期
    });

    input.on("pointermove", (p) => {
      if (p.isDown) {
        if (p.getDistance() > 3) {
          this._dragMoved = true;
          this.scene._dragMoved = true; // MainScene 側にも同期
          if (this._followTarget) this._suspendFollowTemporarily();
        }
        this.cam.scrollX -= (p.x - p.prevPosition.x) / this.cam.zoom;
        this.cam.scrollY -= (p.y - p.prevPosition.y) / this.cam.zoom;
      } else {
        const worldPoint = this.cam.getWorldPoint(p.x, p.y);
        if (this._onHoverChanged) this._onHoverChanged(worldPoint);
      }
    });
  }

  // ─── Wheel / Pinch zoom ────────────────────────

  _setupWheelHandler() {
    this.scene.input.on("wheel", (pointer, _objs, _dx, deltaY) => {
      const nativeEvent = pointer.event;
      const isPinch = nativeEvent?.ctrlKey === true;
      const zoomSpeed = isPinch ? ZOOM.PINCH_SPEED : ZOOM.WHEEL_SPEED;

      const oldZoom = this.cam.zoom;
      // A-2 修正点3: ズーム範囲を 0.5〜2.0 に固定
      const newZoom = Phaser.Math.Clamp(
        oldZoom - deltaY * zoomSpeed,
        ZOOM.MIN,
        ZOOM.MAX
      );
      if (oldZoom === newZoom) return;

      if (this._followTarget && !this._dragMoved) {
        // 追従中はそのままズームだけ変える（中心はプレイヤー）
        this.cam.setZoom(newZoom);
      } else {
        const worldX = this.cam.scrollX + pointer.x / oldZoom;
        const worldY = this.cam.scrollY + pointer.y / oldZoom;
        this.cam.setZoom(newZoom);
        this.cam.scrollX = worldX - pointer.x / newZoom;
        this.cam.scrollY = worldY - pointer.y / newZoom;
      }

      if (isPinch) nativeEvent.preventDefault();
      if (this._onZoomChanged) this._onZoomChanged(newZoom);
    });
  }

  // ─── Keyboard pan / zoom ───────────────────────

  _setupKeyboard() {
    this.cursors = this.scene.input.keyboard.createCursorKeys();
    this.wasdKeys = this.scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.scene.input.keyboard.on("keydown-Q", () => this._keyZoom(-1));
    this.scene.input.keyboard.on("keydown-E", () => this._keyZoom(+1));
    this.scene.input.keyboard.on("keydown-ZERO", () => this._keyZoomReset());
  }

  /** MainScene.update() から毎フレーム呼ぶ */
  update() {
    this._handleKeyboardPan();
  }

  _handleKeyboardPan() {
    const focused = document.activeElement;
    if (focused?.tagName === "INPUT" || focused?.tagName === "TEXTAREA") return;

    const speed = PAN.KEY_BASE_SPEED / this.cam.zoom;
    let moved = false;

    if (this.cursors.left.isDown)       { this.cam.scrollX -= speed; moved = true; }
    else if (this.cursors.right.isDown) { this.cam.scrollX += speed; moved = true; }
    if (this.cursors.up.isDown)         { this.cam.scrollY -= speed; moved = true; }
    else if (this.cursors.down.isDown)  { this.cam.scrollY += speed; moved = true; }

    // WASDはスポーン選択フェーズのみカメラパン
    if (this.scene.isSelectionMode) {
      if (this.wasdKeys.left.isDown)       { this.cam.scrollX -= speed; moved = true; }
      else if (this.wasdKeys.right.isDown) { this.cam.scrollX += speed; moved = true; }
      if (this.wasdKeys.up.isDown)         { this.cam.scrollY -= speed; moved = true; }
      else if (this.wasdKeys.down.isDown)  { this.cam.scrollY += speed; moved = true; }
    }

    // キー操作中は follow を一時停止
    if (moved && this._followTarget) {
      this._suspendFollowTemporarily();
    }
  }

  _keyZoom(dir) {
    const newZoom = Phaser.Math.Clamp(
      this.cam.zoom + dir * ZOOM.KEY_STEP,
      ZOOM.MIN,
      ZOOM.MAX
    );
    if (this.cam.zoom === newZoom) return;
    this.cam.setZoom(newZoom);
    if (this._onZoomChanged) this._onZoomChanged(newZoom);
  }

  _keyZoomReset() {
    this.cam.setZoom(ZOOM.DEFAULT);
    if (this._onZoomChanged) this._onZoomChanged(ZOOM.DEFAULT);
  }

  /**
   * スポーン確定時に1回だけ呼ぶ。
   * follow を停止してスポーン地点にカメラを即座に配置し、以降はフリーカメラへ移行する。
   * @param {number} worldX
   * @param {number} worldY
   */
  initAtSpawn(worldX, worldY) {
    this.cam.stopFollow();
    if (this._resumeFollowTimer) {
      this._resumeFollowTimer.remove(false);
      this._resumeFollowTimer = null;
    }
    this._followTarget = null;
    this.cam.centerOn(worldX, worldY);
  }

  /**
   * カメラを指定ワールド座標へ滑らかに移動する。
   * バトル演出・地区選択ハイライト時に使う。
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} duration - ミリ秒（デフォルト 400ms）
   */
  panTo(worldX, worldY, duration = 400) {
    this.cam.pan(worldX, worldY, duration, 'Power2');
  }

  /** ドラッグ移動が発生したか（タップ vs ドラッグの判定用） */
  get wasDragged() {
    return this._dragMoved;
  }

  /**
   * シーン shutdown() から呼ぶ。タイマーを解除し follow を停止する。
   * input ハンドラは Phaser のシーン破棄時に自動解除されるため不要。
   */
  destroy() {
    if (this._resumeFollowTimer) {
      this._resumeFollowTimer.remove(false);
      this._resumeFollowTimer = null;
    }
    this._followTarget = null;
  }
}
