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

// ★ 変更点①：players 変数をやめて、ゲーム全体の状態（gameState）で管理する
let gameState = {
    status: 'waiting', // 進行状態
    turn: 1,           // 現在のターン(Day)
    players: {},       // プレイヤー情報
    districts: {}      // 陣地の占領情報
};

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

    // --- 受信イベント (クライアント → サーバー) ---

    // 1. ゲーム参加
    socket.on('join_game', (userData) => {
        // ★ 変更点②：gameState.players の中に保存し、hp と districtId を追加
        gameState.players[socket.id] = {
            id: socket.id,
            userId: userData.userId,
            username: userData.username,
            x: userData.x || 0,
            y: userData.y || 0,
            districtId: null, // 現在いる地区
            hp: 100,          // 初期HP
            team: userData.team || 'neutral'
        };

        console.log(`参加者: ${userData.username} (Team: ${userData.team})`);

        // 2人以上揃ったら「開始合図」を送る
        const playerCount = Object.keys(gameState.players).length;
        if (playerCount >= 2 && gameState.status === 'waiting') {
            gameState.status = 'playing'; // 状態をプレイ中に変更
            console.log(`人数が揃いました (${playerCount}人)。ゲーム開始信号を送信します！`);
            io.emit('gameStart', { 
                startTime: Date.now(),
                message: "Battle Start!" 
            });
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
        
        // ★ 変更点③：サーバー上の正の世界（districts）も更新する
        gameState.districts[data.districtId] = data.owner;

        // 全員に通知
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
            hpDamage: 20 // 仮の値
        });
    });

    // --- 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`ユーザー切断: ${socket.id}`);
        delete gameState.players[socket.id]; // 退出した人を削除
        
        // 1人以下になったら待機状態に戻す
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
        }

        io.emit('playerDisconnected', socket.id);
    });
});

// ★ 変更点④：あきらさんの要望。1秒間隔で gameState を全クライアントにブロードキャスト
setInterval(() => {
    // 誰か1人でも接続している場合のみ送信
    if (Object.keys(gameState.players).length > 0) {
        io.emit('syncState', gameState);
    }
}, 1000);

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中`);
    console.log(`PORT: ${PORT}`);
    console.log(`★ ペイロード構造アップデート完了 (gameState)`);
    console.log(`-----------------------------------------`);
});