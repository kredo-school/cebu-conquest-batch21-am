import { io } from "socket.io-client";
// ✅ GDD v3.1 準拠：共有フォルダ(shared)からイベント名を取得
import { SERVER_EVENTS } from "../shared/socketEvents.js";

/**
 * 🚀 サーバーURLの設定
 * window.location.hostname を使用することで、ローカルPCでもセブの寮のLAN内でも
 * 設定変更なしで接続可能になります。
 */
const host = window.location.hostname;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${host}:3001`;

/**
 * 🛰️ Socket.IO インスタンスの生成
 * autoConnect: false に設定し、LoginView での認証成功後に明示的に connect() します。
 */
const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  // BUG-008: websocket優先だがFW環境のフォールバックとして polling も許可
  transports: ["websocket", "polling"],
});

/**
 * 🛠️ 開発モード用デバッグログ
 * 通信の不具合（イベント名の間違いなど）をコンソールですぐに特定できるようにします。
 */
if (import.meta.env.DEV) {
  socket.onAny((event, ...args) => {
    console.log(`%c[Socket ← Server] ${event}`, "color: #00ff00; font-weight: bold;", args);
  });
  socket.onAnyOutgoing((event, ...args) => {
    console.log(`%c[Socket → Server] ${event}`, "color: #0099ff; font-weight: bold;", args);
  });
}

export default socket;