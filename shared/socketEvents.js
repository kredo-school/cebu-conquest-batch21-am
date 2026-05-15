// 🚀 クライアント → サーバー (CLIENT_EVENTS)
export const CLIENT_EVENTS = {
  // マッチング・部屋関連（システム系は UPPER_CASE）
  PLAYER_READY:       "PLAYER_READY",     // 準備完了/解除
  LEAVE_ROOM:         "LEAVE_ROOM",       // 部屋を離れる
  READY_TO_START:     "READY_TO_START",   // マッチング完了通知
  CREATE_ROOM:        "CREATE_ROOM",      // 部屋作成
  JOIN_ROOM:          "JOIN_ROOM",        // 部屋参加
  ENTER_GOD_SELECTION:"ENTER_GOD_SELECTION", // 神選択フェーズへの移行

  // 基本移動・占領（アクション系は camelCase）
  PLAYER_MOVE:        "playerMove",       // 地区移動
  TERRITORY_CLAIMED:  "territoryClaimed", // 地区占領(空き地)

  // バトル・アクション関連
  BATTLE_START:       "battleStart",      // バトル開始要請
  ACTION_SUBMIT:      "actionSubmit",     // アクション送信(攻撃/Stay/防御/逃げる)
  ACTION_ESCAPE:      "actionEscape",     // 逃げる（※ACTION_SUBMITへ統合推奨だが互換維持）
  ACTION_DEFEND:      "actionDefend",     // 防御（※同上）
  TURN_END_SUBMIT:    "TURN_END_SUBMIT",  // ターン終了通知

  // アイテム・神関連
  SELECT_GOD:         "selectGod",        // camelCase に統一
  ITEM_WARP:          "itemWarp",         // ワープアイテム使用
  ACTION_USE_ITEM:    "actionUseItem",    // camelCase に統一

  // 通信・システム関連
  SEND_CHAT:          "SEND_CHAT",        // チャット送信
  ADD_NPC_REQUEST:    "add_npc_request",  // NPC追加リクエスト
};

// 🚀 サーバー → クライアント (SERVER_EVENTS)
export const SERVER_EVENTS = {
  // ルーム・開始関連
  COMMENCE_OPERATION: "commenceOperation", // ログの傾向に合わせ camelCase
  GAME_START:         "gameStart",         // 試合開始
  GAME_OVER:          "gameOver",          // 試合終了
  LOBBY_UPDATED:      "lobbyUpdated",      // ロビー情報更新

  // 状態同期 (最重要)
  SYNC_STATE:         "syncState",         // ログと完全一致
  STATUS_UPDATED:     "statusUpdated",     // パラメータ更新
  TERRITORY_UPDATED:  "territoryUpdated",  // ★末尾の'd'必須

  // 個別アクション・移動結果
  PLAYER_MOVED:       "playerMoved",       // 移動結果通知
  BATTLE_RESULT:      "battleResult",      // バトル計算結果
  ACTION_RESULT:      "actionResult",      // アクション受理成功
  ACTION_REJECTED:    "actionRejected",    // アクション拒否

  // ターン・時間関連
  TURN_START:         "turnStart",         // ターン開始
  NPC_UPDATE:         "npcUpdate",         // NPCの行動同期

  // チャット・ログ・通知
  RECEIVE_CHAT:       "RECEIVE_CHAT",      // チャット受信
  GAME_LOG:           "GAME_LOG",          // バトルログ等の通知
  ERROR_MESSAGE:      "ERROR_MESSAGE",     // システムエラー通知
  PLAYER_DISCONNECTED: "playerDisconnected", // プレイヤー切断
};