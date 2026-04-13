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

const EVENTS = {
    CLIENT: CLIENT_EVENTS,
    SERVER: SERVER_EVENTS
};

const SPOT_COORDS = {
    10011: { x: 320, y: 480 }, 
    10012: { x: 350, y: 500 }, 
    20000: { x: 800, y: 200 }  
};

const TOTAL_DISTRICTS = 11; 

// ==========================================
// ゲームステート管理
// ==========================================

let gameState = {
    status: 'waiting', 
    turn: 1, 
    maxTurn: 10,
    turnOwnerId: null,
    firstPlayerId: null,
    players: {},
    districts: {}
};

function resolveBattle(attackerAtk, defenderDef) {
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    const isWin = Math.random() < winProbability;
    return { isWin, winProbability };
}

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

// 🚀 修正：Task No.33 要件に基づきリザルトデータを詳細化
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
                winnerId = "draw"; 
            }
        }
    }

    const winnerName = (winnerId !== "draw" && gameState.players[winnerId]) 
        ? gameState.players[winnerId].username 
        : "DRAW (引き分け)";

    // フロントの ResultView.tsx へ詳細データを送信
    io.emit(EVENTS.SERVER.GAME_OVER, { 
        status: 'finished',
        winnerId: winnerId, 
        winnerName: winnerName,
        scores: scores,
        mvp: winnerName,
        districts: gameState.districts 
    });
}

// ==========================================
// Socket 通信処理
// ==========================================

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

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
            console.log("★ 2名揃いました。地点選択（Standby）開始");
        }
    });

    socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;

        const { startDistrictId } = data;
        player.districtId = startDistrictId;
        player.isReady = true;
        gameState.districts[startDistrictId] = socket.id; 

        io.emit(EVENTS.SERVER.SYNC_STATE, gameState);

        const allReady = Object.values(gameState.players).every(p => p.isReady);
        if (allReady && Object.keys(gameState.players).length === 2) {
            gameState.status = 'playing';
            gameState.turn = 1;
            const playerIds = Object.keys(gameState.players);
            gameState.firstPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
            gameState.turnOwnerId = gameState.firstPlayerId;

            io.emit(EVENTS.SERVER.TURN_START, { 
                turn: 1, 
                turnOwnerId: gameState.turnOwnerId 
            });
        }
    });

    socket.on(EVENTS.CLIENT.PLAYER_MOVE, (moveData) => { 
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = moveData.x;
            gameState.players[socket.id].y = moveData.y;
            socket.broadcast.emit(EVENTS.SERVER.PLAYER_MOVED, { id: socket.id, x: moveData.x, y: moveData.y });
        }
    });

    socket.on(EVENTS.CLIENT.ACTION_SUBMIT, (actionData) => {
        if (gameState.status !== 'playing') return;
        if (socket.id !== gameState.turnOwnerId) {
            socket.emit(EVENTS.SERVER.ACTION_REJECTED, { message: "相手のターンです！" });
            return;
        }

        const player = gameState.players[socket.id];
        let turnLogs = [];

        // 🚀 修正：防御・逃げる・休息の分岐処理を追加
        switch (actionData.type) {
            case 'stay':
            case 'rest':
                player.stamina = Math.min(100, player.stamina + 20);
                turnLogs.push(`💤 ${player.username} は休息し、APを20回復した。`);
                break;

            case 'defend': // 🛡️ 防御
                player.def += 10;
                turnLogs.push(`🛡️ ${player.username} は防御姿勢をとった！（DEF+10）`);
                break;

            case 'escape': // 🏃 逃走
                player.stamina = Math.max(0, player.stamina - 5);
                turnLogs.push(`🏃 ${player.username} は緊急離脱を試みた！`);
                break;

            case 'attack': // ⚔️ 攻撃
                const cost = 20;
                if (player.stamina >= cost) {
                    player.stamina -= cost;
                    const targetId = actionData.targetId;
                    const defenderId = gameState.districts[targetId];
                    let targetDef = defenderId ? gameState.players[defenderId].def : 40;

                    const result = resolveBattle(player.atk, targetDef);
                    if (result.isWin) {
                        gameState.districts[targetId] = socket.id;
                        turnLogs.push(`⚔️ ${player.username} が地区 ${targetId} を制圧！`);
                        io.emit(EVENTS.SERVER.TERRITORY_UPDATED, { districtId: targetId, owner: socket.id, team: player.team });
                        checkCompleteDomination();
                    } else {
                        player.hp = Math.max(0, player.hp - 20);
                        turnLogs.push(`🛡️ ${player.username} は制圧に失敗し、ダメージを受けた！`);
                    }
                } else {
                    socket.emit(EVENTS.SERVER.ACTION_REJECTED, { message: "スタミナ不足です！" });
                    return;
                }
                break;
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
        io.emit('playerDisconnected', socket.id);
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
    console.log(`★ Week 3 要件統合済みロジック稼働中`);
    console.log(`-----------------------------------------`);
});