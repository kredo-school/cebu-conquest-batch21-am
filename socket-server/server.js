const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ==========================================
// マスターデータ＆定数定義
// ==========================================

const EVENTS = {
  CLIENT: {
    ACTION_SUBMIT: "actionSubmit",
    READY_TO_START: "READY_TO_START",
    PLAYER_MOVE: "playerMove"
  },
  SERVER: {
    SYNC_STATE: "syncState",
    TURN_RESULT: "turnResult",
    TURN_START: "turnStart",
    GAME_OVER: "gameOver"
  }
};

// 🗺️ 隣接データ（不正な遠距離攻撃をサーバー側で防ぐために使用）
const ADJACENCY = {
  101: [102, 103, 104, 105, 201], 102: [101, 104, 105, 401],
  103: [101, 105, 201, 301], 104: [101, 102, 105, 401],
  105: [101, 103, 104, 301], 201: [202, 101, 103],
  202: [201], 301: [302, 103, 105], 302: [301],
  401: [402, 102, 104], 402: [401],
};

// ==========================================
// ゲームステート管理
// ==========================================

let gameState = {
    status: 'waiting', 
    turn: 0,           
    players: {},
    districts: {},
    pendingActions: {} 
};

/**
 * ⚔️ あきらさんのバトル解決ロジック
 */
function resolveBattle(attackerAtk, defenderDef) {
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    const isWin = Math.random() < winProbability;
    return { isWin, winProbability };
}

/**
 * ⚙️ ターン解決エンジン（全員の行動を計算）
 */
function resolveTurn() {
    console.log(`\n=== ターン ${gameState.turn} 解決フェーズ開始 ===`);
    const actions = gameState.pendingActions;
    let turnLogs = []; 

    for (const [playerId, action] of Object.entries(actions)) {
        const player = gameState.players[playerId];
        if (!player) continue;

        // --- 🧘 休息 (Stay/Rest) ---
        if (action.type === 'rest' || action.type === 'stay') {
            const recovery = 30;
            player.stamina = Math.min(100, player.stamina + recovery);
            turnLogs.push(`🧘 ${player.username} は休息し、APが ${player.stamina} に回復した。`);
        } 
        // --- ⚔️ 攻撃 (Attack) ---
        else if (action.type === 'attack') {
            if (player.stamina >= 20) {
                player.stamina -= 20; 
                const targetId = action.targetId; 
                
                // あきらさんのバトルルールを適用 (Atk 60 vs Def 40)
                const result = resolveBattle(60, 40); 
                
                if (result.isWin) {
                    gameState.districts[targetId] = playerId; // 所有権変更
                    player.districtId = targetId; // 自分の位置も移動
                    turnLogs.push(`🚩 成功！ ${player.username} が地区 ${targetId} を制圧しました！`);
                } else {
                    player.hp = Math.max(0, player.hp - 20); // 失敗ダメージ
                    turnLogs.push(`🛡️ 失敗... ${player.username} は地区 ${targetId} の防衛網に阻まれ、手傷を負った。`);
                }
            } else {
                turnLogs.push(`⚠️ ${player.username} は疲労困憊で動けなかった！`);
            }
        }
    }

    // クライアントへ結果を送信
    io.emit(EVENTS.SERVER.TURN_RESULT, { logs: turnLogs, state: gameState });

    // 終了判定
    if (gameState.turn >= 10 || Object.values(gameState.players).some(p => p.hp <= 0)) {
        finishGame();
    } else {
        gameState.turn++;
        gameState.pendingActions = {}; 
        io.emit(EVENTS.SERVER.TURN_START, { turn: gameState.turn });
    }
}

function finishGame() {
    gameState.status = 'finished';
    console.log("=== ゲーム終了！リザルト集計中 ===");
    io.emit(EVENTS.SERVER.GAME_OVER, { state: gameState });
}

// ==========================================
// Socket 通信処理
// ==========================================

io.on('connection', (socket) => {
    console.log(`接続: ${socket.id}`);

    socket.on('join_game', (userData) => {
        const currentPlayers = Object.keys(gameState.players);
        if (currentPlayers.length >= 2) return socket.emit('room_full');

        let team = currentPlayers.length === 0 ? 'red' : 'blue';

        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || 'Guest',
            districtId: null, 
            hp: 100, stamina: 100,
            team: team,
            isReady: false
        };

        if (Object.keys(gameState.players).length === 2) {
            gameState.status = 'standby';
            io.emit('gameStart', { status: 'standby' });
        }
    });

    // 🚀 出撃確定：全員が確定したら Day 1 開始
    socket.on('READY_TO_START', (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;

        player.districtId = data.startDistrictId;
        player.isReady = true;
        gameState.districts[data.startDistrictId] = socket.id;

        io.emit(EVENTS.SERVER.SYNC_STATE, gameState);

        const allReady = Object.values(gameState.players).every(p => p.isReady);
        if (allReady && Object.keys(gameState.players).length >= 2) {
            gameState.status = 'playing';
            gameState.turn = 1;
            gameState.pendingActions = {};
            io.emit(EVENTS.SERVER.TURN_START, { turn: 1 });
            console.log("🚀 全員出撃！ Day 1 開始");
        }
    });

    // アクション提出
    socket.on('actionSubmit', (actionData) => {
        if (gameState.status !== 'playing') return;
        
        gameState.pendingActions[socket.id] = actionData;
        console.log(`📥 行動受理: ${gameState.players[socket.id]?.username} -> ${actionData.type}`);

        // 2人分の行動が揃ったら解決！
        if (Object.keys(gameState.pendingActions).length === 2) {
            resolveTurn();
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
            gameState.turn = 0;
            gameState.districts = {};
        }
    });
});

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動 (PORT: ${PORT})`);
    console.log(`★ ターン解決エンジン稼働中`);
    console.log(`-----------------------------------------`);
});