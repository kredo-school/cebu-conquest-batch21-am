// クライアント → サーバー
export const CLIENT_EVENTS = {
  PLAYER_MOVE:       "playerMove",
  TERRITORY_CLAIMED: "territoryClaimed",
  BATTLE_START:      "battleStart",
};

// サーバー → クライアント
export const SERVER_EVENTS = {
  SYNC_STATE:        "syncState",
  PLAYER_MOVED:      "playerMoved",
  TERRITORY_UPDATED: "territoryUpdated",
  BATTLE_RESULT:     "battleResult",
  NPC_UPDATE:        "npcUpdate",
};