import { io } from "socket.io-client";

// ★ 魔法のコード：今ブラウザで開いているURLのIP（またはlocalhost）を自動取得
const host = window.location.hostname;
const SOCKET_URL = `http://${host}:3001`;

const socket = io(SOCKET_URL, {
  autoConnect: false,
reconnection: true,
reconnectionAttempts: 5,
reconnectionDelay: 1000,
});

if (import.meta.env.DEV) {
socket.onAny((event, ...args) => {
console.log(`[Socket ← Server] ${event}`, args);
});
socket.onAnyOutgoing((event, ...args) => {
console.log(`[Socket → Server] ${event}`, args);
});
}

socket.on('syncState', (gameState) => {
// PhaserのMainSceneにカスタムイベントで渡す
window.dispatchEvent(new CustomEvent('syncState', { detail: gameState }));
});

export default socket;