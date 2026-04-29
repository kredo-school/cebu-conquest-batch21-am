// クライアント → サーバー
export const CLIENT_EVENTS = {
  PLAYER_MOVE:       "playerMove",
  TERRITORY_CLAIMED: "territoryClaimed",
  BATTLE_START:      "battleStart",
  ACTION_SUBMIT:     "actionSubmit",
  READY_TO_START:    "READY_TO_START",
  ACTION_ESCAPE:     "actionEscape",
  ACTION_DEFEND:     "actionDefend",
  ITEM_WARP:         "itemWarp",
  SELECT_GOD:        "SELECT_GOD",
  PLAYER_READY:      "PLAYER_READY",
  LEAVE_ROOM:        "LEAVE_ROOM",
  SEND_CHAT:         "SEND_CHAT",
};

// サーバー → クライアント
export const SERVER_EVENTS = {
  SYNC_STATE:          "syncState",
  GAME_START:          "gameStart",
  PLAYER_MOVED:        "playerMoved",
  TERRITORY_UPDATED:   "territoryUpdated",
  BATTLE_RESULT:       "battleResult",
  NPC_UPDATE:          "npcUpdate",
  STATUS_UPDATED:      "statusUpdated",
  ACTION_RESULT:       "actionResult",
  ACTION_REJECTED:     "actionRejected",
  TURN_START:          "turnStart",
  GAME_OVER:           "gameOver",
  GAME_LOG:            "GAME_LOG",
  ERROR_MESSAGE:       "ERROR_MESSAGE",
  RECEIVE_CHAT:        "RECEIVE_CHAT",
  PLAYER_DISCONNECTED: "playerDisconnected",
  COMMENCE_OPERATION:  "COMMENCE_OPERATION",
};