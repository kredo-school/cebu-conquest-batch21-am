import { io } from "socket.io-client";
// 🔴 あきらさん指定の定数をインポート（パスは環境に合わせて調整してください）
import { SERVER_EVENTS } from "./game/socketEvents"; 

// ★ 魔法のコード：今ブラウザで開いているURLのIP（またはlocalhost）を自動取得
const host = window.location.hostname;
const SOCKET_URL = `http://${host}:3001`;

const socket = io(SOCKET_URL, {
  autoConnect: false, // LoginViewで手動接続するため false でOK
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// 🛠 開発モード時のログ出力（あきらさんとの連携テストに超便利！）
if (import.meta.env.DEV) {
  socket.onAny((event, ...args) => {
    console.log(`[Socket ← Server] ${event}`, args);
  });
  socket.onAnyOutgoing((event, ...args) => {
    console.log(`[Socket → Server] ${event}`, args);
  });
}

/**
 * 📡 サーバーからの全状態同期を受け取る
 * App.tsx でも処理していますが、Phaser側で直接受け取りたい場合のために
 * カスタムイベントを発火させておきます。
 */
socket.on(SERVER_EVENTS.SYNC_STATE || 'syncState', (gameState) => {
  // 🔴 'syncState' という文字列ではなく、定数を使用
  window.dispatchEvent(new CustomEvent(SERVER_EVENTS.SYNC_STATE || 'syncState', { 
    detail: gameState 
  }));
});

export default socket;