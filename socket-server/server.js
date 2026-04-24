import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/socketEvents.js';

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const EVENTS = { CLIENT: CLIENT_EVENTS, SERVER: SERVER_EVENTS };

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
    "11101": { name: "チチャロン地区", priority: 3, buff: { atk: 10, def: 0 } },
    "11102": { name: "マンゴー地区", priority: 9, buff: { atk: 12, def: 12 } },
    "11103": { name: "エナジー地区", priority: 8, buff: { atk: 5, def: 5 } },
    "11104": { name: "コータル地区", priority: 4, buff: { atk: 5, def: 5 } },
    "11105": { name: "アドベンチャー地区", priority: 6, buff: { atk: 10, def: 0 } },
    "11112": { name: "ショッピング特区", priority: 7, buff: { atk: 5, def: 15 } },
    "11113": { name: "ダウンタウン", priority: 5, buff: { atk: 8, def: 8 } },
    "11119": { name: "マリン・ジャイアント", priority: 10, buff: { atk: 25, def: 0 } },
    "11120": { name: "ヘリテージ・グルメ", priority: 8, buff: { atk: 0, def: 25 } },
    // 11127まで同様に定義（データ量＝重厚さ）
};

// 🚀 【全地区連結】島全体を網羅した隣接リスト（NPCの移動経路）
const ADJACENT_DISTRICTS = {
    "11101": ["11102", "11104", "11105", "11120"],
    "11102": ["11101", "11104", "11106", "11108"],
    "11108": ["11102", "11109", "11112"],
    "11112": ["11108", "11113", "11116", "11119"],
    "11113": ["11109", "11112", "11117", "11118", "11119"],
    "11119": ["11112", "11113", "11115", "11118", "11120"],
    "11120": ["11116", "11119", "11101"]
};

// ==========================================
// 🚀 【設定】ルーム管理とゲーム状態の初期化
// ==========================================
const rooms = new Map();

// 新しい部屋の gameState を生成する関数
function createInitialGameState(maxPlayers = 4) {
    return {
        roomId: null,
        status: 'waiting', 
        turn: 0, 
        maxTurn: 30, // Day 10 (3ターン×10日分)
        maxPlayers: maxPlayers, // 👈 部屋ごとの最大人数を設定
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
    const winProb = atk / (atk + def);
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

    const stats = calculateFinalStats(roomId, npcId);
    const neighbors = ADJACENT_DISTRICTS[String(npc.districtId)] || [];

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
            io.to(roomId).emit('GAME_LOG', `🧘 ${npc.username}: 休息を選び、体制を整えています。`);
        } else if (targets.length > 0) {
            const target = targets[0];

            if (target.ownerId === npcId) {
                npc.districtId = target.id;
                io.to(roomId).emit('GAME_LOG', `🚚 ${npc.username}: ${target.name} へ本陣を移しました。`);
            } else {
                npc.ap -= 5;
                const defenderId = target.ownerId;
                const defValue = defenderId ? calculateFinalStats(roomId, defenderId).def : 35;
                
                const battleResult = resolveBattle(stats.atk, defValue);

                if (battleResult.isWin) {
                    currentState.districts[target.id] = npcId;
                    npc.districtId = target.id;
                    io.to(roomId).emit('GAME_LOG', `⚔️ ${npc.username}: ${target.name} を制圧しました！`);
                } else {
                    npc.hp -= 20;
                    io.to(roomId).emit('GAME_LOG', `❌ ${npc.username}: ${target.name} への侵攻に失敗しました。`);
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

    io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
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
    io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
    
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

    io.to(roomId).emit('GAME_LOG', `🏆 ゲーム終了！勝者: ${winner?.username} (${scores[winnerId]} 拠点)`);
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
    socket.on('CREATE_ROOM', async (config, callback) => { // 👈 async を追加！
        const roomId = generateRoomId();
        const roomState = createInitialGameState(config?.maxPlayers || 4);
        roomState.roomId = roomId;
        rooms.set(roomId, roomState);
        
        socket.join(roomId);
        socket.roomId = roomId;

        // 🚀 【重要】作成者を最初のプレイヤーとして登録（DB連携対応）
        const teamInfo = TEAM_CONFIG[0]; // 最初の人はレッド
        let baseStats = { hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 60, def: 45 };
        let godName = "なし";

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
                }
            } catch (e) {
                console.error("❌ [DB] ユーザー・神データ取得エラー:", e);
            }
        }

        roomState.players[socket.id] = {
            id: socket.id,
            username: config.username || "Commander",
            dbUserId: config.id || null, // 👈 DB保存用に必須
            token: socket.authToken,     // 👈 DB保存用に必須
            godName: godName,
            ...baseStats,
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: false,
            isNpc: false
        };
        
        console.log(`🏠 Room[${roomId}] Created (Max: ${roomState.maxPlayers}) by ${socket.id}`);
        
        if (godName !== "なし") {
            io.to(roomId).emit('GAME_LOG', `👼 ${roomState.players[socket.id].username} が【${godName}】の加護を受けてルームを作成！`);
        }

        // 作成直後に自分を含む状態を同期
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
        
        if (callback) callback({ success: true, roomId: roomId });
    });

    // 🚀 2. 部屋参加
    socket.on('JOIN_ROOM', async (data, callback) => {
        const roomId = data.roomId?.toUpperCase();
        const roomState = rooms.get(roomId);

        if (!roomState) {
            if (callback) callback({ success: false, message: "Room not found" });
            socket.emit('ERROR_MESSAGE', "指定された部屋が存在しません");
            return;
        }

        const playerCount = Object.keys(roomState.players).length;
        if (playerCount >= roomState.maxPlayers) {
            if (callback) callback({ success: false, message: "Room is full" });
            socket.emit('ERROR_MESSAGE', "ルームはすでに満員です");
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        const teamInfo = TEAM_CONFIG[playerCount];
        let baseStats = { hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 60, def: 45 };
        let godName = "なし";

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
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: false,
            isNpc: false
        };

        console.log(`👤 Joined Room[${roomId}]`);
        if (godName !== "なし") {
            io.to(roomId).emit('GAME_LOG', `👼 ${roomState.players[socket.id].username} が【${godName}】の加護を受けて参戦！`);
        }

        // 共通イベント定数を利用して全員に送信
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
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

        roomState.players[npcId] = {
            id: npcId,
            username: `猛将ラプパプ(${teamInfo.name})`,
            dbUserId: null, token: null, godName: "セブの精霊",
            hp: 120, maxHp: 120, ap: 100, maxAp: 100,
            atk: 75, def: 55, 
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: true,
            isNpc: true,
            districtId: null 
        };

        io.to(roomId).emit('GAME_LOG', `🤖 ${roomState.players[npcId].username} が参戦しました！`);
        io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
    });

    // 🚀 【神の選択】
    socket.on('SELECT_GOD', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        const p = roomState.players[socket.id];
        if (p) {
            p.selectedGodId = data.godId;
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
            console.log(`✨ [Room ${roomId}] ${p.username} selected god: ${data.godId}`);
        }
    });

    // 🚀 3. 準備完了の同期 & ゲーム開始
    socket.on('PLAYER_READY', (data) => {
        const roomId = socket.roomId || data.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        const p = roomState.players[socket.id];
        if (p) {
            // 状態を更新
            p.isReady = data.ready !== undefined ? data.ready : true;
            
            // 初期陣地の指定があれば保存
            if (data.startDistrictId) {
                p.districtId = String(data.startDistrictId);
                roomState.districts[p.districtId] = socket.id;
            }

            const playersArr = Object.values(roomState.players);
            const currentCount = playersArr.length;
            const maxPlayers = roomState.maxPlayers;

            // 🚀 重要：人数が設定値（2人など）に達しており、かつ全員がREADYかチェック
            if (currentCount >= maxPlayers && playersArr.every(pl => pl.isReady)) {
                roomState.status = 'playing';
                roomState.turn = 1;
                
                const playerIds = Object.keys(roomState.players);
                const firstId = playerIds[0];
                roomState.firstPlayerId = firstId;
                roomState.turnOwnerId = firstId;
                
                // 📢 【追加】フロントエンド（App.tsx）に画面遷移を命じる！
                io.to(roomId).emit(SERVER_EVENTS.GAME_START); 
                
                // 状態とログを送信
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
                io.to(roomId).emit(SERVER_EVENTS.TURN_START, { 
                    turn: 1, 
                    turnOwnerId: firstId,
                    turnOwnerName: roomState.players[firstId]?.username 
                });
                io.to(roomId).emit('GAME_LOG', `⚔️ 作戦開始！全オペレーターの同期に成功しました。`);
                
                console.log(`🎮 [Room ${roomId}] Game Started!`);
            } else {
                // まだ全員揃っていない場合は現在の状態だけ同期
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
            }
        }
    });

    // 🚀 【アクション実行＆ DB保存】
    socket.on("ACTION_SUBMIT", async (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        if (roomState.turnOwnerId !== socket.id) return;
        const p = roomState.players[socket.id];
        const targetId = String(data.targetId);
        const stats = calculateFinalStats(roomId, socket.id);

        if (data.type === 'attack') {
            p.ap -= 5;
            const defenderId = roomState.districts[targetId];
            const defValue = defenderId ? calculateFinalStats(roomId, defenderId).def : 30;
            const result = resolveBattle(stats.atk, defValue);

            if (result.isWin) {
                roomState.districts[targetId] = socket.id;
                p.districtId = targetId;
                io.to(roomId).emit('GAME_LOG', `⚔️ ${p.username}: ${targetId} を制圧！`);

                if (!p.isNpc && p.token) {
                    try {
                        const response = await fetch(`${API_BASE_URL}capture.php`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${p.token}` },
                            body: JSON.stringify({ territory_id: parseInt(targetId) })
                        });
                        const dbResult = await response.json();
                        console.log(`✅ [Room ${roomId} DB] 陣地 ${targetId} 制圧:`, dbResult.message || dbResult);
                    } catch (err) {
                        console.error(`❌ [Room ${roomId} DB] 陣地保存失敗:`, err);
                    }
                }
            } else {
                p.hp -= 20;
                io.to(roomId).emit('GAME_LOG', `❌ ${p.username}: ${targetId} への攻撃に失敗。`);
            }
        } else if (data.type === 'move') {
            p.districtId = targetId;
            io.to(roomId).emit('GAME_LOG', `🚚 ${p.username}: ${targetId} へ本陣を移動。`);
        } else if (data.type === 'stay') {
            p.hp = Math.min(p.maxHp, p.hp + 20);
            p.ap = Math.min(p.maxAp, p.ap + 35);
            io.to(roomId).emit('GAME_LOG', `🧘 ${p.username}: 休息を選択。`);
        }

        finalizeTurn(roomId, socket.id);
    });

    // 🚀 【アイテム使用ロジック】
    socket.on("ACTION_USE_ITEM", async (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        const roomState = rooms.get(roomId);
        if (!roomState) return;

        if (roomState.turnOwnerId !== socket.id) return;
        const p = roomState.players[socket.id];
        const itemId = data.itemId;

        if (!p || p.isNpc || !p.token) return;

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
                io.to(roomId).emit('GAME_LOG', `🧪 ${p.username} ${dbResult.message}`);
                io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
            } else {
                socket.emit('ERROR_MESSAGE', dbResult.message || "アイテムの使用に失敗しました");
            }
        } catch (err) {
            console.error(`❌ [Room ${roomId} DB] アイテム使用API通信エラー:`, err);
            socket.emit('ERROR_MESSAGE', "サーバーエラーが発生しました");
        }
    });

    // 🚀 【チャット送信】
    socket.on('SEND_CHAT', (data) => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        io.to(roomId).emit('RECEIVE_CHAT', {
            senderId: socket.id,
            username: data.username,
            message: data.message,
            timestamp: new Date().toISOString()
        });
    });

    // 🚀 【プレイヤー切断時のクリーンアップ】
    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        const roomId = socket.roomId;
        
        if (roomId) {
            const roomState = rooms.get(roomId);
            if (roomState && roomState.players[socket.id]) {
                delete roomState.players[socket.id];
                
                if (Object.keys(roomState.players).length === 0) {
                    rooms.delete(roomId);
                    console.log(`🗑️ Room ${roomId} has been deleted.`);
                } else {
                    io.to(roomId).emit('playerDisconnected', socket.id);
                    io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
                }
            }
        }
    });
});

// 全部屋の同期処理
setInterval(() => {
    rooms.forEach((roomState, roomId) => {
        if (Object.keys(roomState.players).length > 0) {
            io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
        }
    });
}, 1000);

server.listen(PORT, () => {
    console.log(`🚀 Heavy Tactical Server Running on port ${PORT}`);
});