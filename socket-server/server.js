const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS設定: Vite(5173)とPHP(8000等)からのアクセスを許可
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:8000"],
        methods: ["GET", "POST"]
    }
});

// 接続中のプレイヤー情報を保持するオブジェクト（任意）
const players = {};

io.on('connection', (socket) => {
    console.log(`ユーザーが接続しました: ${socket.id}`);

    // 1. プレイヤーがゲームに参加したときの処理
    socket.on('join_game', (userData) => {
        players[socket.id] = {
            id: socket.id,
            userId: userData.userId,
            username: userData.username,
            x: userData.x || 0,
            y: userData.y || 0
        };
        // 全員に新しいプレイヤーが来たことを通知
        io.emit('current_players', players);
    });

    // 2. プレイヤー移動の受信と配信 (けいさんの担当部分)
    socket.on('player_move', (moveData) => {
        // moveData = { x: 100, y: 200 }
        if (players[socket.id]) {
            players[socket.id].x = moveData.x;
            players[socket.id].y = moveData.y;

            // 送信者以外の全員に「この人が動いたよ」と通知
            socket.broadcast.emit('player_moved', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y
            });
        }
    });

    // 3. 切断時の処理
    socket.on('disconnect', () => {
        console.log(`ユーザーが切断しました: ${socket.id}`);
        delete players[socket.id];
        // 全員に誰かが消えたことを通知
        io.emit('player_disconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Socket.IOサーバーがポート ${PORT} で起動しました`);
});