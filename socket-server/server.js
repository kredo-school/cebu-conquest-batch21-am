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
        io.emit('syncState', players);
    });

    // 2. プレイヤー移動
    socket.on('playerMove', (moveData) => {
        if (players[socket.id]) {
            players[socket.id].x = moveData.x;
            players[socket.id].y = moveData.y;

            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y
            });
        }
    });

    // 3. 陣地獲得 (変数名を districtId / owner に修正)
    socket.on('territoryClaimed', (data) => {
        console.log(`陣地獲得イベント: District ${data.districtId} by Owner ${data.owner}`);
        // 全員に通知
        io.emit('territoryUpdated', {
            districtId: data.districtId,
            owner: data.owner,
            team: data.team // 必要に応じて維持
        });
    });

    // 4. バトル開始 (変数名を districtId に修正 / loserId, hpDamage を追加)
    socket.on('battleStart', (battleData) => {
        console.log('バトル開始:', battleData);
        // バトル結果の計算ロジック（仮）を返却
        io.emit('battleResult', {
            winnerId: battleData.attackerId,
            loserId: battleData.defenderId, // 追加
            districtId: battleData.districtId, // 修正
            hpDamage: 20 // 仮の値
        });
    });

    // --- 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`ユーザー切断: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中`);
    console.log(`PORT: ${PORT}`);
    console.log(`イベント・変数名: districtId 仕様へアップデート済`);
    console.log(`-----------------------------------------`);
});