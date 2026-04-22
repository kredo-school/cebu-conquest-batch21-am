// ─── Phaser → React ───────────────────────────
export const PHASER_TO_REACT = {
  SELECT_DISTRICT:   'phaser:selectDistrict',
  TERRITORY_CLAIMED: 'phaser:territoryClaimed',
  STATS_UPDATED:     'statsUpdated',
  GAME_LOG:          'gameLog',
  PLAYER_MOVED:      'phaser:playerMoved',
  BATTLE_RESULT:     'phaser:battleResult',
  TURN_START:        'phaser:turnStart',
};

// ─── React → Phaser ───────────────────────────
export const REACT_TO_PHASER = {
  COMMAND_ATTACK:         'react:commandAttack',
  COMMAND_STAY:           'ACTION_STAY',
  COMMAND_ESCAPE:         'react:commandEscape',
  COMMAND_DEFEND:         'react:commandDefend',
  COMMAND_DEPLOY_CONFIRM: 'react:confirmDeployment',
};

export function emitToReact(eventName, payload = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
}