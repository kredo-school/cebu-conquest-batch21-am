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
const API_BASE_URL = process.env.API_URL || 'http://localhost/cebu-conquest/api';

const EVENTS = {
    CLIENT: CLIENT_EVENTS,
    SERVER: SERVER_EVENTS
};

const TOTAL_DISTRICTS = 11; 

const GOD_BONUSES = {
    war:       { atk: 10, def: 0, hp: 0,  apRegen: 0,   faith: 0 },   
    fertility: { atk: 0,  def: 0, hp: 0,  apRegen: 0.2, faith: 0 },   
    guardian:  { atk: 0,  def: 10,hp: 20, apRegen: 0,   faith: 0 },   
    holy:      { atk: 0,  def: 0, hp: 0,  apRegen: 0,   faith: 0.2 }  
};

// 🚀 新しい地区IDに合わせたバフの仮データ
const DISTRICT_BUFFS = {
    "101": { atk: 10, def: 0, hp: 0 },   
    "102": { atk: 0, def: 10, hp: 0 },   
};

// 🚀 【修正】MainSceneに合わせた実際の地区隣接データ
const ADJACENT_DISTRICTS = {
    "101": ["102", "103", "104", "105", "201"],
    "102": ["101", "104", "105", "401"],
    "103": ["101", "105", "201", "301"],
    "104": ["101", "102", "105", "401"],
    "105": ["101", "103", "104", "301"],
    "201": ["202", "101", "103"],
    "202": ["201"],
    "301": ["302", "103", "105"],
    "302": ["301"],
    "401": ["402", "102", "104"],
    "402": ["401"]
};

// 🚀 DB保存関数
async function saveGameResultToDB(winnerId, scores) {
    try {
        const payload = {
            winner_id: winnerId,
            scores: scores,
            timestamp: new Date().toISOString()
        };
        console.log("📡 DBに結果を送信中...", payload);
        const response = await fetch(`${API_BASE_URL}/result.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log("✅ DB保存成功:", data);
    } catch (error) {
        console.error("🔥 DB保存エラー:", error);
    }
}

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
// 🚀 連打・競合防止用のロック管理
const lockedDistricts = new Set();


// 🚀 NPC自動参加用のタイマー変数
let matchingTimer = null;

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

    saveGameResultToDB(winnerId, scores);

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
// 🤖 NPC思考・行動ロジック
// ==========================================
function processNpcTurn() {
    if (gameState.status !== 'playing') return;
    
    const npcId = gameState.turnOwnerId;
    const npc = gameState.players[npcId];
    if (!npc || !npc.isNpc) return;

    console.log(`\n🤖 [NPCターン開始] ${npc.username} の行動を計算中...`);
    let turnLogs = [];

    if (npc.ap < 15) {
        npc.hp = Math.min(npc.maxHp, npc.hp + 20);
        npc.ap = Math.min(npc.maxAp, npc.ap + 30);
        npc.stamina = npc.ap;
        turnLogs.push(`💤 ${npc.username} は待機し、HPとAPを回復した。`);
    } else {
        // String型で扱うことで比較ミスを防止
        const currentLoc = String(npc.districtId);
        const neighbors = ADJACENT_DISTRICTS[currentLoc] || [];
        // 自分(NPC)が持っていない陣地を攻撃候補にする
        const attackable = neighbors.filter(id => gameState.districts[id] !== npcId);

        if (attackable.length > 0) {
            const targetId = attackable[Math.floor(Math.random() * attackable.length)];
            npc.ap -= 5;
            npc.stamina = npc.ap;
            
            const defenderId = gameState.districts[targetId];
            let targetDef = 40;
            let targetFaith = 1.0;
            let defender = null;

            if (defenderId && gameState.players[defenderId]) {
                defender = gameState.players[defenderId];
                targetDef = defender.def;
                targetFaith = defender.faith;
                if (defender.isDefending) {
                    targetDef = Math.floor(targetDef * 1.5);
                    turnLogs.push(`🛡️ ${defender.username} の鉄壁の防御！`);
                }
            }

            const finalAtk = npc.atk * npc.faith;
            const finalDef = targetDef * targetFaith;
            const result = resolveBattle(finalAtk, finalDef);

            if (result.isWin) {
                gameState.districts[targetId] = npcId;
                npc.districtId = targetId; 
                
                const buff = DISTRICT_BUFFS[targetId];
                if (buff) {
                    npc.atk += buff.atk || 0;
                    npc.def += buff.def || 0;
                }
                turnLogs.push(`⚔️ ${npc.username} が地区 ${targetId} を制圧！`);
                checkCompleteDomination();
            } else {
                const dmg = npc.isDefending ? 10 : 20;
                npc.hp = Math.max(0, npc.hp - dmg);
                turnLogs.push(`❌ ${npc.username} は制圧に失敗し、${dmg}ダメージを受けた！`);
            }
        } else {
            turnLogs.push(`❓ ${npc.username} は周囲を見渡している...`);
        }
    }

    npc.isDefending = false;

    if (npc.hp <= 0) {
        npc.hp = 0;
        turnLogs.push(`💀 ${npc.username} の体力が尽きた...！`);
        const winnerId = Object.keys(gameState.players).find(id => id !== npcId) || null;
        io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
        endGame(winnerId);
        return;
    }

    const playerIds = Object.keys(gameState.players);
    gameState.turnOwnerId = playerIds.find(id => id !== npcId) || gameState.firstPlayerId;
    if (gameState.turnOwnerId === gameState.firstPlayerId) {
        gameState.turn++;
    }

    console.log(`✅ NPC行動完了 -> 次は ${gameState.players[gameState.turnOwnerId]?.username} の番です (Day ${gameState.turn})`);

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

        if (gameState.players[gameState.turnOwnerId]?.isNpc) {
            setTimeout(() => processNpcTurn(), 2000);
        }
    }
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
            districtId: null, 
            hp: 100, maxHp: 100, 
            ap: 100, maxAp: 100, stamina: 100, 
            atk: 50, def: 40, faith: 1.0, apRegenMulti: 1.0,
            team: assignedTeam, isReady: false,
            isDefending: false,
            isNpc: false
        };

        const updatedPlayers = Object.keys(gameState.players);

        // =======================================================
        // 🚀 1人目の入室なら、5秒後にNPCを自動参加させるタイマー起動
        // =======================================================
        if (updatedPlayers.length === 1) {
            console.log(`⏱️ マッチング待機中...5秒後にNPCが参加します。`);
            matchingTimer = setTimeout(() => {
                if (Object.keys(gameState.players).length === 1) {
                    console.log("🤖 NPCがマッチングに参加しました！");
                    const npcId = "npc_bot_001";
                    const existingPlayer = gameState.players[updatedPlayers[0]];
                    
                    gameState.players[npcId] = {
                        id: npcId,
                        username: "CPU_Lv1",
                        districtId: null, 
                        hp: 100, maxHp: 100, 
                        ap: 100, maxAp: 100, stamina: 100, 
                        atk: 50, def: 40, faith: 1.0, apRegenMulti: 1.0,
                        team: existingPlayer.team === 'red' ? 'blue' : 'red', 
                        isReady: false, 
                        isDefending: false,
                        isNpc: true 
                    };
                    
                    // NPCが参加したので、待機画面から準備画面へ進める
                    gameState.status = 'standby';
                    io.emit('gameStart', { status: 'standby' });
                    io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
                }
            }, 5000);
        } 
        // 2人目が生身の人間ならタイマーを解除して進む
        else if (updatedPlayers.length === 2) {
            if (matchingTimer) clearTimeout(matchingTimer);
            gameState.status = 'standby';
            io.emit('gameStart', { status: 'standby' });
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
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

        // フロントから送られてきたIDをStringに統一（比較エラー防止のため）
        const startId = String(data.startDistrictId);
        player.districtId = startId;
        player.isReady = true;
        gameState.districts[startId] = socket.id; 

        // =======================================================
        // 🚀 NPCが相手の場合、プレイヤーに合わせてNPCも準備完了させる
        // =======================================================
        const playerIds = Object.keys(gameState.players);
        const npcId = playerIds.find(id => gameState.players[id].isNpc);

        if (npcId && !gameState.players[npcId].isReady) {
            const npc = gameState.players[npcId];
            
            const gods = Object.keys(GOD_BONUSES);
            const randomGod = gods[Math.floor(Math.random() * gods.length)];
            const npcBonus = GOD_BONUSES[randomGod];
            if (npcBonus) {
                npc.atk += npcBonus.atk;
                npc.def += npcBonus.def;
                npc.maxHp += npcBonus.hp;
                npc.hp = npc.maxHp;
                npc.apRegenMulti += npcBonus.apRegen;
                npc.faith += npcBonus.faith;
            }

            // プレイヤーが選んだ場所以外の空き陣地をランダムに選ぶ
            const availableDistricts = Object.keys(ADJACENT_DISTRICTS).filter(id => id !== startId);
            const npcStartId = availableDistricts[Math.floor(Math.random() * availableDistricts.length)];

            npc.districtId = String(npcStartId);
            npc.isReady = true;
            gameState.districts[npcStartId] = npcId;
            console.log(`🤖 NPCは神[${randomGod}] と 陣地[${npcStartId}] を選んでReadyしました！`);
        }

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

            // 先攻がNPCなら2秒後に動かす
            if (gameState.players[gameState.turnOwnerId].isNpc) {
                setTimeout(() => processNpcTurn(), 2000);
            }
        } else {
            io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
        }
    });

    const ACTION_EVENT = EVENTS.CLIENT?.ACTION_SUBMIT || "ACTION_SUBMIT";

    socket.on(ACTION_EVENT, handleAction);
    if (ACTION_EVENT !== "ACTION_SUBMIT") {
        socket.on("ACTION_SUBMIT", handleAction);
    }

    function handleAction(actionData) {
        console.log(`\n📩 [受信] ${socket.id} が行動しました:`, actionData.type);

        if (gameState.status !== 'playing') return;
        if (socket.id !== gameState.turnOwnerId) return;

        // =========================================================
        // 対象の地区がロック中なら、アクションを弾く（連打防止）
        // =========================================================
        const targetId = actionData.targetId ? String(actionData.targetId) : null;
        if (targetId && lockedDistricts.has(targetId)) {
            console.log(`⚠️ 競合検知: 地区 ${targetId} は現在処理中です。`);
            io.to(socket.id).emit(EVENTS.SERVER.ACTION_REJECTED, { message: "処理中です。連打しないでください！" });
            return;
        }

        const player = gameState.players[socket.id];
        const playerIds = Object.keys(gameState.players);
        const nextPlayerId = playerIds.find(id => id !== socket.id) || gameState.firstPlayerId;
        let turnLogs = [];

        if (player.ap <= 0 && actionData.type !== 'stay' && actionData.type !== 'rest') {
            io.to(socket.id).emit(EVENTS.SERVER.ACTION_REJECTED, { message: "AP(スタミナ)が足りません！" });
            return;
        }

        // =========================================================
        // 処理開始前にターゲット地区をロックする
        // =========================================================
        if (targetId) {
            lockedDistricts.add(targetId);
        }

        try {
            switch (actionData.type) {
                case 'stay':
                case 'rest':
                    player.hp = Math.min(player.maxHp, player.hp + 20);
                    const apRecover = Math.floor(30 * player.apRegenMulti);
                    player.ap = Math.min(player.maxAp, player.ap + apRecover);
                    player.stamina = player.ap; 
                    turnLogs.push(`💤 ${player.username} は待機し、HPとAPを回復した。`);
                    break;
                case 'defend': 
                    player.isDefending = true; 
                    turnLogs.push(`🛡️ ${player.username} は防御を固めた！`);
                    break;
                case 'escape': 
                    const ownedDistricts = Object.values(gameState.districts).filter(id => id === socket.id);
                    if (ownedDistricts.length > 0) {
                        turnLogs.push(`🏃 ${player.username} は自陣へ無事に緊急離脱した！`);
                    } else {
                        player.hp = Math.max(0, player.hp - 50);
                        turnLogs.push(`💥 ${player.username} は逃げ場がなく、50の大ダメージを受けた！`);
                    }
                    break;
                case 'attack': 
                    if (player.ap >= 5) {
                        player.ap -= 5; 
                        player.stamina = player.ap; 
                        
                        const targetId = String(actionData.targetId); // Stringに統一
                        const defenderId = gameState.districts[targetId];
                        
                        let targetDef = 40;
                        let targetFaith = 1.0;
                        let defender = null;

                        if (defenderId && gameState.players[defenderId]) {
                            defender = gameState.players[defenderId];
                            targetDef = defender.def;
                            targetFaith = defender.faith;
                            if (defender.isDefending) {
                                targetDef = Math.floor(targetDef * 1.5);
                                turnLogs.push(`🛡️ ${defender.username} の鉄壁の防御！`);
                            }
                        }

                        const finalAtk = player.atk * player.faith;
                        const finalDef = targetDef * targetFaith;
                        const result = resolveBattle(finalAtk, finalDef);

                        if (result.isWin) {
                            gameState.districts[targetId] = socket.id;
                            player.districtId = targetId; 
                            const buff = DISTRICT_BUFFS[targetId];
                            if (buff) {
                                player.atk += buff.atk || 0;
                                player.def += buff.def || 0;
                            }
                            turnLogs.push(`⚔️ ${player.username} が地区 ${targetId} を制圧！`);
                            checkCompleteDomination();
                        } else {
                            const dmg = player.isDefending ? 10 : 20;
                            player.hp = Math.max(0, player.hp - dmg);
                            turnLogs.push(`❌ ${player.username} は制圧に失敗し、${dmg}ダメージを受けた！`);
                        }
                    } else {
                        io.to(socket.id).emit(EVENTS.SERVER.ACTION_REJECTED, { message: "APが足りません！" });
                        return;
                    }
                    break;
            }

            if (actionData.type !== 'defend') player.isDefending = false;

            if (player.hp <= 0) {
                player.hp = 0;
                turnLogs.push(`💀 ${player.username} の体力が尽きた...！`);
                const winnerId = playerIds.find(id => id !== socket.id) || null;
                io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
                endGame(winnerId);
                return; 
            }

            gameState.turnOwnerId = nextPlayerId;
            if (gameState.turnOwnerId === gameState.firstPlayerId) {
                gameState.turn++;
            }

            console.log(`✅ 行動成功 -> 次は ${gameState.players[gameState.turnOwnerId]?.username} の番です (Day ${gameState.turn})`);

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

                if (gameState.players[gameState.turnOwnerId]?.isNpc) {
                    setTimeout(() => processNpcTurn(), 2000);
                }
            }
        } catch (error) {
            console.error("🔥 ACTION_SUBMIT 処理中にエラーが発生:", error);
        }finally {
            // =========================================================
            // エラーが起きても正常終了しても、必ず最後にロックを解除する
            // =========================================================
            if (targetId) {
                lockedDistricts.delete(targetId);
            }
        }
    }

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length < 2) {
            if (matchingTimer) clearTimeout(matchingTimer); 
            gameState.status = 'waiting';
            gameState.turn = 0;
            gameState.districts = {};
            
            const remainingId = Object.keys(gameState.players)[0];
            if (remainingId && gameState.players[remainingId].isNpc) {
                delete gameState.players[remainingId];
            }
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