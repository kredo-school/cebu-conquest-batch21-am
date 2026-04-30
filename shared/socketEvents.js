// shared/socketEvents.js

/**
 * Cebu Conquest - Socket.IO イベントコントラクト (GDD v3.1 準拠)
 * 
 * 【注意】
 * 1. このファイルはフロントエンド(src/...)とバックエンド(server/...)の両方で共有されます。
 * 2. territoryUpdated の 'd' 忘れは重大な同期バグを招くため厳禁です。
 * 3. 文字列の直書きは避け、必ずこの定数から参照してください。
 */

// 🚀 クライアント → サーバー (CLIENT_EVENTS)
export const CLIENT_EVENTS = {
  // マッチング・部屋関連
  PLAYER_READY:       "PLAYER_READY",     // 準備完了/解除
  LEAVE_ROOM:         "LEAVE_ROOM",       // 部屋を離れる
  READY_TO_START:     "READY_TO_START",   // (旧) マッチング完了通知

  // 基本移動・占領
  PLAYER_MOVE:        "playerMove",       // 地区移動
  TERRITORY_CLAIMED:  "territoryClaimed", // 地区占領(空き地)

  // バトル・アクション関連
  BATTLE_START:       "battleStart",      // バトル開始要請
  ACTION_SUBMIT:      "actionSubmit",     // アクション送信(攻撃/Stay/防御/逃げる)
  ACTION_ESCAPE:      "actionEscape",     // 逃げる
  ACTION_DEFEND:      "actionDefend",     // 防御

  // アイテム・神関連
  SELECT_GOD:         "SELECT_GOD",       // 神の選択
  ITEM_WARP:          "itemWarp",         // ワープアイテム使用
  ACTION_USE_ITEM:    "ACTION_USE_ITEM",  // 🚀 GDD v3.1: アイテム使用(バフ・デバフ等)

  // 通信・システム関連
  SEND_CHAT:          "SEND_CHAT",        // チャット送信
  ADD_NPC_REQUEST:    "add_npc_request",  // NPC追加リクエスト
};

// 🚀 サーバー → クライアント (SERVER_EVENTS)
export const SERVER_EVENTS = {
  // ルーム・開始関連
  COMMENCE_OPERATION: "COMMENCE_OPERATION", // 🚀 GDD v3.1: 全員準備完了、出撃シークエンス開始
  GAME_START:         "gameStart",          // 試合開始
  GAME_OVER:          "gameOver",           // 試合終了

  // 状態同期 (最重要)
  SYNC_STATE:         "syncState",          // Server State(正の世界)のブロードキャスト
  STATUS_UPDATED:     "statusUpdated",      // パラメータ更新
  TERRITORY_UPDATED:  "territoryUpdated",   // ★GDD v3.1: 領土更新通知（末尾の'd'必須）

  // 個別アクション・移動結果
  PLAYER_MOVED:       "playerMoved",        // 移動結果通知
  BATTLE_RESULT:      "battleResult",       // バトル計算結果
  ACTION_RESULT:      "actionResult",       // アクション受理成功
  ACTION_REJECTED:    "actionRejected",     // アクション拒否（AP不足、不正な場所等）

  // ターン・時間関連
  TURN_START:         "turnStart",          // ターン開始
  NPC_UPDATE:         "npcUpdate",          // NPCの行動同期

  // チャット・ログ・通知
  RECEIVE_CHAT:       "RECEIVE_CHAT",       // チャット受信
  GAME_LOG:           "GAME_LOG",           // バトルログ等の通知
  ERROR_MESSAGE:      "ERROR_MESSAGE",      // システムエラー通知
  PLAYER_DISCONNECTED: "playerDisconnected", // プレイヤー切断
};