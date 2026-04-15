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

// 🚀 神の恩恵（ボーナス）定義
const GOD_BONUSES = {
    war:       { atk: 10, def: 0, hp: 0,  apRegen: 0,   faith: 0 },   // 戦いの神
    fertility: { atk: 0,  def: 0, hp: 0,  apRegen: 0.2, faith: 0 },   // 豊穣の神
    guardian:  { atk: 0,  def: 10,hp: 20, apRegen: 0,   faith: 0 },   // 守護の神
    holy:      { atk: 0,  def: 0, hp: 0,  apRegen: 0,   faith: 0.2 }  // 聖なる神
};

// 🚀 特産品バフテーブル（以前の定義 101〜105 に完全対応）
const DISTRICT_BUFFS = {
    "101": { atk: 10, def: 0, hp: 0 },    // セブ・マンゴー
    "102": { atk: 0, def: 10, hp: 0 },    // サン・ペドロ
    "103": { atk: 0, def: 0, hp: 20 },    // レチョン（HP最大値アップ）
    "104": { atk: 5, def: 5, hp: 0 },     // ITパーク
    "105": { atk: 0, def: 0, hp: 0, faith: 0.1 }, // マゼラン・クロス
};

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
    console.log(`📡 接続: ${socket.id}`);

    socket.on('join_game', (userData) => {
        const currentPlayers = Object.keys(gameState.players);
        if (currentPlayers.length >= 2 && !gameState.players[socket.id]) {
            socket.emit('room_full', { message: 'ルーム満員です。' });
            return;
        }

        let assignedTeam = currentPlayers.length === 0 ? 'red' : 'blue';

        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            districtId: null, 
            hp: 100, maxHp: 100, 
            ap: 100, maxAp: 100, stamina: 100,
            atk: 50, def: 40, faith: 1.0, apRegenMulti: 1.0,
            team: assignedTeam, isReady: false,
            isDefending: false 
        };

        if (Object.keys(gameState.players).length === 2) {
            gameState.status = 'standby';
            io.emit('gameStart', { status: 'standby' });
        }
    });

    socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;

        const god = data.selectedGod || 'war'; 
        const bonus = GOD_BONUSES[god];
        if (bonus) {
            player.atk += bonus.atk;
            player.def += bonus.def;
            player.maxHp += bonus.hp;
            player.hp = player.maxHp;
            player.apRegenMulti += bonus.apRegen;
            player.faith += bonus.faith;
        }

        player.districtId = data.startDistrictId;
        player.isReady = true;
        gameState.districts[data.startDistrictId] = socket.id; 

        const playerIds = Object.keys(gameState.players);
        const allReady = playerIds.length === 2 && playerIds.every(id => gameState.players[id].isReady);

        if (allReady) {
            gameState.status = 'playing';
            gameState.turn = 1;
            gameState.firstPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
            gameState.turnOwnerId = gameState.firstPlayerId;

            io.emit(SERVER_EVENTS.TURN_START, { 
                turn: 1, 
                turnOwnerId: gameState.turnOwnerId,
                turnOwnerName: gameState.players[gameState.turnOwnerId].username 
            });
        }
        io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
    });

    // 🚀 【重要】手動ターン終了：コンボが終わったらこのイベントを呼ぶ
    socket.on("TURN_END_SUBMIT", () => {
        if (socket.id !== gameState.turnOwnerId) return;
        
        const playerIds = Object.keys(gameState.players);
        const nextPlayerId = playerIds.find(id => id !== socket.id);
        
        gameState.turnOwnerId = nextPlayerId;
        if (gameState.turnOwnerId === gameState.firstPlayerId) {
            gameState.turn++;
        }

        if (gameState.turn > gameState.maxTurn) {
            endGame();
        } else {
            io.emit(SERVER_EVENTS.TURN_START, { 
                turn: gameState.turn, 
                turnOwnerId: gameState.turnOwnerId,
                turnOwnerName: gameState.players[gameState.turnOwnerId]?.username
            });
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
                    player.hp = Math.min(player.maxHp, player.hp + 20);
                    const apRecover = Math.floor(30 * player.apRegenMulti);
                    player.ap = Math.min(player.maxAp, player.ap + apRecover);
                    player.stamina = player.ap;
                    turnLogs.push(`💤 ${player.username} は休息し、APを回復した。`);
                    break;

                case 'defend': 
                    if (player.ap >= 10) {
                        player.ap -= 10; player.stamina = player.ap;
                        player.isDefending = true; 
                        turnLogs.push(`🛡️ ${player.username} は防御を固めた！`);
                    }
                    break;

                case 'escape': 
                    const ownedCount = Object.values(gameState.districts).filter(id => id === socket.id).length;
                    if (ownedCount > 0) {
                        turnLogs.push(`🏃 ${player.username} は自陣へ緊急離脱した。`);
                    } else {
                        player.hp = Math.max(0, player.hp - 50);
                        turnLogs.push(`💥 ${player.username} は逃げ場がなく、大ダメージ！`);
                    }
                    break;

                case 'attack': 
                    if (player.ap >= 30) {
                        player.ap -= 30; player.stamina = player.ap; 
                        
                        const targetId = String(actionData.targetId); // 確実に文字列で照合
                        const defenderId = gameState.districts[targetId];
                        
                        let targetDef = 40;
                        let targetFaith = 1.0;

                        if (defenderId && gameState.players[defenderId]) {
                            const defender = gameState.players[defenderId];
                            targetDef = defender.isDefending ? Math.floor(defender.def * 1.5) : defender.def;
                            targetFaith = defender.faith;
                        }

                        const result = resolveBattle(player.atk * player.faith, targetDef * targetFaith);

                        if (result.isWin) {
                            gameState.districts[targetId] = socket.id;
                            player.districtId = targetId; 
                            const buff = DISTRICT_BUFFS[targetId];
                            if (buff) {
                                player.atk += buff.atk || 0;
                                player.def += buff.def || 0;
                                player.faith += buff.faith || 0;
                            }
                            turnLogs.push(`⚔️ ${player.username} が地区 ${targetId} を制圧！`);
                        } else {
                            const dmg = player.isDefending ? 10 : 20;
                            player.hp = Math.max(0, player.hp - dmg);
                            turnLogs.push(`❌ ${player.username} の制圧に失敗。`);
                        }
                    } else {
                        io.to(socket.id).emit(SERVER_EVENTS.ACTION_REJECTED, { message: "AP不足！" });
                        return;
                    }
                    break;
            }

            if (actionData.type !== 'defend') player.isDefending = false;

            if (player.hp <= 0) {
                player.hp = 0;
                const winnerId = Object.keys(gameState.players).find(id => id !== socket.id);
                io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
                endGame(winnerId);
                return;
            }

            // 🚀 コンボシステム：自動でターン交代はせず、結果だけ送る
            io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);

        } catch (error) {
            console.error("🔥 Action Error:", error);
        }
    }

    socket.on("ACTION_SUBMIT", handleAction);
    socket.on(EVENTS.CLIENT.ACTION_SUBMIT, handleAction);

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        gameState.status = 'waiting';
        gameState.turn = 0;
        io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
    });
});

setInterval(() => {
    if (Object.keys(gameState.players).length > 0) {
        io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
    }
}, 1000);

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));