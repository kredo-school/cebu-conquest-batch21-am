const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ゲーム全体の状態
let gameState = {
    status: 'waiting', // waiting -> standby -> playing -> finished
    turn: 0,           // 0: Standby, 1-10: Playing
    players: {},
    districts: {},
    pendingActions: {} 
};

// バトル解決ロジック
function resolveBattle(attackerAtk, defenderDef) {
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    const isWin = Math.random() < winProbability;
    return { isWin, winProbability };
}

// --- ターン終了＆アクション一斉解決エンジン ---
function resolveTurn() {
    console.log(`\n=== ターン ${gameState.turn} 解決フェーズ ===`);
    const actions = gameState.pendingActions;
    let turnLogs = []; 

    for (const [playerId, action] of Object.entries(actions)) {
        const player = gameState.players[playerId];
        if (!player) continue;

        if (action.type === 'rest' || action.type === 'stay') {
            player.stamina = Math.min(100, player.stamina + 30);
            turnLogs.push(`💤 ${player.username} は休息し、APを回復した。`);
        } 
        else if (action.type === 'attack') {
            if (player.stamina >= 20) {
                player.stamina -= 20; 
                const targetId = action.targetId; 
                
                const result = resolveBattle(60, 40); 
                
                if (result.isWin) {
                    gameState.districts[targetId] = playerId;
                    turnLogs.push(`⚔️ ${player.username} が地区 ${targetId} を獲得しました！`);
                    
                    io.emit('territoryUpdated', {
                        districtId: targetId,
                        owner: playerId,
                        team: player.team 
                    });
                } else {
                    player.hp = Math.max(0, player.hp - 20);
                    turnLogs.push(`🛡️ ${player.username} は地区 ${targetId} の制圧に失敗し、ダメージを受けた...`);
                }
            } else {
                turnLogs.push(`⚠️ ${player.username} はスタミナ不足で動けなかった！`);
            }
        }
    }

    io.emit('turnResult', { logs: turnLogs, state: gameState });

    if (gameState.turn >= 10) {
        console.log("=== ゲーム終了！勝敗判定 ===");
        let scores = {};
        for (const district in gameState.districts) {
            const owner = gameState.districts[district];
            scores[owner] = (scores[owner] || 0) + 1;
        }

        let winnerId = null;
        let maxScore = -1;
        for (const [pId, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                winnerId = pId;
            }
        }

        gameState.status = 'finished';
        io.emit('gameOver', { winnerId: winnerId, scores: scores });
    } else {
        gameState.turn++;
        gameState.pendingActions = {}; 
        io.emit('turnStart', { turn: gameState.turn });
    }
}

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

    // --- 1. ゲーム参加 ---
    socket.on('join_game', (userData) => {
        const currentPlayers = Object.keys(gameState.players);

        if (currentPlayers.length >= 2 && !gameState.players[socket.id]) {
            socket.emit('room_full', { message: 'ルーム満員です。' });
            return;
        }

        let assignedTeam = 'red'; 
        if (currentPlayers.length === 1) {
            const existingPlayer = gameState.players[currentPlayers[0]];
            assignedTeam = existingPlayer.team === 'red' ? 'blue' : 'red';
        }

        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            districtId: null, 
            hp: 100, stamina: 100,
            team: assignedTeam,
            isReady: false // 出撃地点確定フラグ
        };

        console.log(`参加: ${gameState.players[socket.id].username} [${assignedTeam}]`);

        // 2人揃ったら「Standby（地点選択）」状態へ
        if (Object.keys(gameState.players).length === 2) {
            gameState.status = 'standby';
            io.emit('gameStart', { status: 'standby' });
            console.log("★ 2名揃いました。地点選択（Standby）開始");
        }
    });

    // --- 🔴 2. 【新規】出撃確定 (READY_TO_START) ---
    socket.on('READY_TO_START', (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;

        const { startDistrictId } = data;
        console.log(`[READY] ${player.username} が地区 ${startDistrictId} を選択`);

        // サーバー側の状態更新
        player.districtId = startDistrictId;
        player.isReady = true;
        gameState.districts[startDistrictId] = socket.id; // 初期拠点の所有権登録

        // 全員に現在の地区所有状況を同期
        io.emit('syncState', gameState);

        // 全プレイヤー（2名）が準備完了したら Day 1 開始！
        const allReady = Object.values(gameState.players).every(p => p.isReady);
        if (allReady && Object.keys(gameState.players).length === 2) {
            gameState.status = 'playing';
            gameState.turn = 1;
            gameState.pendingActions = {};
            console.log("🚀 全員出撃完了！ Day 1 スタート！");
            io.emit('turnStart', { turn: 1 });
        }
    });

    // --- 3. プレイヤー移動 ---
    socket.on('playerMove', (moveData) => { 
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = moveData.x;
            gameState.players[socket.id].y = moveData.y;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: moveData.x, y: moveData.y });
        }
    });

    // --- 4. アクション提出 ---
    socket.on('actionSubmit', (actionData) => {
        if (gameState.status !== 'playing') return;

        console.log(`[TURN ${gameState.turn}] Player ${socket.id} アクション: ${actionData.type}`);
        gameState.pendingActions[socket.id] = actionData;
        
        io.emit('playerReady', { socketId: socket.id });

        if (Object.keys(gameState.pendingActions).length === 2) {
            resolveTurn();
        }
    });

    // --- 5. 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`切断: ${socket.id}`);
        delete gameState.players[socket.id];
        delete gameState.pendingActions[socket.id];
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
            gameState.turn = 0;
            gameState.districts = {}; // リセット
        }
        io.emit('playerDisconnected', socket.id);
    });
});

// 定期的な同期
setInterval(() => {
    if (Object.keys(gameState.players).length > 0) io.emit('syncState', gameState);
}, 1000);

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中 (PORT: ${PORT})`);
    console.log(`★ 10ターン制・出撃同期ロジック実装済み`);
    console.log(`-----------------------------------------`);
});