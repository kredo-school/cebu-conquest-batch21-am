import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/socketEvents.js';

const app = express();
const server = http.createServer(app);
const PORT = 3001;

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ==========================================
// マスターデータ＆定数定義
// ==========================================

// 💡 インポートしたイベント定数を、既存のコード内で使いやすいようにまとめる
// （長々としたローカル定義は消え、スッキリしました！）
const EVENTS = {
  CLIENT: CLIENT_EVENTS,
  SERVER: SERVER_EVENTS
};

const SPOT_COORDS = {
  10011: { x: 320, y: 480 }, 
  10012: { x: 350, y: 500 }, 
  20000: { x: 800, y: 200 }  
};

const TOTAL_DISTRICTS = 11; // 勝利条件判定用：全11地区

// ==========================================
// ゲームステート管理 (Week 1: 交互ターン制)
// ==========================================

let gameState = {
    status: 'waiting',   // waiting -> standby -> playing -> finished
    turn: 1,             // 現在のターン数 (1〜10)
    maxTurn: 10,         // 最大ターン数
    turnOwnerId: null,   // 現在ターンのプレイヤーの socket.id
    firstPlayerId: null, // 先攻プレイヤー (ターン数カウント進行用)
    players: {},
    districts: {}
};

// バトル解決ロジック（サーバー側で実際のステータスを使って計算）
function resolveBattle(attackerAtk, defenderDef) {
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    const isWin = Math.random() < winProbability;
    return { isWin, winProbability };
}

// 11地区完全制覇チェック
function checkCompleteDomination() {
    const owners = Object.values(gameState.districts);
    if (owners.length === TOTAL_DISTRICTS) {
        const firstOwner = owners[0];
        const allOwnedByOne = owners.every(owner => owner === firstOwner);
        if (allOwnedByOne) {
            console.log(`🎊 ${gameState.players[firstOwner]?.username} が全11地区を完全制覇！`);
            endGame(firstOwner);
        }
    }
}

// ゲーム終了＆勝敗判定処理
function endGame(winnerId = null) {
    gameState.status = 'finished';
    console.log("=== ゲーム終了！ 勝敗判定 ===");
    
    let scores = {};
    for (const district in gameState.districts) {
        const owner = gameState.districts[district];
        scores[owner] = (scores[owner] || 0) + 1;
    }

    if (!winnerId) {
        let maxScore = -1;
        for (const [pId, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                winnerId = pId;
            } else if (score === maxScore) {
                winnerId = "draw"; // 占有地区数が同じ場合は引き分け
            }
        }
    }

    io.emit(EVENTS.SERVER.GAME_OVER, { winnerId: winnerId, scores: scores });
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

        // 初期ステータスの設定
        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || 'Guest',
            districtId: null, 
            hp: 100, 
            stamina: 100, 
            atk: 60,      
            def: 40,      
            team: assignedTeam,
            isReady: false 
        };

        console.log(`参加: ${gameState.players[socket.id].username} [${assignedTeam}]`);

        if (Object.keys(gameState.players).length === 2) {
            gameState.status = 'standby';
            io.emit('gameStart', { status: 'standby' });
        }
    });

    // --- 2. 出撃確定 (READY_TO_START) ---
    socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;

        const { startDistrictId } = data;
        console.log(`[READY] ${player.username} が地区 ${startDistrictId} を選択`);

        player.districtId = startDistrictId;
        player.isReady = true;
        gameState.districts[startDistrictId] = socket.id; 

        io.emit(EVENTS.SERVER.SYNC_STATE, gameState);

        // 全員出撃完了したら Day 1 開始！
        const allReady = Object.values(gameState.players).every(p => p.isReady);
        if (allReady && Object.keys(gameState.players).length >= 2) {
            gameState.status = 'playing';
            gameState.turn = 1;
            
            // 先攻をランダムに決定
            const playerIds = Object.keys(gameState.players);
            gameState.firstPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
            gameState.turnOwnerId = gameState.firstPlayerId;

            console.log(`🚀 Day 1 スタート！ 先攻: ${gameState.players[gameState.turnOwnerId].username}`);
            io.emit(EVENTS.SERVER.TURN_START, { 
                turn: 1, 
                turnOwnerId: gameState.turnOwnerId 
            });
        }
    });

    // --- 3. プレイヤー移動 ---
    socket.on(EVENTS.CLIENT.PLAYER_MOVE, (moveData) => { 
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = moveData.x;
            gameState.players[socket.id].y = moveData.y;
            socket.broadcast.emit(EVENTS.SERVER.PLAYER_MOVED, { id: socket.id, x: moveData.x, y: moveData.y });
        }
    });

    // --- 4. アクション提出 (ターン処理エンジン) ---
    socket.on(EVENTS.CLIENT.ACTION_SUBMIT, (actionData) => {
        if (gameState.status !== 'playing') return;

        if (socket.id !== gameState.turnOwnerId) {
            socket.emit(EVENTS.SERVER.ACTION_REJECTED, { message: "相手のターンです！" });
            return;
        }

        const player = gameState.players[socket.id];
        let turnLogs = [];

        if (player.stamina <= 0 && actionData.type !== 'rest' && actionData.type !== 'stay') {
            socket.emit(EVENTS.SERVER.ACTION_REJECTED, { message: "スタミナ不足で行動できません！" });
            return;
        }

        if (actionData.type === 'rest' || actionData.type === 'stay') {
            player.stamina = Math.min(100, player.stamina + 10);
            turnLogs.push(`💤 ${player.username} は休息し、APを回復した。`);
        } 
        else if (actionData.type === 'attack') {
            const cost = 10;
            if (player.stamina >= cost) {
                player.stamina -= cost;
                const targetId = actionData.targetId;
                const defenderId = gameState.districts[targetId];
                
                let targetDef = 40; 
                if (defenderId && gameState.players[defenderId]) {
                    targetDef = gameState.players[defenderId].def;
                }

                const result = resolveBattle(player.atk, targetDef);

                if (result.isWin) {
                    gameState.districts[targetId] = socket.id;
                    turnLogs.push(`⚔️ ${player.username} が地区 ${targetId} を制圧！`);
                    io.emit(EVENTS.SERVER.TERRITORY_UPDATED, { districtId: targetId, owner: socket.id, team: player.team });
                    
                    checkCompleteDomination();
                } else {
                    player.hp = Math.max(0, player.hp - 20);
                    turnLogs.push(`🛡️ ${player.username} は制圧に失敗し、ダメージを受けた...`);
                }

                io.emit(EVENTS.SERVER.BATTLE_RESULT, {
                    winnerId: result.isWin ? socket.id : (defenderId || 'npc'),
                    loserId: result.isWin ? (defenderId || 'npc') : socket.id,
                    targetDistrict: targetId,
                    damage: result.isWin ? 0 : 20
                });

            } else {
                socket.emit(EVENTS.SERVER.ACTION_REJECTED, { message: "スタミナ不足です！" });
                return;
            }
        }

        io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });

        // --- ターン交代処理 ---
        if (gameState.status === 'playing') {
            const playerIds = Object.keys(gameState.players);
            const nextPlayerId = playerIds.find(id => id !== socket.id);
            
            gameState.turnOwnerId = nextPlayerId;

            if (gameState.turnOwnerId === gameState.firstPlayerId) {
                gameState.turn++;
            }

            if (gameState.turn > gameState.maxTurn) {
                endGame();
            } else {
                io.emit(EVENTS.SERVER.TURN_START, { 
                    turn: gameState.turn, 
                    turnOwnerId: gameState.turnOwnerId 
                });
            }
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
            gameState.turn = 1;
            gameState.districts = {};
        }
    });
});

setInterval(() => {
    if (Object.keys(gameState.players).length > 0) {
        io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
    }
}, 1000);

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中 (PORT: ${PORT})`);
    console.log(`★ ESM化完了！共有定数によるターン制ロジック稼働中`);
    console.log(`-----------------------------------------`);
});