// src/game/events/PhaserBridge.js

// ─── Phaser → React ───────────────────────────
// Phaser側からReact側へ通知を送る際のイベント名定義 [cite: 100, 102]
export const PHASER_TO_REACT = {
  SELECT_DISTRICT:   'phaser:selectDistrict',
  TERRITORY_CLAIMED: 'phaser:territoryClaimed',
  STATS_UPDATED:     'statsUpdated',
  GAME_LOG:          'gameLog',
  PLAYER_MOVED:      'phaser:playerMoved',
  BATTLE_RESULT:     'phaser:battleResult',
  TURN_START:        'phaser:turnStart',
  ZOOM_UPDATED:      'phaser:zoomUpdated', // 🚀 追加：ズームレベル更新通知 (LOD連携用)
};

// ─── React → Phaser ───────────────────────────
// React側からPhaser側へコマンドを送る際のイベント名定義 [cite: 100, 104]
export const REACT_TO_PHASER = {
  COMMAND_ATTACK:         'react:commandAttack',
  COMMAND_STAY:           'ACTION_STAY', // 互換性維持のため旧名 [cite: 105]
  COMMAND_ESCAPE:         'react:commandEscape',
  COMMAND_DEFEND:         'react:commandDefend',
  COMMAND_DEPLOY_CONFIRM: 'react:confirmDeployment',
  SET_AVATAR:             'react:setAvatar', // payload: { godKey: number }
};

/**
 * PhaserからReactへカスタムイベントを発行するユーティリティ [cite: 101]
 * window.dispatchEvent を直接呼ぶのは禁止です [cite: 108]
 */
export function emitToReact(eventName, payload = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
}