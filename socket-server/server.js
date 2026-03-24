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
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ==========================================
// ゲームロジック・ステート管理
// ==========================================

// ゲーム全体の状態（あきらさん要望のペイロード構造）
let gameState = {
    status: 'waiting', // 'waiting' または 'playing'
    turn: 1,           // 現在のターン(Day)
    players: {},       // 各プレイヤーのステータスと座標
    districts: {}      // 陣地の占領情報 { "地区ID": "オーナーのSocketID" }
};

/**
 * バトル判定ロジック (要件定義: A / (A+D))
 */
function resolveBattle(attackerAtk, defenderDef) {
    // 勝率(P)を計算
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    // 0〜1の乱数を生成し、勝率と比較して勝敗を決定
    const isWin = Math.random() < winProbability;
    return { isWin, winProbability };
}

// ==========================================
// Socket.IO 通信ハンドラ
// ==========================================

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

    // --- 1. ゲーム参加 ---
    socket.on('join_game', (userData) => {
        // プレイヤー初期化 (HP 100 をセット)
        gameState.players[socket.id] = {
            id: socket.id,
            userId: userData?.userId || socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            x: userData?.x || 0,
            y: userData?.y || 0,
            districtId: null, 
            hp: 100,          
            team: userData?.team || 'neutral'
        };

        console.log(`参加者: ${gameState.players[socket.id].username} (現在: ${Object.keys(gameState.players).length}名)`);

        // 2人以上揃ったらゲーム開始
        const playerCount = Object.keys(gameState.players).length;
        if (playerCount >= 2 && gameState.status === 'waiting') {
            gameState.status = 'playing';
            console.log(`★ 2名揃いました！セブとり合戦、開始！`);
            io.emit('gameStart', { 
                startTime: Date.now(),
                status: gameState.status 
            });
        }
    });

    // --- 2. プレイヤー移動 ---
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

    // --- 3. 陣地獲得 (非戦闘での取得) ---
    socket.on('territoryClaimed', (data) => {
        console.log(`陣地獲得: District ${data.districtId} by ${data.owner}`);
        gameState.districts[data.districtId] = data.owner; // サーバーの正解データを更新
        
        io.emit('territoryUpdated', {
            districtId: data.districtId,
            owner: data.owner,
            team: data.team
        });
    });

    // --- 4. バトル開始と勝敗計算 ---
    socket.on('battleStart', (battleData) => {
        console.log(`[BATTLE] District ${battleData.districtId} でバトル開始！`);

        // ※本来は装備や特産品から動的に取得するが、今はテスト用固定値
        const attackerAtk = 60; 
        const defenderDef = 40; 

        // サーバー側で勝敗を計算
        const result = resolveBattle(attackerAtk, defenderDef);
        
        const hpDamage = 20; // 1回の敗北で減るHP
        let winnerId = "";
        let loserId = "";

        if (result.isWin) {
            // 攻撃側の勝利
            winnerId = battleData.attackerId;
            loserId = battleData.defenderId;
            // 陣地を奪取
            gameState.districts[battleData.districtId] = winnerId;
        } else {
            // 防衛側の勝利
            winnerId = battleData.defenderId;
            loserId = battleData.attackerId;
        }

        // 負けたプレイヤーのHPをサーバー側でも減らす
        if (gameState.players[loserId]) {
            gameState.players[loserId].hp -= hpDamage;
        }

        // 全員に結果を通知
        io.emit('battleResult', {
            winnerId: winnerId,
            loserId: loserId,
            districtId: battleData.districtId,
            hpDamage: hpDamage,
            winProbability: (result.winProbability * 100).toFixed(1) // %表記で送信
        });

        console.log(`[RESULT] 勝者: ${winnerId} (攻撃側勝率: ${(result.winProbability * 100).toFixed(1)}%)`);
    });

    // --- 5. 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`ユーザー切断: ${socket.id}`);
        delete gameState.players[socket.id];
        
        // 1人以下になったら待機状態に戻す
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
        }
        io.emit('playerDisconnected', socket.id);
    });
});

// ==========================================
// 定周期ブロードキャスト (Tick Rate: 1秒)
// ==========================================
setInterval(() => {
    if (Object.keys(gameState.players).length > 0) {
        io.emit('syncState', gameState);
    }
}, 1000);

// ==========================================
// サーバー起動
// ==========================================
server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中`);
    console.log(`PORT: ${PORT}`);
    console.log(`★ サーバー側バトル計算ロジック(A/(A+D)) 搭載版`);
    console.log(`-----------------------------------------`);
});