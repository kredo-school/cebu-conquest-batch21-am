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
// 🚀 【なお仕様：27地区マスタ】優先度とバフの定義
// ==========================================
const DISTRICTS_MASTER = {
    "11101": { name: "チチャロン地区", priority: 3, buff: { atk: 10, def: 0 } },
    "11102": { name: "エナジー地区", priority: 8, buff: { atk: 0, def: 0 } },
    "11103": { name: "守護石地区", priority: 6, buff: { atk: 0, def: 15 } },
    "11104": { name: "光回線地区", priority: 4, buff: { atk: 5, def: 5 } },
    "11105": { name: "マンゴー地区", priority: 9, buff: { atk: 12, def: 12 } },
    "11106": { name: "新都心地区", priority: 7, buff: { atk: 10, def: 5 } },
    "11107": { name: "歴史保護地区", priority: 5, buff: { atk: 0, def: 10 } },
    "11108": { name: "ショッピング区", priority: 6, buff: { atk: 5, def: 5 } },
    "11109": { name: "アップタウン", priority: 7, buff: { atk: 8, def: 8 } },
    "11110": { name: "ダウンタウン", priority: 5, buff: { atk: 5, def: 5 } },
    "11118": { name: "リゾート地区", priority: 6, buff: { atk: 5, def: 10 } },
    "11119": { name: "マリン・ジャイアント", priority: 8, buff: { atk: 20, def: 0 } },
    "11120": { name: "ヘリテージ・グルメ", priority: 8, buff: { atk: 0, def: 20 } },
    "11121": { name: "アドベンチャー", priority: 5, buff: { atk: 15, def: 0 } },
    "11122": { name: "コスタ地区", priority: 6, buff: { atk: 5, def: 15 } },
    // 必要に応じて 11127 まで定義
};

// 🚀 【全地区連結】島全体を繋ぐ隣接リスト（ここが途切れるとNPCが止まります）
const ADJACENT_DISTRICTS = {
    "11101": ["11102", "11103", "11104", "11105"],
    "11102": ["11101", "11104", "11105", "11106"],
    "11103": ["11101", "11105", "11107"],
    "11104": ["11101", "11102", "11105", "11108"],
    "11105": ["11101", "11102", "11103", "11104", "11109"],
    "11106": ["11102", "11110"], "11107": ["11103", "11111"],
    "11108": ["11104", "11112"], "11109": ["11105", "11113"],
    "11110": ["11106", "11114"], "11111": ["11107", "11115"],
    "11112": ["11108", "11116"], "11113": ["11109", "11117"],
    "11114": ["11110", "11118"], "11115": ["11111", "11119"],
    "11116": ["11112", "11120"], "11117": ["11113", "11121"],
    "11118": ["11114", "11119"],
    "11119": ["11115", "11118", "11120"],
    "11120": ["11116", "11119", "11121"],
    "11121": ["11117", "11120", "11122"],
    "11122": ["11121", "11123"], "11123": ["11122", "11124"],
    "11124": ["11123", "11125"], "11125": ["11124", "11126"],
    "11126": ["11125", "11127"], "11127": ["11126"]
};

let gameState = {
    status: 'waiting', turn: 0, maxTurn: 30,
    turnOwnerId: null, firstPlayerId: null,
    players: {}, districts: {} 
};

// ==========================================
// ⚔️ 戦闘 ＆ バフ計算ロジック
// ==========================================
function calculateFinalStats(playerId) {
    const p = gameState.players[playerId];
    if (!p) return { atk: 0, def: 40 };
    let bAtk = 0, bDef = 0;
    Object.entries(gameState.districts).forEach(([dId, ownerId]) => {
        if (ownerId === playerId && DISTRICTS_MASTER[dId]?.buff) {
            bAtk += DISTRICTS_MASTER[dId].buff.atk;
            bDef += DISTRICTS_MASTER[dId].buff.def;
        }
    });
    return { atk: p.atk + bAtk, def: p.def + bDef };
}

function resolveBattle(atk, def) {
    const prob = atk / (atk + def);
    return { isWin: Math.random() < prob, prob };
}

// ==========================================
// 🤖 【復活】重厚AIエンジン：タクティカル・ラプパプ
// ==========================================
function processNpcTurn() {
    if (gameState.status !== 'playing') return;
    const npcId = gameState.turnOwnerId;
    const npc = gameState.players[npcId];
    if (!npc || !npc.isNpc) return;

    const stats = calculateFinalStats(npcId);
    const neighbors = ADJACENT_DISTRICTS[String(npc.districtId)] || [];
    const personality = npc.personality || 'AGGRESSIVE';

    // 思考1：周辺ターゲットのスコアリング
    let targets = neighbors.map(id => {
        const ownerId = gameState.districts[id];
        const master = DISTRICTS_MASTER[id];
        let score = master?.priority || 1;
        if (ownerId && ownerId !== npcId) score += 12; // 敵地奪取を最優先
        if (!ownerId) score += 5; // 空地拡大
        return { id, score, ownerId, name: master?.name || `地区 ${id}` };
    });

    targets.sort((a, b) => b.score - a.score);

    // 思考2：行動決定
    if (npc.hp < 35 || (npc.ap < 10 && personality !== 'AGGRESSIVE')) {
        npc.hp = Math.min(npc.maxHp, npc.hp + 20);
        npc.ap = Math.min(npc.maxAp, npc.ap + 35);
        io.emit('GAME_LOG', `🧘 ${npc.username}: 休息を選択。APを${npc.ap}まで回復。`);
    } else if (targets.length > 0) {
        const target = targets[0];
        // 🚀 自陣内の移動
        if (target.ownerId === npcId) {
            npc.districtId = target.id;
            io.emit('GAME_LOG', `🚚 ${npc.username}: ${target.name} へ本陣を移動。`);
        } else {
            // 攻撃実行
            npc.ap -= 5;
            const defenderId = gameState.districts[target.id];
            const defValue = defenderId ? calculateFinalStats(defenderId).def : 35;
            const res = resolveBattle(stats.atk, defValue);

            if (res.isWin) {
                gameState.districts[target.id] = npcId; // 🚀 占領地情報を更新（色が増える！）
                npc.districtId = target.id;
                io.emit('GAME_LOG', `⚔️ ${npc.username}: ${target.name} を制圧！`);
            } else {
                npc.hp -= 20;
                io.emit('GAME_LOG', `❌ ${npc.username}: ${target.name} への侵攻に失敗。`);
            }
        }
    }

    setTimeout(() => finalizeTurn(npcId), 2000);
}

function finalizeTurn(currentId) {
    const ids = Object.keys(gameState.players);
    const nextId = ids.find(id => id !== currentId) || ids[0];
    gameState.turnOwnerId = nextId;
    if (nextId === gameState.firstPlayerId) gameState.turn++;

    // 🚀 強制同期（これでNPCの位置や領土の色が反映される）
    io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    io.emit(SERVER_EVENTS.TURN_START, { 
        turn: gameState.turn, turnOwnerId: nextId, turnOwnerName: gameState.players[nextId]?.username 
    });

    if (gameState.players[nextId]?.isNpc) setTimeout(processNpcTurn, 2500);
}

// ==========================================
// 🔌 Socket 通信：アクション処理
// ==========================================
io.on('connection', (socket) => {
    socket.on('join_game', (userData) => {
        const team = Object.keys(gameState.players).length === 0 ? 'red' : 'blue';
        gameState.players[socket.id] = {
            id: socket.id, username: userData?.username || "Commander",
            hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 60, def: 45, team, isReady: false, isNpc: false
        };

        // CPU召喚
        setTimeout(() => {
            if (Object.keys(gameState.players).length === 1) {
                const npcId = "cpu_issei_bot";
                gameState.players[npcId] = {
                    id: npcId, username: "猛将ラプパプ(CPU)", hp: 120, maxHp: 120, ap: 100, maxAp: 100, atk: 75, def: 55, 
                    team: 'blue', isReady: true, isNpc: true, personality: 'AGGRESSIVE', districtId: "11101" 
                };
                gameState.districts["11101"] = npcId; // 🚀 CPUの領土登録
                gameState.status = 'standby';
                io.emit('gameStart', { status: 'standby' });
                io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
            }
        }, 3000);
    });

    socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
        const p = gameState.players[socket.id];
        if (p) {
            p.districtId = String(data.startDistrictId);
            gameState.districts[p.districtId] = socket.id; // 🚀 プレイヤーの初期領土を登録
            p.isReady = true;
            if (Object.values(gameState.players).every(pl => pl.isReady)) {
                gameState.status = 'playing'; gameState.turn = 1;
                gameState.firstPlayerId = Object.keys(gameState.players)[0];
                gameState.turnOwnerId = gameState.firstPlayerId;
                io.emit(SERVER_EVENTS.TURN_START, { turn: 1, turnOwnerId: gameState.turnOwnerId });
            }
        }
        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    });

    socket.on("ACTION_SUBMIT", (data) => {
        if (gameState.turnOwnerId !== socket.id) return;
        const p = gameState.players[socket.id];
        const targetId = String(data.targetId);
        const stats = calculateFinalStats(socket.id);

        if (data.type === 'attack') {
            p.ap -= 5;
            const defValue = gameState.districts[targetId] ? calculateFinalStats(gameState.districts[targetId]).def : 30;
            const res = resolveBattle(stats.atk, defValue);
            if (res.isWin) {
                gameState.districts[targetId] = socket.id; // 🚀 占領成功時に永続化
                p.districtId = targetId;
                io.emit('GAME_LOG', `⚔️ ${p.username}: ${targetId} を制圧！`);
            } else {
                p.hp -= 20;
                io.emit('GAME_LOG', `❌ ${p.username}: 侵攻に失敗。HP残り:${p.hp}`);
            }
        } else if (data.type === 'move') {
            // 🚀 自分の領土内であれば移動を許可
            if (gameState.districts[targetId] === socket.id) {
                p.districtId = targetId;
                io.emit('GAME_LOG', `🚚 ${p.username}: ${targetId} へ移動完了。`);
            }
        } else if (data.type === 'stay') {
            p.hp = Math.min(p.maxHp, p.hp + 20);
            p.ap = Math.min(p.maxAp, p.ap + 30);
            io.emit('GAME_LOG', `🧘 ${p.username}: 休息して戦力を回復。`);
        }

        if (data.type === 'turn_end' || p.hp <= 0) finalizeTurn(socket.id);
        else io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    });

    socket.on('disconnect', () => { delete gameState.players[socket.id]; });
});

server.listen(PORT, () => console.log(`🚀 Final Heavy AI Server Running on ${PORT}`));