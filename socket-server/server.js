const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ポートを3001に統一
const PORT = 3001;

// CORS設定: クライアント側(5173等)からのアクセスを許可
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:8000"],
        methods: ["GET", "POST"]
    }
});

// ゲームの状態（プレイヤー情報）を保持
let players = {};

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

    // --- 受信イベント (クライアント → サーバー) ---

    // 1. ゲーム参加
    socket.on('join_game', (userData) => {
        players[socket.id] = {
            id: socket.id,
            userId: userData.userId,
            username: userData.username,
            x: userData.x || 0,
            y: userData.y || 0,
            team: userData.team || 'neutral'
        };
        // 全員に現在の全プレイヤー状態を同期 (syncStateに名称変更)
        io.emit('syncState', players);
    });

    // 2. プレイヤー移動 (playerMoveに変更)
    socket.on('playerMove', (moveData) => {
        if (players[socket.id]) {
            players[socket.id].x = moveData.x;
            players[socket.id].y = moveData.y;

            // 送信者以外に移動を通知 (playerMovedに変更)
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y
            });
        }
    });

    // 3. 陣地獲得 (territoryClaimedを追加)
    socket.on('territoryClaimed', (data) => {
        console.log(`陣地獲得イベント: Area ${data.areaId} by User ${data.userId}`);
        // 全員に通知
        io.emit('territoryUpdated', {
            areaId: data.areaId,
            ownerId: data.userId,
            team: data.team
        });
    });

    // 4. バトル開始 (battleStartに変更)
    socket.on('battleStart', (battleData) => {
        console.log('バトル開始:', battleData);
        // バトル結果の計算ロジック（仮）を返却
        io.emit('battleResult', {
            winnerId: battleData.attackerId, // 現状は攻撃側勝利のモック
            areaId: battleData.areaId
        });
    });

    // --- 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`ユーザー切断: ${socket.id}`);
        delete players[socket.id];
        // 誰かがいなくなったことを全員に通知
        io.emit('playerDisconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中`);
    console.log(`PORT: ${PORT}`);
    console.log(`イベント名: socketEvents.js 準拠にアップデート済`);
    console.log(`-----------------------------------------`);
});