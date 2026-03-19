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

// ゲーム全体の状態を管理（Room管理用）
let gameState = {
    status: 'waiting', // 'waiting' (待機中) または 'playing' (プレイ中)
    players: {},
    districts: {}      
};

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

    // --- 受信イベント (クライアント → サーバー) ---

    // 1. ゲーム参加
    socket.on('join_game', (userData) => {
        gameState.players[socket.id] = {
            id: socket.id,
            userId: userData?.userId || socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            x: userData?.x || 0,
            y: userData?.y || 0,
            team: userData?.team || 'neutral'
        };

        console.log(`${gameState.players[socket.id].username} が入室。現在: ${Object.keys(gameState.players).length}名`);

        // ★ 木曜タスク：2人揃ったらゲーム開始！
        if (Object.keys(gameState.players).length === 2 && gameState.status === 'waiting') {
            gameState.status = 'playing';
            console.log('★ 2名揃いました！セブとり合戦、開始！ ★');
            // 全員にゲーム開始を通知
            io.emit('gameStart', { status: gameState.status });
        }
    });

    // 2. プレイヤー移動
    socket.on('playerMove', (moveData) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = moveData.x;
            gameState.players[socket.id].y = moveData.y;

            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x: moveData.x,
                y: moveData.y
            });
        }
    });

    // 3. 陣地獲得
    socket.on('territoryClaimed', (data) => {
        console.log(`陣地獲得イベント: District ${data.districtId} by Owner ${data.owner}`);
        io.emit('territoryUpdated', {
            districtId: data.districtId,
            owner: data.owner,
            team: data.team
        });
    });

    // 4. バトル開始
    socket.on('battleStart', (battleData) => {
        console.log('バトル開始:', battleData);
        io.emit('battleResult', {
            winnerId: battleData.attackerId,
            loserId: battleData.defenderId,
            districtId: battleData.districtId,
            hpDamage: 20
        });
    });

    // --- 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`ユーザー切断: ${socket.id}`);
        delete gameState.players[socket.id];
        
        // ★ 1人以下になったら待機状態に戻す
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
            console.log('プレイヤーが退出したため、待機状態に戻ります。');
        }
        io.emit('playerDisconnected', socket.id);
    });
});

// ★ 木曜タスク：1秒間隔で gameState を全クライアントに同期
setInterval(() => {
    if (Object.keys(gameState.players).length > 0) {
        io.emit('syncState', gameState);
    }
}, 1000);

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中`);
    console.log(`PORT: ${PORT}`);
    console.log(`Room管理・定周期ブロードキャスト 実装完了`);
    console.log(`-----------------------------------------`);
});