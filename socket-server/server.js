// socket-server/server.js

import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/socketEvents.js';
import { getSpawnSpot, getSacredDistrict, GOD_SACRED_LANDS } from '../shared/godSacredLands.js';
import { getNeighbors } from '../shared/adjacency.js';

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// ==========================================
// 🚀 【設定】APIとチームカラー設定
// ==========================================
const API_BASE_URL = process.env.SERVER_API_URL || 'http://10.29.219.57/Cebu_Conquest/cebu-conquest-batch21-am/public/api/';

const TEAM_CONFIG = [
    { id: 'red', name: 'レッド', color: '#e74c3c' },
    { id: 'blue', name: 'ブルー', color: '#3498db' },
    { id: 'green', name: 'グリーン', color: '#2ecc71' },
    { id: 'yellow', name: 'イエロー', color: '#f1c40f' }
];

// ==========================================
// 🚀 【32地区マスタ】すべての地区のバフと優先度
// ==========================================
const DISTRICTS_MASTER = {
    // Cebu & Mactan (1000)
    "111": { name: "Northern Reach: The Apex (Daanbantayan)", priority: 5, buff: { atk: 8, def: 8 } },
    "112": { name: "Cane Fields Lagoon (Medellin)", priority: 4, buff: { atk: 5, def: 5 } },
    "113": { name: "The Transit Crossroad (Bogo City)", priority: 8, buff: { atk: 12, def: 12 } },
    "121": { name: "The Verdant Escarpment (Carmen / Catmon)", priority: 5, buff: { atk: 5, def: 10 } },
    "122": { name: "Ironforge Bay (Danao City)", priority: 6, buff: { atk: 8, def: 8 } },
    "123": { name: "Sentinel's Gate (Compostela)", priority: 7, buff: { atk: 10, def: 5 } },
    "131": { name: "Neon Citadel (Cebu City North)", priority: 9, buff: { atk: 15, def: 10 } },
    "132": { name: "Grand Heritage Ruins (Cebu City South)", priority: 9, buff: { atk: 0, def: 25 } },
    "133": { name: "The Cargo Canal (Mandaue City)", priority: 6, buff: { atk: 8, def: 8 } },
    "134": { name: "Lechon Bastion (Talisay City)", priority: 7, buff: { atk: 10, def: 10 } },
    "141": { name: "Luminous Power Spire (Naga / San Fernando)", priority: 6, buff: { atk: 10, def: 10 } },
    "142": { name: "Ancient Meat Fortress (Carcar City)", priority: 8, buff: { atk: 0, def: 20 } },
    "143": { name: "The Torta Sanctuary (Argao)", priority: 5, buff: { atk: 5, def: 5 } },
    "151": { name: "Sardine Storm Reefs (Moalboal / Badian)", priority: 7, buff: { atk: 5, def: 15 } },
    "152": { name: "Peak of the Ancients (Dalaguete)", priority: 8, buff: { atk: 15, def: 5 } },
    "153": { name: "Whale Shark Abyss (Oslob)", priority: 10, buff: { atk: 25, def: 0 } },
    "161": { name: "The Chief's Victory Landing (Lapu-Lapu)", priority: 8, buff: { atk: 12, def: 12 } },
    "162": { name: "Roseate Mangrove Gardens (Cordova)", priority: 5, buff: { atk: 5, def: 10 } },

    // Negros (2000)
    "211": { name: "Sweetleaf Plains (Victorias / Sagay)", priority: 5, buff: { atk: 5, def: 5 } },
    "212": { name: "Cadiz Copper Port (Cadiz)", priority: 6, buff: { atk: 8, def: 8 } },
    "221": { name: "Heritage Manor (Silay)", priority: 7, buff: { atk: 5, def: 15 } },
    "222": { name: "Masked Citadel (Bacolod City)", priority: 9, buff: { atk: 15, def: 10 } },
    "231": { name: "Titan's Rest (Canlaon City)", priority: 8, buff: { atk: 10, def: 15 } },
    "232": { name: "Mist-Walker Cliffs (San Carlos)", priority: 6, buff: { atk: 8, def: 8 } },
    "241": { name: "Silliman University (Silliman University)", priority: 8, buff: { atk: 10, def: 10 } },
    "242": { name: "The Gentle Core (Dumaguete)", priority: 7, buff: { atk: 8, def: 8 } },
    "243": { name: "Witch's Shadow Isle (Siquijor)", priority: 6, buff: { atk: 15, def: 0 } },

    // Bohol (3000)
    "311": { name: "The Coral Guard (Talibon)", priority: 6, buff: { atk: 5, def: 10 } },
    "312": { name: "Gale Winds Pier (Tubigon)", priority: 5, buff: { atk: 8, def: 5 } },
    "321": { name: "Cone Hill Monoliths (Carmen)", priority: 7, buff: { atk: 10, def: 10 } },
    "322": { name: "Tarsier Forest (Corella)", priority: 6, buff: { atk: 5, def: 5 } },
    "331": { name: "Ivory Sands Resort (Panglao)", priority: 8, buff: { atk: 10, def: 10 } },
    "332": { name: "Merchant's Hub (Tagbilaran)", priority: 9, buff: { atk: 10, def: 15 } }
};

// ==========================================
// 🚀 【設定】ルーム管理とゲーム状態の初期化
// ==========================================
const rooms = new Map();
const roomDeleteTimers = new Map();

function sanitizeRoomState(roomState) {
    if (!roomState) return roomState;
    const safePlayers = {};
    for (const [id, p] of Object.entries(roomState.players)) {
        const { token, dbUserId, authToken, ...safe } = p;
        safe.playerName = safe.playerName || safe.username;
        safePlayers[id] = safe;
    }
    return { ...roomState, players: safePlayers };
}

function createInitialGameState(maxPlayers = 4) {
    return {
        roomId: null,
        status: 'waiting', 
        turn: 0, 
        maxTurn: 10,
        maxPlayers: maxPlayers,
        turnOwnerId: null, 
        firstPlayerId: null,
        turnOrder: [],     
        turnIndex: 0,      
        isProcessingAction: false,
        players: {}, 
        districts: {} 
    };
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcastLobbyUpdate(roomId, roomState) {
    if (!roomState) return;
    const playersArr = Object.values(roomState.players).map(p => ({
        id: p.id,
        username: p.username,
        playerName: p.playerName || p.username,
        selectedGodId: p.selectedGodId || null,
        godId: p.selectedGodId || null,
        isReady: p.isReady || false
    }));
    io.to(roomId).emit("lobbyUpdated", { players: playersArr });
}

function checkAllConquered(roomState) {
    const allDistricts = Object.keys(DISTRICTS_MASTER);
    const firstOwner = roomState.districts[allDistricts[0]];
    if (!firstOwner) return false;
    return allDistricts.every(dId => roomState.districts[dId] === firstOwner);
}

// ==========================================
// 🏴 所有地区数カウント（全滅判定用）
// roomState.districts はキーが districtId（3桁）のため district 単位でカウント
// ==========================================
function countOwnedSpots(roomState, playerId) {
    return Object.values(roomState.districts).filter(owner => owner === playerId).length;
}

function getEliminatedBySpotLoss(roomState) {
    if (roomState.turn === 0) return [];
    return Object.keys(roomState.players).filter(pid => {
        const player = roomState.players[pid];
        if (!player || player.isNpc) return false;
        return countOwnedSpots(roomState, pid) === 0;
    });
}

function applyGodBonus(p, godId) {
    switch(Number(godId)) {
        case 1: p.maxHp += 30; p.maxAp -= 25; p.hp += 10; break;
        case 2: p.atk += 20; break;
        case 3: p.maxAp += 15; p.hp += 10; p.ap += 10; break;
        case 4: p.hp -= 20; p.faith = 100; break; 
        case 5: p.def += 15; break;
        case 6: p.maxAp += 30; p.hp -= 10; break;
        case 7: p.faithRegen = 5; break;
        case 8: p.maxAp += 30; p.ap += 30; break;
    }
    if(p.hp > p.maxHp) p.hp = p.maxHp;
    if(p.ap > p.maxAp) p.ap = p.maxAp;
}

// ==========================================
// ⚔️ バトル＆ステータス計算
// ==========================================
function calculateFinalStats(roomId, playerId) {
    const roomState = rooms.get(roomId);
    if (!roomState) return { atk: 40, def: 40 };

    const p = roomState.players[playerId];
    if (!p) return { atk: 40, def: 40 };

    let bonusAtk = 0;
    let bonusDef = 0;

    Object.entries(roomState.districts).forEach(([dId, ownerId]) => {
        if (ownerId === playerId) {
            const master = DISTRICTS_MASTER[dId];
            if (master && master.buff) {
                bonusAtk += master.buff.atk;
                bonusDef += master.buff.def;
            }
        }
    });

    const finalFaith = p.faith || 1.0;
    const finalAtk = Math.round((p.atk + bonusAtk) * finalFaith);
    const finalDef = Math.round((p.def + bonusDef) * finalFaith);

    return {
        atk: finalAtk,
        def: finalDef,
        displayAtk: finalAtk,
        displayDef: finalDef
    };
}

function resolveBattle(atk, def) {
    const total = atk + def;
    const winProb = total === 0 ? 0.5 : atk / total;
    const dice = Math.random();
    return { isWin: dice < winProb, prob: winProb };
}

// ==========================================
// 🤖 タクティカル・ラプパプ AIエンジン
// ==========================================
function processNpcTurn(roomId) {
    const roomState = rooms.get(roomId);
    if (!roomState || roomState.status !== 'playing') return;

    try {
        const npcId = roomState.turnOwnerId;
        const npc = roomState.players[npcId];
        if (!npc || !npc.isNpc) return;

        npc.isDefending = false;
        const stats = calculateFinalStats(roomId, npcId);
        
        const rawNeighbors = getNeighbors(npc.spotId || npc.districtId + "01");
        const neighbors = Array.isArray(rawNeighbors) ? rawNeighbors.map(String) : [];

        let targets = neighbors.map(spotId => {
            const dId = String(Math.floor(Number(spotId) / 100));
            const ownerId = roomState.districts[dId];
            const master = DISTRICTS_MASTER[dId];
            let score = master ? master.priority : 1;

            if (ownerId && ownerId !== npcId) score += 15;
            if (!ownerId) score += 5;
            
            return { spotId, dId, score, ownerId, name: master ? master.name : `地区${dId}` };
        });

        targets.sort((a, b) => b.score - a.score);

        setTimeout(() => {
            try {
                const currentState = rooms.get(roomId);
                if(!currentState) return;

                if (npc.hp < 30) {
                    npc.hp = Math.min(npc.maxHp, npc.hp + 20);
                    npc.ap = Math.min(npc.maxAp, npc.ap + 30); 
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`🧘 ${npc.username}: 休息を選び、体制を整えています。`);
                } else if (targets.length > 0) {
                    const target = targets[0];

                    if (target.ownerId === npcId) {
                        npc.spotId = target.spotId;
                        npc.districtId = target.dId;
                        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`🚚 ${npc.username}: ${target.name} へ本陣を移しました。`);
                    } else {
                        npc.ap -= 5;
                        const defenderId = target.ownerId;
                        const defBase = defenderId ? calculateFinalStats(roomId, defenderId).def : 30;
                        const defValue = defBase * ((defenderId && currentState.players[defenderId]?.isDefending) ? 1.5 : 1);
                        
                        const battleResult = resolveBattle(stats.atk, defValue);

                        if (battleResult.isWin) {
                            currentState.districts[target.dId] = npcId;
                            npc.spotId = target.spotId;
                            npc.districtId = target.dId;
                            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`⚔️ ${npc.username}: ${target.name} を制圧しました！`);

                            io.to(roomId).emit(SERVER_EVENTS.BATTLE_RESULT, {
                                winnerId: npcId,
                                loserId: defenderId || null,
                                hpDamage: 0,
                                districtId: target.dId
                            });
                            
                            io.to(roomId).emit(SERVER_EVENTS.TERRITORY_UPDATED, {
                                districtId: target.dId,
                                owner: npcId,
                                team: npc.teamColor
                            });
                        } else {
                            npc.hp = Math.max(0, npc.hp - 20);
                            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`❌ ${npc.username}: ${target.name} への侵攻に失敗しました。`);

                            io.to(roomId).emit(SERVER_EVENTS.BATTLE_RESULT, {
                                winnerId: defenderId || null,
                                loserId: npcId,
                                hpDamage: 20,
                                districtId: target.dId
                            });
                        }
                    }
                } else {
                    npc.hp = Math.min(npc.maxHp, npc.hp + 20);
                    npc.ap = Math.min(npc.maxAp, npc.ap + 30); 
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`🧘 ${npc.username}: 移動先が見つからないため休息します。`);
                }
            } catch (innerErr) {
                console.error("NPC行動実行エラー:", innerErr);
            } finally {
                setTimeout(() => finalizeTurn(roomId, npcId), 1500);
            }
        }, 1000);
    } catch (globalNpcErr) {
        console.error("NPCターン処理全体エラー:", globalNpcErr);
        setTimeout(() => finalizeTurn(roomId, roomState.turnOwnerId), 1500);
    }
}

// ==========================================
// 🔄 ターン終了処理とゲーム終了判定
// ==========================================
function finalizeTurn(roomId, currentId) {
    const roomState = rooms.get(roomId);
    if (!roomState) return;

    try {
        console.log(`[finalizeTurn] 開始: roomId=${roomId} currentId=${currentId}`);
        
        const currentPlayer = roomState.players[currentId];
        if (currentPlayer && typeof currentPlayer.faithRegen === 'number') {
            currentPlayer.faith += currentPlayer.faithRegen;
        }

        // ==========================================
        // ★ BUG FIX: 所有地区数ゼロによる即時敗北チェック
        // ==========================================
        const eliminatedBySpotLoss = getEliminatedBySpotLoss(roomState);
        if (eliminatedBySpotLoss.length > 0) {
            eliminatedBySpotLoss.forEach(pid => {
                const player = roomState.players[pid];
                console.log(`[finalizeTurn] spot elimination: playerId=${pid} username=${player?.username}`);
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,
                    `💀 ${player?.username ?? pid}: 全地区を失い敗北しました！`
                );
            });
            handleGameOver(roomId, roomState.turnOrder || Object.keys(roomState.players));
            return;
        }
        // ==========================================

        const isAllConquered = checkAllConquered(roomState);
        const isSomeoneDead = Object.values(roomState.players).some(p => p && p.hp <= 0);

        if (!Array.isArray(roomState.turnOrder) || roomState.turnOrder.length === 0) {
            roomState.turnOrder = Object.keys(roomState.players);
        }

        let currentIndex = roomState.turnOrder.indexOf(currentId);
        if (currentIndex === -1) {
            currentIndex = roomState.turnIndex || 0;
        }
        
        const nextIndex = (currentIndex + 1) % roomState.turnOrder.length;
        const nextId = roomState.turnOrder[nextIndex];

        roomState.turnIndex = nextIndex;
        roomState.turnOwnerId = nextId;

        if (nextIndex === 0) {
            roomState.turn = (roomState.turn || 0) + 1;
        }

        if (roomState.turn > roomState.maxTurn || isAllConquered || isSomeoneDead) {
            handleGameOver(roomId, roomState.turnOrder);
            return;
        }

        console.log(`[finalizeTurn] 進捗: 次のターンは nextId=${nextId} turn=${roomState.turn}`);
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        
        const basePayload = {
            turn: roomState.turn,
            turnOwnerId: nextId,
            turnOwnerName: roomState.players[nextId]?.username || "NPC",
            isMyTurn: false
        };

        io.to(roomId).emit(SERVER_EVENTS.TURN_START, basePayload);

        roomState.turnOrder.forEach(playerId => {
            if (!roomState.players[playerId]?.isNpc) {
                io.to(playerId).emit(SERVER_EVENTS.TURN_START, {
                    ...basePayload,
                    isMyTurn: playerId === nextId
                });
            }
        });

        if (roomState.players[nextId]?.isNpc) {
            setTimeout(() => processNpcTurn(roomId), 2000);
        }
    } catch (error) {
        console.error(`🔥 [finalizeTurn] 致命的エラー:`, error);
    } finally {
        roomState.isProcessingAction = false; 
    }
}

async function handleGameOver(roomId, playerIds) {
    const roomState = rooms.get(roomId);
    if (!roomState) return;

    roomState.status = 'finished';
    io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
    
    const scores = {};
    playerIds.forEach(id => scores[id] = 0);
    Object.values(roomState.districts).forEach(ownerId => {
        if (scores[ownerId] !== undefined) scores[ownerId]++;
    });

    const sortedPlayers = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const winnerId = sortedPlayers[0];
    const loserId = sortedPlayers[1] || null;

    const winner = roomState.players[winnerId];
    const loser = roomState.players[loserId];

    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`🏆 ゲーム終了！勝者: ${winner?.username} (${scores[winnerId]} 拠点)`);
    io.to(roomId).emit(SERVER_EVENTS.GAME_OVER, { winnerId, scores });

    if (winner && !winner.isNpc && winner.token) {
        try {
            const res = await fetch(`${API_BASE_URL}result.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${winner.token}`
                },
                body: JSON.stringify({
                    room_key: roomId,
                    winner_id: winner.dbUserId,
                    loser_id: loser?.dbUserId,
                    winner_score: scores[winnerId],
                    loser_score: scores[loserId] || 0
                })
            });
            const data = await res.json();
            console.log(`✅ [Room ${roomId}] 試合結果DB保存完了:`, data);
        } catch (err) {
            console.error(`❌ [Room ${roomId}] 試合結果保存エラー:`, err);
        }
    }
}

// ==========================================
// 🔌 Socket.io 通信イベント
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);
    socket.authToken = socket.handshake.auth?.token || "";
    
    socket.on('RECOVER_CONNECTION', (data) => {
        const roomId = data?.roomId;
        const playerName = data?.playerName;
        if (!roomId || !playerName) return;
        
        if (!rooms.has(roomId)) {
            socket.emit(SERVER_EVENTS.ERROR_MESSAGE, { reason: 'room_destroyed', message: 'ルームが存在しないか解散されました。タイトルに戻ります。' });
            return;
        }

        const roomState = rooms.get(roomId);
        let p = Object.values(roomState.players).find(pl => pl.username === playerName || pl.playerName === playerName);
        if (p && p.id !== socket.id) {
            const oldId = p.id;
            p.id = socket.id;
            roomState.players[socket.id] = p;
            delete roomState.players[oldId];

            if (roomState.turnOrder) {
                const idx = roomState.turnOrder.indexOf(oldId);
                if (idx !== -1) roomState.turnOrder[idx] = socket.id;
            }

            socket.join(roomId);
            socket.roomId = roomId;
            console.log(`[RECOVER] Player ${p.username} auto-recovered in room ${roomId} upon reconnect`);
            
            if (roomDeleteTimers.has(roomId)) {
                clearTimeout(roomDeleteTimers.get(roomId));
                roomDeleteTimers.delete(roomId);
            }
        } else if (p && p.id === socket.id && !socket.roomId) {
            socket.join(roomId);
            socket.roomId = roomId;
        }
    });

    socket.on('CREATE_ROOM', async (config, callback) => {
        let roomId = generateRoomId();
        while (rooms.has(roomId)) {
            roomId = generateRoomId();
        }

        const roomState = createInitialGameState(config?.maxPlayers || 4);
        roomState.roomId = roomId;
        rooms.set(roomId, roomState);
        
        socket.join(roomId);
        socket.roomId = roomId;

        const teamInfo = TEAM_CONFIG[0];
        let baseStats = { hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 50, def: 40, faith: 1.0 };
        let godName = "なし";
        let inventory = [];

        if (socket.authToken) {
            try {
                const res = await fetch(`${API_BASE_URL}get-user.php`, {
                    headers: { 'Authorization': `Bearer ${socket.authToken}` }
                });
                const dbUser = await res.json();
                
                if (dbUser && dbUser.status === 'success' && dbUser.user) {
                    godName = dbUser.user.god_name || "名もなき神";
                    inventory = dbUser.user.inventory || [];
                }
            } catch (e) {
                console.error("❌ [DB] ユーザー・神データ取得エラー:", e);
            }
        }

        roomState.players[socket.id] = {
            id: socket.id,
            username: config.username || "Commander",
            playerName: config.username || "Commander",
            dbUserId: config.id || null,
            token: socket.authToken,
            godName: godName,
            selectedGodId: null,
            ...baseStats,
            inventory: inventory,
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: false,
            isNpc: false,
            isDefending: false,
            spotId: null, 
            districtId: null 
        };
        
        console.log(`🏠 Room[${roomId}] Created (Max: ${roomState.maxPlayers}) by ${socket.id}`);
        roomState.players[socket.id].isHost = true;
        
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        broadcastLobbyUpdate(roomId, roomState);

        if (callback) callback({ success: true, roomId: roomId });
    });

    socket.on('JOIN_ROOM', async (data, callback) => {
        const roomId = data.roomId?.toUpperCase();
        const roomState = rooms.get(roomId);

        if (!roomState) {
            if (callback) callback({ success: false, message: "Room not found" });
            socket.emit(SERVER_EVENTS.ERROR_MESSAGE, "指定された部屋が存在しません");
            return;
        }

        let existingPlayerId = Object.keys(roomState.players).find(
            id => roomState.players[id].username === data.username
        );
        if (existingPlayerId) {
            const oldSocket = io.sockets.sockets.get(existingPlayerId);
            if (oldSocket && oldSocket.connected) {
                data.username = `${data.username} (2)`; 
            } else {
                delete roomState.players[existingPlayerId];
            }
        }

        const playerCount = Object.keys(roomState.players).length;
        if (playerCount >= roomState.maxPlayers) {
            if (callback) callback({ success: false, message: "Room is full" });
            socket.emit(SERVER_EVENTS.ERROR_MESSAGE, "ルームはすでに満員です");
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        const teamInfo = TEAM_CONFIG[playerCount];
        let baseStats = { hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 50, def: 40, faith: 1.0 };
        let godName = "なし";
        let inventory = [];

        if (socket.authToken) {
            try {
                const res = await fetch(`${API_BASE_URL}get-user.php`, {
                    headers: { 'Authorization': `Bearer ${socket.authToken}` }
                });
                const dbUser = await res.json();
                
                if (dbUser && dbUser.status === 'success' && dbUser.user) {
                    godName = dbUser.user.god_name || "名もなき神";
                    inventory = dbUser.user.inventory || [];
                }
            } catch (e) {}
        }
        
        roomState.players[socket.id] = {
            id: socket.id,
            username: data?.username || `Player ${playerCount + 1}`,
            playerName: data?.username || `Player ${playerCount + 1}`,
            dbUserId: data?.id || null,
            token: socket.authToken,
            godName: godName,
            selectedGodId: null,
            isHost: playerCount === 0, 
            ...baseStats,
            inventory: inventory,
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: false,
            isNpc: false,
            isDefending: false,
            spotId: null,
            districtId: null
        };

        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        broadcastLobbyUpdate(roomId, roomState);

        if (callback) callback({ success: true, maxPlayers: roomState.maxPlayers });
    });

    const handleAddNpc = (data) => {
        const roomId = socket.roomId || data?.roomId;
        if (!roomId) return socket.emit(SERVER_EVENTS.ERROR_MESSAGE, { reason: 'room_not_found' });
        
        const roomState = rooms.get(roomId);
        if (!roomState) return socket.emit(SERVER_EVENTS.ERROR_MESSAGE, { reason: 'room_not_found' });

        const currentCount = Object.keys(roomState.players).length;
        if (currentCount >= roomState.maxPlayers) return socket.emit(SERVER_EVENTS.ERROR_MESSAGE, { reason: 'room_full' });

        const npcId = `npc_${Date.now()}`;
        const teamInfo = TEAM_CONFIG[currentCount];

        const pickedGodIds = Object.values(roomState.players)
            .map(p => Number(p.selectedGodId))
            .filter(id => id !== 0 && !isNaN(id));

        const availableGodIds = [1, 2, 3, 4, 5, 6, 7, 8].filter(id => !pickedGodIds.includes(id));
        const randomGodId = availableGodIds.length > 0 
            ? availableGodIds[Math.floor(Math.random() * availableGodIds.length)]
            : 1;

        let startDistrictId, startSpotId;
        const sacredId = GOD_SACRED_LANDS[randomGodId]?.sacredDistrictId;
        
        if (sacredId && !roomState.districts[sacredId]) {
            startDistrictId = sacredId;
            startSpotId = getSpawnSpot(randomGodId) || String(sacredId) + "01";
        } else {
            const allDistrictIds = Object.keys(DISTRICTS_MASTER);
            const occupiedIds = new Set(Object.keys(roomState.districts));
            const freeDistrictIds = allDistrictIds.filter(id => !occupiedIds.has(id));
            startDistrictId = freeDistrictIds.length > 0
                ? freeDistrictIds[Math.floor(Math.random() * freeDistrictIds.length)]
                : allDistrictIds[Math.floor(Math.random() * allDistrictIds.length)];
            startSpotId = String(startDistrictId) + "01";
        }

        roomState.players[npcId] = {
            id: npcId,
            username: `NPC_BOT`,
            playerName: `NPC_BOT`,
            dbUserId: null, token: null, godName: "セブの精霊",
            selectedGodId: randomGodId,
            hp: 100, maxHp: 100, ap: 100, maxAp: 100,
            atk: 50, def: 40, faith: 1.0,
            inventory: [],
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: true,
            isNpc: true,
            spotId: String(startSpotId),
            districtId: String(startDistrictId),
            isDefending: false,
        };

        applyGodBonus(roomState.players[npcId], randomGodId);
        roomState.districts[String(startDistrictId)] = npcId;

        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,
            `🤖 ${roomState.players[npcId].username} が ${DISTRICTS_MASTER[startDistrictId]?.name || startDistrictId} に展開しました！`
        );
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        broadcastLobbyUpdate(roomId, roomState);
    };

    socket.on('ADD_NPC', handleAddNpc);
    socket.on('add_npc_request', handleAddNpc);

    socket.on(CLIENT_EVENTS.ENTER_GOD_SELECTION, (data) => {
        const roomId = socket.roomId || data?.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        roomState.phase = 'selection'; 
        Object.values(roomState.players).forEach(p => {
            if (!p.isNpc) p.isReady = false;
        });

        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        broadcastLobbyUpdate(roomId, roomState);
    });

    socket.on(CLIENT_EVENTS.SELECT_GOD, (data) => {
        const roomId = socket.roomId || data?.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        const godIdNum = Number(data.godId);
        const alreadyTaken = Object.values(roomState.players).some(
            p => p.id !== socket.id && p.selectedGodId === godIdNum
        );

        if (alreadyTaken) {
            socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: 'already_taken', godKey: godIdNum });
            return;
        }

        let p = roomState.players[socket.id];
        if (p) {
            p.selectedGodId = godIdNum;
            applyGodBonus(p, godIdNum); 
            
            const sacredDistrictId = getSacredDistrict(godIdNum); 
            const spawnSpot = getSpawnSpot(godIdNum);            
            if (sacredDistrictId != null) {
                const sacredId = String(sacredDistrictId);        

                roomState.districts[sacredId] = socket.id;
                p.districtId = sacredId;
                p.spotId     = String(spawnSpot);

                console.log(`✨ [Room ${roomId}] ${p.username} に聖地 district=${sacredId}(3桁), spot=${spawnSpot}(5桁) を付与しました`);
            }
            
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            broadcastLobbyUpdate(roomId, roomState);
        }
    });

    socket.on(CLIENT_EVENTS.READY_TO_START, (data) => {
        const roomId = socket.roomId || data?.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        let p = roomState.players[socket.id];
        if (p) {
            p.isReady = data.ready !== undefined ? data.ready : true;
            
            if (data.startDistrictId && !p.districtId) {
                p.districtId = String(data.startDistrictId);
                p.spotId = String(data.startDistrictId) + "01";
                roomState.districts[p.districtId] = socket.id;
            }

            broadcastLobbyUpdate(roomId, roomState);

            const playersArr = Object.values(roomState.players);
            const currentCount = playersArr.length;
            const maxPlayers = roomState.maxPlayers;
            
            const allGodsSelected = playersArr.every(pl => pl.selectedGodId !== null);
            const allReady = currentCount > 0 && playersArr.every(pl => pl.isReady === true);

            if (currentCount >= maxPlayers && allReady && allGodsSelected) {
                roomState.status = 'playing';
                roomState.turn = 1;
                
                roomState.turnOrder = Object.keys(roomState.players);
                roomState.turnIndex = 0;
                roomState.isProcessingAction = false;

                const firstId = roomState.turnOrder[0];
                roomState.firstPlayerId = firstId;
                roomState.turnOwnerId = firstId;
                
                io.to(roomId).emit(SERVER_EVENTS.GAME_START);
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
                
                const basePayload = {
                    turn: 1,
                    turnOwnerId: firstId,
                    turnOwnerName: roomState.players[firstId]?.username || "Commander",
                    isMyTurn: false
                };

                io.to(roomId).emit(SERVER_EVENTS.TURN_START, basePayload);

                roomState.turnOrder.forEach(playerId => {
                    if (!roomState.players[playerId]?.isNpc) {
                        io.to(playerId).emit(SERVER_EVENTS.TURN_START, {
                            ...basePayload,
                            isMyTurn: playerId === firstId
                        });
                    }
                });
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`⚔️ 作戦開始！全オペレーターの同期に成功しました。`);
            } else {
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            }
        }
    });

    socket.on('LOBBY_COMMENCE', (data) => {
        const roomId = socket.roomId || data?.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        roomState.status = 'playing';
        roomState.turn = 1;
        roomState.turnOrder = Object.keys(roomState.players); 
        roomState.turnIndex = 0;
        roomState.isProcessingAction = false;
        
        const firstId = roomState.turnOrder[0];
        roomState.turnOwnerId = firstId;

        io.to(roomId).emit(SERVER_EVENTS.GAME_START, {
            mapData: roomState.districts,
            players: roomState.players,
            status: 'playing'
        });

        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));

        const basePayload = {
            turn: 1,
            turnOwnerId: firstId,
            turnOwnerName: roomState.players[firstId]?.username || "Commander",
            isMyTurn: false
        };

        io.to(roomId).emit(SERVER_EVENTS.TURN_START, basePayload);

        roomState.turnOrder.forEach(playerId => {
            if (!roomState.players[playerId]?.isNpc) {
                io.to(playerId).emit(SERVER_EVENTS.TURN_START, {
                    ...basePayload,
                    isMyTurn: playerId === firstId
                });
            }
        });

        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `⚔️ 作戦強制開始！ターン巡回オーダーを確定しました。`);

        if (roomState.players[firstId]?.isNpc) {
            setTimeout(() => processNpcTurn(roomId), 2000);
        }
    });

    const handleActionSubmit = async (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || roomState.turnOwnerId !== socket.id) return;

        if (roomState.isProcessingAction) {
            socket.emit(SERVER_EVENTS.ERROR_MESSAGE, "アクション処理中です。次のターン移行までお待ちください。");
            return;
        }
        roomState.isProcessingAction = true;

        try {
            const p = roomState.players[socket.id];
            p.isDefending = false;

            const stats = calculateFinalStats(roomId, socket.id);
            const targetSpotId = String(data.targetId || p.spotId);
            const targetDistrictId = String(Math.floor(Number(targetSpotId) / 100));

            const rawNeighbors = getNeighbors(p.spotId);
            const neighbors = Array.isArray(rawNeighbors) ? rawNeighbors.map(String) : [];

            if (data.type === 'attack' || data.type === 'move') {
                if (neighbors.length > 0 && !neighbors.includes(targetSpotId)) {
                    socket.emit(SERVER_EVENTS.ERROR_MESSAGE, "隣接していないspotには移動・攻撃できません。");
                    roomState.isProcessingAction = false; 
                    return;
                }

                if (data.type === 'attack') {
                    p.ap = Math.max(0, p.ap - 5);
                    const defenderId = roomState.districts[targetDistrictId];
                    const defender  = defenderId ? roomState.players[defenderId] : null;
                    const defBase   = defenderId ? calculateFinalStats(roomId, defenderId).def : 30;
                    const defValue  = defBase * (defender?.isDefending ? 1.5 : 1);
                    const result = resolveBattle(stats.atk, defValue);

                    if (result.isWin) {
                        roomState.districts[targetDistrictId] = socket.id;
                        p.spotId = targetSpotId;
                        p.districtId = targetDistrictId;
                        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `⚔️ ${p.username}: ${targetSpotId} を制圧！`);

                        io.to(roomId).emit(SERVER_EVENTS.BATTLE_RESULT, {
                            winnerId: socket.id,
                            loserId: defenderId || null,
                            hpDamage: 0,
                            districtId: targetDistrictId
                        });

                        io.to(roomId).emit(SERVER_EVENTS.TERRITORY_UPDATED, {
                            districtId: targetDistrictId,
                            owner: socket.id,
                            team: p.teamColor
                        });

                        if (!p.isNpc && p.token) {
                            try {
                                const response = await fetch(`${API_BASE_URL}capture.php`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.token}` },
                                    body: JSON.stringify({
                                        room_key: roomId,
                                        territory_id: parseInt(targetDistrictId)
                                    })
                                });
                                const dbResult = await response.json();
                                console.log(`✅ [Room ${roomId} DB] 陣地 ${targetDistrictId} 制圧:`, dbResult.message || dbResult);
                                if (dbResult.dropped_item) {
                                    p.inventory.push(dbResult.dropped_item);
                                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🎁 ${p.username} が戦利品【${dbResult.dropped_item.name}】を獲得！`);
                                }
                            } catch (err) {
                                console.error(`❌ [Room ${roomId} DB] 陣地保存失敗:`, err);
                            }
                        }
                    } else {
                        p.hp = Math.max(0, p.hp - 20);
                        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `❌ ${p.username}: ${targetSpotId} への攻撃に失敗。`);

                        io.to(roomId).emit(SERVER_EVENTS.BATTLE_RESULT, {
                            winnerId: defenderId || null,
                            loserId: socket.id,
                            hpDamage: 20,
                            districtId: targetDistrictId
                        });
                    }
                } else if (data.type === 'move') {
                    p.spotId = targetSpotId;
                    p.districtId = targetDistrictId;
                    p.ap = Math.max(0, p.ap - 5);
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🚚 ${p.username}: ${targetSpotId} へ移動。`);
                }

            } else if (data.type === 'stay') {
                p.hp = Math.min(p.maxHp, p.hp + 20);
                p.ap = Math.min(p.maxAp, p.ap + 30); 
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🧘 ${p.username}: 休息を選択。`);

            } else if (data.type === 'defend') {
                p.isDefending = true;
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🛡️ ${p.username}: 守りを固めました。`);

            } else if (data.type === 'escape') {
                const myDistricts = Object.keys(roomState.districts)
                    .filter(id => roomState.districts[id] === socket.id);

                if (myDistricts.length > 0) {
                    const dest = myDistricts[Math.floor(Math.random() * myDistricts.length)];
                    p.districtId = dest;
                    p.spotId = String(dest) + "01";
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `💨 ${p.username}: 自陣 ${dest} へ撤退しました。`);
                } else {
                    p.hp = Math.max(0, p.hp - 50);
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `💥 ${p.username}: 逃げ場がなくダメージを受けた！`);
                }

            } else if (data.type === 'turn_end') {
                finalizeTurn(roomId, socket.id);
                return;
            }

        } catch (globalErr) {
            console.error(`❌ [ACTION_SUBMIT 致命的エラー]:`, globalErr);
        } finally {
            roomState.isProcessingAction = false; 
            socket.emit(SERVER_EVENTS.ACTION_RESULT, { state: sanitizeRoomState(roomState) }); 
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        }
    };

    socket.on(CLIENT_EVENTS.ACTION_SUBMIT, handleActionSubmit);
    socket.on('actionSubmit', handleActionSubmit); 

    socket.on(CLIENT_EVENTS.TURN_END_SUBMIT, () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (roomState && roomState.turnOwnerId === socket.id) {
            finalizeTurn(roomId, socket.id);
        }
    });

    socket.on(CLIENT_EVENTS.ACTION_DEFEND, () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || roomState.turnOwnerId !== socket.id) return;
        if (roomState.isProcessingAction) return;
        roomState.isProcessingAction = true;

        const p = roomState.players[socket.id];
        p.isDefending = true;
        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🛡️ ${p.username}: 守りを固めました（次の攻撃への防御力1.5倍）。`);
        socket.emit(SERVER_EVENTS.ACTION_RESULT, { state: sanitizeRoomState(roomState) }); 
        
        finalizeTurn(roomId, socket.id);
    });

    socket.on(CLIENT_EVENTS.ACTION_ESCAPE, () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || roomState.turnOwnerId !== socket.id) return;
        if (roomState.isProcessingAction) return;
        roomState.isProcessingAction = true;

        const p = roomState.players[socket.id];
        p.isDefending = false;
        const myDistricts = Object.keys(roomState.districts)
            .filter(id => roomState.districts[id] === socket.id);

        if (myDistricts.length > 0) {
            const dest = myDistricts[Math.floor(Math.random() * myDistricts.length)];
            p.districtId = dest;
            p.spotId = String(dest) + "01";
            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `💨 ${p.username}: 自陣 ${dest} へ撤退しました。`);
        } else {
            p.hp = Math.max(0, p.hp - 50);
            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `💥 ${p.username}: 逃げ場がなくダメージを受けた！`);
        }
        socket.emit(SERVER_EVENTS.ACTION_RESULT, { state: sanitizeRoomState(roomState) }); 
        
        finalizeTurn(roomId, socket.id);
    });

    socket.on(CLIENT_EVENTS.ACTION_USE_ITEM, async ({ itemId }) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || roomState.turnOwnerId !== socket.id) return;
        
        const p = roomState.players[socket.id];
        if (!p || p.isNpc) return;

        const itemIndex = p.inventory.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: 'ITEM_NOT_FOUND' });
            return;
        }

        const item = p.inventory[itemIndex];
        switch (item.type) {
            case 'ATK_BUFF': p.atk += item.value; break;
            case 'HP_RECOVER': p.hp = Math.min(p.maxHp, p.hp + item.value); break;
            case 'AP_RECOVER': p.ap = Math.min(p.maxAp, p.ap + item.value); break;
            case 'FAITH_UP': p.faith *= item.multiplier; break;
        }

        p.inventory.splice(itemIndex, 1);

        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, { message: `🧪 ${p.username} が ${item.name} を使用した！` });
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));

        if (p.token) {
            try {
                await fetch(`${API_BASE_URL}use-item.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.token}` },
                    body: JSON.stringify({ item_id: itemId })
                });
            } catch (err) {}
        }
    });

    socket.on(CLIENT_EVENTS.SEND_CHAT, (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const roomState = rooms.get(roomId);
        const p = roomState?.players[socket.id];
        if (!p) return;
        
        io.to(roomId).emit(SERVER_EVENTS.RECEIVE_CHAT, {
            senderId: socket.id,
            username: p.username,
            message: data.message,
            timestamp: Date.now()
        });
    });

    socket.on(CLIENT_EVENTS.LEAVE_ROOM, (data) => {
        const roomId = data?.roomId || socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || !roomState.players[socket.id]) return;

        const wasTurnOwner = (roomState.turnOwnerId === socket.id);
        
        if (roomState.turnOrder) {
            roomState.turnOrder = roomState.turnOrder.filter(id => id !== socket.id);
        }

        delete roomState.players[socket.id];
        socket.leave(roomId);
        socket.roomId = null;

        const remaining = Object.keys(roomState.players);
        if (remaining.length === 0) {
            rooms.delete(roomId);
        } else {
            io.to(roomId).emit(SERVER_EVENTS.PLAYER_DISCONNECTED, socket.id);
            if (wasTurnOwner && roomState.status === 'playing') {
                roomState.isProcessingAction = false;
                finalizeTurn(roomId, socket.id);
            } else {
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
                broadcastLobbyUpdate(roomId, roomState);
            }
        }
    });

    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        if (!roomId) return;

        const roomState = rooms.get(roomId);
        if (!roomState || !roomState.players[socket.id]) return;

        const disconnectedId = socket.id;
        const wasTurnOwner = (roomState.turnOwnerId === disconnectedId);

        if (roomState.turnOrder) {
            roomState.turnOrder = roomState.turnOrder.filter(id => id !== disconnectedId);
        }

        delete roomState.players[disconnectedId];

        const remaining = Object.keys(roomState.players);
        if (remaining.length === 0) {
            const timer = setTimeout(() => {
                rooms.delete(roomId);
                roomDeleteTimers.delete(roomId);
            }, 15000);
            roomDeleteTimers.set(roomId, timer);
            return;
        }

        io.to(roomId).emit(SERVER_EVENTS.PLAYER_DISCONNECTED, disconnectedId);

        if (wasTurnOwner && roomState.status === 'playing') {
            roomState.isProcessingAction = false;
            roomState.turnIndex = roomState.turnIndex % roomState.turnOrder.length;
            const nextId = roomState.turnOrder[roomState.turnIndex];
            roomState.turnOwnerId = nextId;

            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            io.to(roomId).emit(SERVER_EVENTS.TURN_START, {
                turn: roomState.turn,
                turnOwnerId: nextId,
                turnOwnerName: roomState.players[nextId]?.username || "NPC",
                isMyTurn: false
            });
            if (roomState.players[nextId]?.isNpc) {
                setTimeout(() => processNpcTurn(roomId), 2000);
            }
        } else {
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            broadcastLobbyUpdate(roomId, roomState);
        }
    });
});

setInterval(() => {
    rooms.forEach((roomState, roomId) => {
        if (Object.keys(roomState.players).length > 0) {
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        }
    });
}, 5000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Heavy Tactical Server Running on port ${PORT}`);
});