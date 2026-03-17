import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

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

export default socket;