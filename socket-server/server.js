const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS設定: Vite/Reactフロントエンドからのアクセスを許可
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// サーバー側で保持する【正の世界（Server State）】
const gameState = {
  players: {}, // { socketId: { x, y, color, playerId } }
  territories: {} // { territoryId: { ownerId, color } }
};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // 新規プレイヤーの初期状態をセット
  gameState.players[socket.id] = {
    x: 0,
    y: 0,
    color: 'red', // 初期テスト用
    playerId: socket.id
  };

  // 1. 接続した本人に現在の全体ステートを送信
  socket.emit('current_state', gameState);

  // 2. 他の全プレイヤーに新規プレイヤーが参加したことを通知
  socket.broadcast.emit('player_joined', gameState.players[socket.id]);

  // プレイヤーの移動イベントを受信
  socket.on('player_move', (moveData) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].x = moveData.x;
      gameState.players[socket.id].y = moveData.y;
      io.emit('state_update', gameState);
    }
  });

  // 陣地獲得イベントを受信
  socket.on('territory_claimed', (data) => {
    gameState.territories[data.territoryId] = {
      ownerId: socket.id,
      color: gameState.players[socket.id].color
    };
    io.emit('territory_update', gameState.territories);
  });

  // 切断時の処理
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete gameState.players[socket.id];
    io.emit('player_left', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});