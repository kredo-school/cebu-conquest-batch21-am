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

const TOTAL_DISTRICTS = 11; 

// ==========================================
// ゲームステート管理
// ==========================================

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
    return { isWin: Math.random() < winProbability, winProbability };
}

function checkCompleteDomination() {
    const owners = Object.values(gameState.districts);
    if (owners.length === TOTAL_DISTRICTS) {
        const firstOwner = owners[0];
        const allOwnedByOne = owners.every(owner => owner === firstOwner);
        if (allOwnedByOne) {
            endGame(firstOwner);
        }
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
    console.log(`ユーザー接続: ${socket.id}`);

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
        const allReady = playerIds.length === 2 && playerIds.every(id => gameState.players[id].isReady);

        if (allReady) {
            console.log("🎊 全員の準備が完了。Day 1を開始します。");
            gameState.status = 'playing';
            gameState.turn = 1;
            
            gameState.firstPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
            gameState.turnOwnerId = gameState.firstPlayerId;

            io.emit(EVENTS.SERVER.TURN_START, { 
                turn: 1, 
                turnOwnerId: gameState.turnOwnerId,
                turnOwnerName: gameState.players[gameState.turnOwnerId].username 
            });
            
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
        } else {
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
        }
    });

    // 🚀 【鉄壁の修正】通信の名前ズレを防止し、エラーで止まらないようにする
    const ACTION_EVENT = EVENTS.CLIENT?.ACTION_SUBMIT || "ACTION_SUBMIT";

    socket.on(ACTION_EVENT, handleAction);
    if (ACTION_EVENT !== "ACTION_SUBMIT") {
        socket.on("ACTION_SUBMIT", handleAction);
    }

    function handleAction(actionData) {
        console.log(`\n📩 [受信] ${socket.id} が行動しました:`, actionData.type);

        if (gameState.status !== 'playing') {
            console.log("⚠️ 却下: まだゲームが始まっていません。");
            return;
        }
        if (socket.id !== gameState.turnOwnerId) {
            console.log(`⚠️ 却下: 現在は ${gameState.turnOwnerId} のターンです。`);
            return;
        }

        const player = gameState.players[socket.id];
        const playerIds = Object.keys(gameState.players);
        const nextPlayerId = playerIds.find(id => id !== socket.id) || gameState.firstPlayerId;
        
        let turnLogs = [];

        try {
            switch (actionData.type) {
                case 'stay':
                case 'rest':
                    player.stamina = Math.min(100, player.stamina + 20);
                    turnLogs.push(`💤 ${player.username} は休息し、APを回復した。`);
                    break;
                case 'defend': 
                    player.def += 10;
                    turnLogs.push(`🛡️ ${player.username} は防御を固めた！`);
                    break;
                case 'escape': 
                    player.stamina = Math.max(0, player.stamina - 5);
                    turnLogs.push(`🏃 ${player.username} は緊急離脱を試みた！`);
                    break;
                case 'attack': 
                    if (player.stamina >= 20) {
                        player.stamina -= 20;
                        const targetId = actionData.targetId;
                        const defenderId = gameState.districts[targetId];
                        
                        // 🚀 エラー回避：相手が切断等で居なくてもクラッシュしない
                        let targetDef = 40;
                        if (defenderId && gameState.players[defenderId]) {
                            targetDef = gameState.players[defenderId].def;
                        }

                        const result = resolveBattle(player.atk, targetDef);
                        if (result.isWin) {
                            gameState.districts[targetId] = socket.id;

                            // 🚀 追加：勝ったら自分のコマをその地区へ「進軍（移動）」させる！
                            player.districtId = targetId; 

                            turnLogs.push(`⚔️ ${player.username} が地区 ${targetId} を制圧！`);
                            checkCompleteDomination();
                        } else {
                            player.hp = Math.max(0, player.hp - 20);
                            turnLogs.push(`🛡️ ${player.username} は制圧に失敗！`);
                        }
                    }
                    break;
            }

            // 🚀 絶対に番を交代する
            gameState.turnOwnerId = nextPlayerId;
            if (gameState.turnOwnerId === gameState.firstPlayerId) {
                gameState.turn++;
            }

            console.log(`✅ 行動成功 -> 次は ${gameState.players[gameState.turnOwnerId]?.username} の番です (Day ${gameState.turn})`);

            // 全員へ送信
            if (gameState.turn > gameState.maxTurn) {
                io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
                endGame();
            } else {
                io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
                io.emit(EVENTS.SERVER.TURN_START, { 
                    turn: gameState.turn, 
                    turnOwnerId: gameState.turnOwnerId,
                    turnOwnerName: gameState.players[gameState.turnOwnerId]?.username
                });
            }
        } catch (error) {
            console.error("🔥 ACTION_SUBMIT 処理中にエラーが発生:", error);
        }
    }

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
            gameState.turn = 0;
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
    console.log(`🚀 Server running on port ${PORT}`);
});