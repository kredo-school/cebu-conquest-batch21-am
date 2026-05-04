// src/game/camera/ZoomConfig.js

/**
 * カメラのズーム範囲とスムージング設定。
 * LOD閾値は ZoomManager.js 側にあるが、将来的にこちらへ統合する想定。
 */
export const ZOOM = {
  MIN: 0.5,
  MAX: 2.0,
  DEFAULT: 1.0,
  WHEEL_SPEED: 0.001,
  PINCH_SPEED: 0.1,
  KEY_STEP: 0.25,        // キー操作1回あたりのズーム変化量（旧0.5から半減して滑らかに）
};

export const FOLLOW = {
  ENABLED: true,
  LERP_X: 0.08,
  LERP_Y: 0.08,
  RESUME_DELAY_MS: 800,  // ドラッグ後、何ミリ秒で追従を再開するか
};

export const PAN = {
  KEY_BASE_SPEED: 8,     // 矢印・WASD の毎フレーム移動量（zoomで除算される）
};
