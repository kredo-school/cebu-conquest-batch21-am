// server/index.js

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/socketEvents.js';
import { getNeighbors } from '../shared/adjacency.js';

const app = express();
const server = http.createServer(app);
const PORT = 3001;
// GDD準拠: CORSは文字列で設定
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// ==========================================
// 🚀 【設定】APIとチームカラー設定
// ==========================================
const API_BASE_URL = 'http://localhost/cebu-conquest-batch21-am/api/';

const TEAM_CONFIG = [
    { id: 'red', name: 'レッド', color: '#e74c3c' },
    { id: 'blue', name: 'ブルー', color: '#3498db' },
    { id: 'green', name: 'グリーン', color: '#2ecc71' },
    { id: 'yellow', name: 'イエロー', color: '#f1c40f' }
];

// ==========================================
// 🚀 【27地区マスタ】すべての地区のバフと優先度
// ==========================================
const DISTRICTS_MASTER = {
    // ── セブ市街地エリア（エリアID: 11）──
    "11101": { name: "Maya Port（マヤ港）", priority: 5, buff: { atk: 8, def: 8 } },
    "11102": { name: "Sugarcane Field（サトウキビ畑）", priority: 4, buff: { atk: 5, def: 5 } },
    "11103": { name: "Northern Hills（北の丘）", priority: 5, buff: { atk: 10, def: 5 } },
    "11104": { name: "Coastal Road（沿岸道路）", priority: 4, buff: { atk: 5, def: 10 } },
    "11105": { name: "Central Cebu（セブ中央）", priority: 6, buff: { atk: 8, def: 8 } },
    "11106": { name: "Harbor Gate（港門）", priority: 5, buff: { atk: 10, def: 5 } },
    "11108": { name: "Farmer House（農家）", priority: 3, buff: { atk: 5, def: 5 } },
    "11109": { name: "River Crossing（川渡り）", priority: 4, buff: { atk: 5, def: 10 } },
    "11112": { name: "Bogo Transit Terminal（ボゴバスターミナル）", priority: 7, buff: { atk: 5, def: 15 } },
    "11113": { name: "Bogo Hilltop Shrine（ボゴ丘の神社）", priority: 8, buff: { atk: 12, def: 12 } },
    "11115": { name: "Coastal Outpost（沿岸前哨基地）", priority: 5, buff: { atk: 10, def: 5 } },
    "11116": { name: "Western Ridge（西の尾根）", priority: 5, buff: { atk: 8, def: 8 } },
    "11117": { name: "Sacred Spring（聖泉）", priority: 6, buff: { atk: 0, def: 20 } },
    "11118": { name: "Jungle Path（ジャングルの道）", priority: 4, buff: { atk: 10, def: 5 } },
    "11119": { name: "Marine Giant（海の巨人）", priority: 10, buff: { atk: 25, def: 0 } },
    "11120": { name: "Heritage Gourmet（ヘリテージグルメ）", priority: 8, buff: { atk: 0, def: 25 } },
    "11121": { name: "Sunset Cove（夕日の入り江）", priority: 6, buff: { atk: 10, def: 10 } },
    // ── 北部エリア（エリアID: 13）──
    "13101": { name: "IT Park（ITパーク）", priority: 9, buff: { atk: 15, def: 10 } },
    "13102": { name: "Waterfront Hotel（ウォーターフロントホテル）", priority: 7, buff: { atk: 10, def: 10 } },
    "13103": { name: "Ayala Malls Center（アヤラモール）", priority: 8, buff: { atk: 5, def: 15 } },
    "13201": { name: "Carbon Market（カーボンマーケット）", priority: 6, buff: { atk: 8, def: 8 } },
    "13204": { name: "Basilica del Santo Nino（サント・ニーニョ大聖堂）", priority: 9, buff: { atk: 0, def: 25 } },
};

// 隣接リストは shared/adjacency.js で一元管理（getNeighbors を使用）

// ==========================================
// 🚀 【設定】ルーム管理とゲーム状態の初期化
// ==========================================
const rooms = new Map();

// BUG-005: SYNC_STATE 送信前に各プレイヤーのJWT等の機微情報を除去
function sanitizeRoomState(roomState) {
    if (!roomState) return roomState;
    const safePlayers = {};
    for (const [id, p] of Object.entries(roomState.players)) {
        const { token, dbUserId, authToken, ...safe } = p;
        safePlayers[id] = safe;
    }
    return { ...roomState, players: safePlayers };
}

// 新しい部屋の gameState を生成する関数
function createInitialGameState(maxPlayers = 4) {
    return {
        roomId: null,
        status: 'waiting', 
        turn: 0, 
        maxTurn: 30, // Day 10 (3ターン×10日分)
        maxPlayers: maxPlayers,
        turnOwnerId: null, 
        firstPlayerId: null,
        players: {}, 
        districts: {} 
    };
}

// 汎用的なランダムID生成関数（部屋ID用）
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==========================================
// ⚔️ バトル＆ステータス計算（roomId対応）
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

    return {
        atk: p.atk + bonusAtk,
        def: p.def + bonusDef,
        displayAtk: p.atk + bonusAtk,
        displayDef: p.def + bonusDef
    };
}

function resolveBattle(atk, def) {
    const total = atk + def;
    const winProb = total === 0 ? 0.5 : atk / total;
    const dice = Math.random();
    return { isWin: dice < winProb, prob: winProb };
}

// ==========================================
// 🤖 タクティカル・ラプパプ AIエンジン (ルーム対応)
// ==========================================
function processNpcTurn(roomId) {
    const roomState = rooms.get(roomId);
    if (!roomState || roomState.status !== 'playing') return;

    const npcId = roomState.turnOwnerId;
    const npc = roomState.players[npcId];
    if (!npc || !npc.isNpc) return;

    npc.isDefending = false;

    const stats = calculateFinalStats(roomId, npcId);
    const neighbors = getNeighbors(npc.districtId).map(String);

    let targets = neighbors.map(id => {
        const ownerId = roomState.districts[id];
        const master = DISTRICTS_MASTER[id];
        let score = master ? master.priority : 1;

        if (ownerId && ownerId !== npcId) score += 15;
        if (!ownerId) score += 5;
        
        return { id, score, ownerId, name: master ? master.name : `地区${id}` };
    });

    targets.sort((a, b) => b.score - a.score);

    setTimeout(() => {
        const currentState = rooms.get(roomId);
        if(!currentState) return;

        if (npc.hp < 30) {
            npc.hp = Math.min(npc.maxHp, npc.hp + 20);
            npc.ap = Math.min(npc.maxAp, npc.ap + 30);
            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`🧘 ${npc.username}: 休息を選び、体制を整えています。`);
        } else if (targets.length > 0) {
            const target = targets[0];

            if (target.ownerId === npcId) {
                npc.districtId = target.id;
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`🚚 ${npc.username}: ${target.name} へ本陣を移しました。`);
            } else {
                npc.ap -= 5;
                const defenderId = target.ownerId;
                const defValue = defenderId ? calculateFinalStats(roomId, defenderId).def : 35;
                
                const battleResult = resolveBattle(stats.atk, defValue);

                if (battleResult.isWin) {
                    currentState.districts[target.id] = npcId;
                    npc.districtId = target.id;
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`⚔️ ${npc.username}: ${target.name} を制圧しました！`);
                } else {
                    npc.hp -= 20;
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`❌ ${npc.username}: ${target.name} への侵攻に失敗しました。`);
                }
            }
        }
        
        setTimeout(() => finalizeTurn(roomId, npcId), 1500);
    }, 1000);
}

// ==========================================
// 🔄 ターン終了処理とゲーム終了判定
// ==========================================
function finalizeTurn(roomId, currentId) {
    const roomState = rooms.get(roomId);
    if (!roomState) return;

    const playerIds = Object.keys(roomState.players);
    const currentIndex = playerIds.indexOf(currentId);
    
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextId = playerIds[nextIndex];

    roomState.turnOwnerId = nextId;

    if (nextId === roomState.firstPlayerId) {
        roomState.turn++;
    }

    if (roomState.turn > roomState.maxTurn) {
        handleGameOver(roomId, playerIds);
        return; 
    }

    io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
    io.to(roomId).emit(SERVER_EVENTS.TURN_START, {
        turn: roomState.turn,
        turnOwnerId: nextId,
        turnOwnerName: roomState.players[nextId]?.username
    });

    if (roomState.players[nextId]?.isNpc) {
        setTimeout(() => processNpcTurn(roomId), 2000);
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
                    winner_id: winner.dbUserId || 1,
                    loser_id: loser?.dbUserId || 2,
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
    socket.roomId = null;

    // 🚀 1. 部屋作成
    socket.on('CREATE_ROOM', async (config, callback) => {
        const roomId = generateRoomId();
        const roomState = createInitialGameState(config?.maxPlayers || 4);
        roomState.roomId = roomId;
        rooms.set(roomId, roomState);
        
        socket.join(roomId);
        socket.roomId = roomId;

        const teamInfo = TEAM_CONFIG[0];
        let baseStats = { hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 60, def: 45, faith: 1.0 };
        let godName = "なし";
        let inventory = [];

        if (socket.authToken) {
            try {
                const res = await fetch(`${API_BASE_URL}get-user.php`, {
                    headers: { 'Authorization': `Bearer ${socket.authToken}` }
                });
                const dbUser = await res.json();
                
                if (dbUser && dbUser.status === 'success' && dbUser.user) {
                    baseStats.maxHp += dbUser.user.god_buff_hp || 0;
                    baseStats.hp = baseStats.maxHp;
                    baseStats.atk += dbUser.user.god_buff_atk || 0;
                    baseStats.def += dbUser.user.god_buff_def || 0;
                    godName = dbUser.user.god_name || "名もなき神";
                    inventory = dbUser.user.inventory || []; // DBからインベントリを初期ロード
                }
            } catch (e) {
                console.error("❌ [DB] ユーザー・神データ取得エラー:", e);
            }
        }

        roomState.players[socket.id] = {
            id: socket.id,
            username: config.username || "Commander",
            dbUserId: config.id || null,
            token: socket.authToken,
            godName: godName,
            ...baseStats,
            inventory: inventory, // プレイヤー状態にインベントリを持たせる
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: false,
            isNpc: false,
            isDefending: false,
        };
        
        console.log(`🏠 Room[${roomId}] Created (Max: ${roomState.maxPlayers}) by ${socket.id}`);
        
        if (godName !== "なし") {
            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`👼 ${roomState.players[socket.id].username} が【${godName}】の加護を受けてルームを作成！`);
        }

        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        if (callback) callback({ success: true, roomId: roomId });
    });

    // 🚀 2. 部屋参加
    socket.on('JOIN_ROOM', async (data, callback) => {
        const roomId = data.roomId?.toUpperCase();
        const roomState = rooms.get(roomId);

        if (!roomState) {
            if (callback) callback({ success: false, message: "Room not found" });
            socket.emit(SERVER_EVENTS.ERROR_MESSAGE, "指定された部屋が存在しません");
            return;
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
        let baseStats = { hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 60, def: 45, faith: 1.0 };
        let godName = "なし";
        let inventory = [];

        if (socket.authToken) {
            try {
                const res = await fetch(`${API_BASE_URL}get-user.php`, {
                    headers: { 'Authorization': `Bearer ${socket.authToken}` }
                });
                const dbUser = await res.json();
                
                if (dbUser && dbUser.status === 'success' && dbUser.user) {
                    baseStats.maxHp += dbUser.user.god_buff_hp || 0;
                    baseStats.hp = baseStats.maxHp;
                    baseStats.atk += dbUser.user.god_buff_atk || 0;
                    baseStats.def += dbUser.user.god_buff_def || 0;
                    godName = dbUser.user.god_name || "名もなき神";
                    inventory = dbUser.user.inventory || []; // DBからインベントリを初期ロード
                }
            } catch (e) {
                console.error("❌ [DB] ユーザー・神データ取得エラー:", e);
            }
        }
        
        roomState.players[socket.id] = {
            id: socket.id,
            username: data?.username || `Player ${playerCount + 1}`,
            dbUserId: data?.id || null,
            token: socket.authToken,
            godName: godName,
            ...baseStats,
            inventory: inventory, // プレイヤー状態にインベントリを持たせる
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: false,
            isNpc: false,
            isDefending: false,
        };

        console.log(`👤 Joined Room[${roomId}]`);
        if (godName !== "なし") {
            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`👼 ${roomState.players[socket.id].username} が【${godName}】の加護を受けて参戦！`);
        }

        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        if (callback) callback({ success: true });
    });

    // 🚀 【NPCの任意追加】
    socket.on('ADD_NPC', () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        const currentCount = Object.keys(roomState.players).length;
        if (currentCount >= roomState.maxPlayers) return;

        const npcId = `npc_${Date.now()}`;
        const teamInfo = TEAM_CONFIG[currentCount];

        const allDistrictIds = Object.keys(DISTRICTS_MASTER);
        const occupiedIds = new Set(Object.keys(roomState.districts));
        const freeDistrictIds = allDistrictIds.filter(id => !occupiedIds.has(id));

        const startDistrictId = freeDistrictIds.length > 0
            ? freeDistrictIds[Math.floor(Math.random() * freeDistrictIds.length)]
            : allDistrictIds[Math.floor(Math.random() * allDistrictIds.length)];

        roomState.players[npcId] = {
            id: npcId,
            username: `猛将ラプパプ(${teamInfo.name})`,
            dbUserId: null, token: null, godName: "セブの精霊",
            hp: 120, maxHp: 120, ap: 100, maxAp: 100,
            atk: 75, def: 55, faith: 1.0,
            inventory: [],
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: true,
            isNpc: true,
            districtId: String(startDistrictId),
            isDefending: false,
        };

        roomState.districts[String(startDistrictId)] = npcId;

        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,
            `🤖 ${roomState.players[npcId].username} が ${DISTRICTS_MASTER[startDistrictId]?.name || startDistrictId} に展開しました！`
        );
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
    });

    // 🚀 【神の選択】
    socket.on(CLIENT_EVENTS.SELECT_GOD, (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        const p = roomState.players[socket.id];
        if (p) {
            p.selectedGodId = data.godId;
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            console.log(`✨ [Room ${roomId}] ${p.username} selected god: ${data.godId}`);
        }
    });

    // 🚀 3. 準備完了の同期 & ゲーム開始
    socket.on(CLIENT_EVENTS.PLAYER_READY, (data) => {
        const roomId = socket.roomId || data.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        const p = roomState.players[socket.id];
        if (p) {
            p.isReady = data.ready !== undefined ? data.ready : true;
            
            if (data.startDistrictId) {
                p.districtId = String(data.startDistrictId);
                roomState.districts[p.districtId] = socket.id;
            }

            const playersArr = Object.values(roomState.players);
            const currentCount = playersArr.length;
            const maxPlayers = roomState.maxPlayers;

            if (currentCount >= maxPlayers && playersArr.every(pl => pl.isReady)) {
                Object.values(roomState.players).forEach(p => {
                    if (p.isNpc && !p.districtId) {
                        const allDistrictIds = Object.keys(DISTRICTS_MASTER);
                        const occupiedIds = new Set(Object.keys(roomState.districts));
                        const freeIds = allDistrictIds.filter(id => !occupiedIds.has(id));
                        const fallbackId = freeIds[0] || allDistrictIds[0];
                        p.districtId = String(fallbackId);
                        roomState.districts[String(fallbackId)] = p.id;
                        console.log(`🤖 [Room ${roomId}] NPC ${p.username} に緊急スポーン: ${fallbackId}`);
                    }
                });

                roomState.status = 'playing';
                roomState.turn = 1;
                
                const playerIds = Object.keys(roomState.players);
                const firstId = playerIds[0];
                roomState.firstPlayerId = firstId;
                roomState.turnOwnerId = firstId;
                
                io.to(roomId).emit(SERVER_EVENTS.GAME_START);
                
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
                io.to(roomId).emit(SERVER_EVENTS.TURN_START, { 
                    turn: 1, 
                    turnOwnerId: firstId,
                    turnOwnerName: roomState.players[firstId]?.username 
                });
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`⚔️ 作戦開始！全オペレーターの同期に成功しました。`);
                
                console.log(`🎮 [Room ${roomId}] Game Started!`);
            } else {
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            }
        }
    });

    // 🚀 【アクション実行＆ DB保存】
    socket.on(CLIENT_EVENTS.ACTION_SUBMIT, async (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;
        if (roomState.turnOwnerId !== socket.id) return;

        if (roomState.isProcessingAction) {
            socket.emit(SERVER_EVENTS.ERROR_MESSAGE, "処理中です。少し待ってから再試行してください。");
            return;
        }
        roomState.isProcessingAction = true;
        let doFinalize = true;

        try {
            const p = roomState.players[socket.id];
            const targetId = String(data.targetId);
            const stats = calculateFinalStats(roomId, socket.id);

            p.isDefending = false;

            const neighbors = getNeighbors(p.districtId).map(String);
            if (
                (data.type === 'attack' || data.type === 'move') &&
                neighbors &&
                !neighbors.includes(targetId)
            ) {
                socket.emit(SERVER_EVENTS.ERROR_MESSAGE, "隣接していない地区には移動・攻撃できません。");
                doFinalize = false;
                return;
            }

            if (data.type === 'attack') {
                p.ap -= 5;
                const defenderId = roomState.districts[targetId];
                const defender  = defenderId ? roomState.players[defenderId] : null;
                const defBase   = defenderId ? calculateFinalStats(roomId, defenderId).def : 30;
                const defValue  = defBase * (defender?.isDefending ? 1.5 : 1);
                const result = resolveBattle(stats.atk, defValue);

                if (result.isWin) {
                    roomState.districts[targetId] = socket.id;
                    p.districtId = targetId;
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `⚔️ ${p.username}: ${targetId} を制圧！`);

                    if (!p.isNpc && p.token) {
                        try {
                            const response = await fetch(`${API_BASE_URL}capture.php`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.token}` },
                                body: JSON.stringify({ territory_id: parseInt(targetId) })
                            });
                            const dbResult = await response.json();
                            console.log(`✅ [Room ${roomId} DB] 陣地 ${targetId} 制圧:`, dbResult.message || dbResult);

                            if (dbResult.dropped_item) {
                                // 戦利品をサーバーのインベントリに即座に反映
                                p.inventory.push(dbResult.dropped_item);
                                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🎁 ${p.username} が戦利品【${dbResult.dropped_item.name}】を獲得！`);
                            }
                        } catch (err) {
                            console.error(`❌ [Room ${roomId} DB] 陣地保存失敗:`, err);
                        }
                    }
                } else {
                    p.hp -= 20;
                    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `❌ ${p.username}: ${targetId} への攻撃に失敗。`);
                }
            } else if (data.type === 'move') {
                p.districtId = targetId;
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🚚 ${p.username}: ${targetId} へ本陣を移動。`);
            } else if (data.type === 'stay') {
                p.hp = Math.min(p.maxHp, p.hp + 20);
                p.ap = Math.min(p.maxAp, p.ap + 35);
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🧘 ${p.username}: 休息を選択。`);
            }
        } finally {
            roomState.isProcessingAction = false;
            if (doFinalize) finalizeTurn(roomId, socket.id);
        }
    });

    // 🚀 【防御アクション】
    socket.on(CLIENT_EVENTS.ACTION_DEFEND, () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || roomState.turnOwnerId !== socket.id) return;
        const p = roomState.players[socket.id];

        p.isDefending = true;
        p.ap = Math.max(0, p.ap - 5);
        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `🛡️ ${p.username}: 守りを固めました（次の攻撃への防御力1.5倍）。`);
        finalizeTurn(roomId, socket.id);
    });

    // 🚀 【逃走アクション】
    socket.on(CLIENT_EVENTS.ACTION_ESCAPE, () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || roomState.turnOwnerId !== socket.id) return;
        const p = roomState.players[socket.id];

        p.isDefending = false;
        const myDistricts = Object.keys(roomState.districts)
            .filter(id => roomState.districts[id] === socket.id);

        if (myDistricts.length > 0) {
            const dest = myDistricts[Math.floor(Math.random() * myDistricts.length)];
            p.districtId = dest;
            p.ap = Math.max(0, p.ap - 5);
            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `💨 ${p.username}: 自陣 ${dest} へ撤退しました。`);
        } else {
            p.hp = Math.max(0, p.hp - 50);
            io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, `💥 ${p.username}: 逃げ場がなくダメージを受けた！`);
        }
        finalizeTurn(roomId, socket.id);
    });

    // 🚀 【アイテム使用ロジック - Server State駆動】
    socket.on(CLIENT_EVENTS.ACTION_USE_ITEM, async ({ itemId }) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        // ターン制の制約（自分のターンでのみ使用可能にするなら残す。いつでも使える仕様なら削除）
        if (roomState.turnOwnerId !== socket.id) return;
        
        const p = roomState.players[socket.id];
        if (!p || p.isNpc) return;

        // 1. 在庫検証 (Server State 内の inventory を確認)
        const itemIndex = p.inventory.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            socket.emit(SERVER_EVENTS.ACTION_REJECTED, { reason: 'ITEM_NOT_FOUND' });
            return;
        }

        // 2. アイテム効果の即時適用（GDD準拠）
        const item = p.inventory[itemIndex];
        switch (item.type) {
            case 'ATK_BUFF':
                p.atk += item.value;
                break;
            case 'HP_RECOVER':
                p.hp = Math.min(p.maxHp, p.hp + item.value);
                break;
            case 'AP_RECOVER':
                p.ap = Math.min(p.maxAp, p.ap + item.value);
                break;
            case 'FAITH_UP':
                p.faith *= item.multiplier;
                break;
        }

        // 使用したアイテムを Server State から削除
        p.inventory.splice(itemIndex, 1);

        // 3. 全クライアントへ即座に最新状態をブロードキャスト
        io.to(roomId).emit(SERVER_EVENTS.GAME_LOG, {
            message: `🧪 ${p.username} が ${item.name} を使用した！`
        });
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);

        // 4. DBへの非同期反映（なおのAPIエンドポイントへ送信して永続化）
        if (p.token) {
            try {
                await fetch(`${API_BASE_URL}use-item.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.token}` },
                    body: JSON.stringify({ item_id: itemId })
                });
            } catch (err) {
                console.error(`❌ [Room ${roomId} DB] アイテム使用非同期同期エラー:`, err);
        try {
            const response = await fetch(`${API_BASE_URL}use-item.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.token}` },
                body: JSON.stringify({ item_id: itemId })
            });
            const dbResult = await response.json();

            if (dbResult.status === 'success') {
                if (dbResult.new_status) {
                    p.hp = dbResult.new_status.current_hp;
                    p.ap = dbResult.new_status.stamina;
                    p.atk = dbResult.new_status.atk;
                    p.def = dbResult.new_status.def;
                }
                io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,`🧪 ${p.username} ${dbResult.message}`);
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            } else {
                socket.emit(SERVER_EVENTS.ERROR_MESSAGE, dbResult.message || "アイテムの使用に失敗しました");
            }
        }
    });

    // 🚀 【チャット送信】
    socket.on(CLIENT_EVENTS.SEND_CHAT, (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        io.to(roomId).emit(SERVER_EVENTS.RECEIVE_CHAT, {
            senderId: socket.id,
            username: data.username,
            message: data.message,
            timestamp: new Date().toISOString()
        });
    });

    // 🚀 【ルーム退出】
    socket.on(CLIENT_EVENTS.LEAVE_ROOM, (data) => {
        const roomId = data?.roomId || socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState || !roomState.players[socket.id]) return;

        const wasTurnOwner = (roomState.turnOwnerId === socket.id);
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
            }
        }
    });

    // 🚀 【プレイヤー切断時のクリーンアップ】
    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        const roomId = socket.roomId;
        if (!roomId) return;

        const roomState = rooms.get(roomId);
        if (!roomState || !roomState.players[socket.id]) return;

        const disconnectedId = socket.id;
        const wasTurnOwner = (roomState.turnOwnerId === disconnectedId);

        // BUG-011: delete前にプレイヤー順序を記録しないと finalizeTurn が -1 を返す
        const prevIds = Object.keys(roomState.players);
        const prevIndex = prevIds.indexOf(disconnectedId);

        delete roomState.players[disconnectedId];

        const remaining = Object.keys(roomState.players);
        if (remaining.length === 0) {
            rooms.delete(roomId);
            console.log(`🗑️ Room ${roomId} has been deleted.`);
            return;
        }

        io.to(roomId).emit(SERVER_EVENTS.PLAYER_DISCONNECTED, disconnectedId);

        if (wasTurnOwner && roomState.status === 'playing') {
            const nextIndex = prevIndex % remaining.length;
            const nextId = remaining[nextIndex];
            roomState.turnOwnerId = nextId;
            roomState.isProcessingAction = false;
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
            io.to(roomId).emit(SERVER_EVENTS.TURN_START, {
                turn: roomState.turn,
                turnOwnerId: nextId,
                turnOwnerName: roomState.players[nextId]?.username
            });
            if (roomState.players[nextId]?.isNpc) {
                setTimeout(() => processNpcTurn(roomId), 2000);
            }
        } else {
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        }
    });
});

// BUG-010: ターン制ゲームのため毎秒同期は不要。5秒のヘルスチェックに変更。
setInterval(() => {
    rooms.forEach((roomState, roomId) => {
        if (Object.keys(roomState.players).length > 0) {
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, sanitizeRoomState(roomState));
        }
    });
}, 5000);

server.listen(PORT, () => {
    console.log(`🚀 Heavy Tactical Server Running on port ${PORT}`);
});