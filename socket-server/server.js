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

const EVENTS = {
    CLIENT: CLIENT_EVENTS,
    SERVER: SERVER_EVENTS
};

const TOTAL_DISTRICTS = 11; 

let gameState = {
    status: 'waiting', 
    turn: 0,             
    maxTurn: 10,
    turnOwnerId: null,
    firstPlayerId: null,
    players: {},
    districts: {}
};

function resolveBattle(attackerAtk, defenderDef) {
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    return { isWin: Math.random() < winProbability };
}

function checkCompleteDomination() {
    const owners = Object.values(gameState.districts);
    if (owners.length === TOTAL_DISTRICTS) {
        const firstOwner = owners[0];
        const allOwnedByOne = owners.every(owner => owner === firstOwner);
        if (allOwnedByOne) endGame(firstOwner);
    }
}

function endGame(winnerId = null) {
    gameState.status = 'finished';
    console.log("=== 🏆 ゲーム終了 ===");
    let scores = {};
    for (const district in gameState.districts) {
        const owner = gameState.districts[district];
        scores[owner] = (scores[owner] || 0) + 1;
    }
    const winnerName = (winnerId !== "draw" && gameState.players[winnerId]) 
        ? gameState.players[winnerId].username : "DRAW (引き分け)";

    io.emit(EVENTS.SERVER.GAME_OVER, { 
        status: 'finished', winnerId, winnerName, scores, districts: gameState.districts 
    });
}

io.on('connection', (socket) => {
    console.log(`📡 ユーザー接続: ${socket.id}`);

    socket.on('join_game', (userData) => {
        const currentPlayers = Object.keys(gameState.players);
        if (currentPlayers.length >= 2 && !gameState.players[socket.id]) return;

        let assignedTeam = currentPlayers.length === 0 ? 'red' : 'blue';
        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            districtId: null, hp: 100, stamina: 100, atk: 60, def: 40,
            team: assignedTeam, isReady: false 
        };

        if (Object.keys(gameState.players).length === 2) {
            gameState.status = 'standby';
            io.emit('gameStart', { status: 'standby' });
        }
    });

    socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;
        player.districtId = data.startDistrictId;
        player.isReady = true;
        gameState.districts[data.startDistrictId] = socket.id; 

        const playerIds = Object.keys(gameState.players);
        if (playerIds.length === 2 && playerIds.every(id => gameState.players[id].isReady)) {
            gameState.status = 'playing';
            gameState.turn = 1;
            gameState.firstPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
            gameState.turnOwnerId = gameState.firstPlayerId;
            io.emit(EVENTS.SERVER.TURN_START, { 
                turn: 1, turnOwnerId: gameState.turnOwnerId, turnOwnerName: gameState.players[gameState.turnOwnerId].username 
            });
            // 🚀 全員に初期状態を同期
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
        }
    });

    socket.on("TURN_END_SUBMIT", () => {
        if (socket.id !== gameState.turnOwnerId) return;
        const playerIds = Object.keys(gameState.players);
        const nextPlayerId = playerIds.find(id => id !== socket.id);
        
        gameState.turnOwnerId = nextPlayerId;
        if (gameState.turnOwnerId === gameState.firstPlayerId) gameState.turn++;

        if (gameState.turn > gameState.maxTurn) {
            endGame();
        } else {
            io.emit(EVENTS.SERVER.TURN_START, { 
                turn: gameState.turn, 
                turnOwnerId: gameState.turnOwnerId,
                turnOwnerName: gameState.players[gameState.turnOwnerId]?.username
            });
            // 🚀 交代のタイミングで地図データを全員に強制同期
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
        }
    });

    function handleAction(actionData) {
        if (gameState.status !== 'playing' || socket.id !== gameState.turnOwnerId) return;
        const player = gameState.players[socket.id];
        let turnLogs = [];

        try {
            switch (actionData.type) {
                case 'stay':
                case 'rest':
                    player.stamina = Math.min(100, player.stamina + 30);
                    turnLogs.push(`💤 ${player.username} は休息し、APを30回復した。`);
                    break;
                case 'defend': 
                    if (player.stamina >= 10) {
                        player.stamina -= 10;
                        player.def += 5;
                        turnLogs.push(`🛡️ ${player.username} は防御を固めた！(AP-10)`);
                    }
                    break;
                case 'attack': 
                    if (player.stamina >= 30) {
                        player.stamina -= 30;
                        const result = resolveBattle(player.atk, 40);
                        if (result.isWin) {
                            // 🚀 地区データの更新
                            gameState.districts[actionData.targetId] = socket.id;
                            player.districtId = actionData.targetId; 
                            turnLogs.push(`⚔️ ${player.username} が地区 ${actionData.targetId} を制圧！(AP-30)`);
                            checkCompleteDomination();
                        } else {
                            player.hp = Math.max(0, player.hp - 10);
                            turnLogs.push(`🛡️ ${player.username} は失敗した！(AP-30)`);
                        }
                    }
                    break;
            }
            // 🚀 【最重要】行動のたびに SYNC_STATE を全プレイヤーに送信！
            // これにより、攻撃した側だけでなく相手の画面にも最新の地区データが届きます。
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
            io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
        } catch (error) { console.error(error); }
    }

    socket.on("ACTION_SUBMIT", handleAction);
    socket.on(EVENTS.CLIENT.ACTION_SUBMIT, handleAction);

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        gameState.status = 'waiting';
    });
});

setInterval(() => {
    if (Object.keys(gameState.players).length > 0) io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
}, 1000);

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));