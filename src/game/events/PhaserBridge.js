// src/game/events/PhaserBridge.js

/**
 * ─── Phaser → React ───────────────────────────
 * Phaser側（あきらさん担当）からReact側（いっせいさん担当）へ通知を送る際のイベント名定義
 */
export const PHASER_TO_REACT = {
  SELECT_DISTRICT:   'phaser:selectDistrict',   // { districtId, districtName, isMyTerritory, isNeutral }
  TERRITORY_CLAIMED: 'phaser:territoryClaimed',  // { districtId, owner, team }
  STATS_UPDATED:     'statsUpdated',             // { hp, stamina, atk, def, faith }
  GAME_LOG:          'gameLog',                  // { message }
  PLAYER_MOVED:      'phaser:playerMoved',       // { playerId, fromId, toId }
  BATTLE_RESULT:     'phaser:battleResult',      // { winnerId, hpDamage, districtId }
  TURN_START:        'phaser:turnStart',         // { turn, isMyTurn }
  ZOOM_UPDATED:      'phaser:zoomUpdated',       // 🚀 LOD連携用（ズームレベル更新通知）
};

/**
 * ─── React → Phaser ───────────────────────────
 * React側（いっせいさん担当）からPhaser側へコマンドを送る際のイベント名定義
 */
export const REACT_TO_PHASER = {
  COMMAND_ATTACK:         'react:commandAttack',      // { targetDistrictId }
  COMMAND_STAY:           'ACTION_STAY',               // 互換性維持のため旧名
  COMMAND_ESCAPE:         'react:commandEscape',      // { toDistrictId }
  COMMAND_DEFEND:         'react:commandDefend',      // なし
  COMMAND_DEPLOY_CONFIRM: 'react:confirmDeployment',  // { startDistrictId }
  SET_AVATAR:             'react:setAvatar',           // { godKey }
  
  // 🚀 追加：NPC対応 (けいさんのサーバーから届いたNPCデータをPhaserに反映)
  UPDATE_NPCS:            'react:updateNpcs',          // { npcData }

  // 🚀 追加：マスターデータ同期用 (なおさんのAPIから取得した地区情報をマップに再描画)
  MAP_REPAINT:            'react:mapRepaint',          // { districts }

  // BUG-002: useGameEvents.ts が || フォールバックで直書きしていた定数を正式定義
  SYNC_MAP:               'react:syncMap',             // { players, districts, turn, status }
  TURN_START_EFFECT:      'react:turnStart',           // { turn, isMyTurn }
  BATTLE_EFFECT:          'react:battleResult',        // { winnerId, ... }
  TERRITORY_EFFECT:       'react:territoryUpdated',    // { districtId, owner }
  GAME_OVER_EFFECT:       'react:gameOver',            // { winnerId, scores }
  START_GAME_BGM:         'react:startGameBgm',        // なし（インゲームBGM開始トリガー）
};

/**
 * 📡 Phaser → React への送信ユーティリティ
 * 生の window.dispatchEvent は使用せず、この関数を経由させてください。
 */
export function emitToReact(eventName, payload = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
}

/**
 * 📡 React → Phaser への送信ユーティリティ
 * useGameEvents.ts や store.ts で Phaser 側（MainScene.js 等）へ命令を送る際に使用します。
 */
export function emitToPhaser(eventName, payload = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
}