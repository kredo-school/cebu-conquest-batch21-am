// クライアント → サーバー
export const CLIENT_EVENTS = {
  PLAYER_MOVE:       "playerMove",
  TERRITORY_CLAIMED: "territoryClaimed",
  BATTLE_START:      "battleStart",
  ACTION_SUBMIT:     "actionSubmit",
  READY_TO_START:    "READY_TO_START",
  ACTION_ESCAPE:     "actionEscape",
  ACTION_DEFEND:     "actionDefend",
  ITEM_WARP:         "itemWarp"
};

// サーバー → クライアント
export const SERVER_EVENTS = {
  SYNC_STATE:        "syncState",
  GAME_START:        "gameStart",
  PLAYER_MOVED:      "playerMoved",
  TERRITORY_UPDATED: "territoryUpdated",
  BATTLE_RESULT:     "battleResult",
  NPC_UPDATE:        "npcUpdate",
  STATUS_UPDATED:    "statusUpdated",
  ACTION_RESULT:     "actionResult",
  ACTION_REJECTED:   "actionRejected",
  TURN_START:        "turnStart",
  GAME_OVER:         "gameOver"
};