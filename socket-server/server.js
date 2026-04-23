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

// 最大4人プレイ用のチーム設定（参加順に割り当て）
const MAX_PLAYERS = 4;
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

let gameState = {
    status: 'waiting', 
    turn: 0, 
    maxTurn: 30, // Day 10 (3ターン×10日分)
    turnOwnerId: null, 
    firstPlayerId: null,
    players: {}, 
    districts: {} 
};

// ==========================================
// ⚔️ バトル＆ステータス計算（重厚ロジック）
// ==========================================
function calculateFinalStats(playerId) {
    const p = gameState.players[playerId];
    if (!p) return { atk: 40, def: 40 };

    let bonusAtk = 0;
    let bonusDef = 0;

    // 領有している全地区をループしてバフを合算
    Object.entries(gameState.districts).forEach(([dId, ownerId]) => {
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

// 勝敗判定ロジック
function resolveBattle(atk, def) {
    const winProb = atk / (atk + def);
    const dice = Math.random();
    return { isWin: dice < winProb, prob: winProb };
}

// ==========================================
// 🤖 タクティカル・ラプパプ AIエンジン (多人数対応)
// ==========================================
function processNpcTurn() {
    if (gameState.status !== 'playing') return;
    const npcId = gameState.turnOwnerId;
    const npc = gameState.players[npcId];
    if (!npc || !npc.isNpc) return;

    const stats = calculateFinalStats(npcId);
    const neighbors = ADJACENT_DISTRICTS[String(npc.districtId)] || [];

    // 1. 周辺ターゲットの分析とスコアリング
    let targets = neighbors.map(id => {
        const ownerId = gameState.districts[id];
        const master = DISTRICTS_MASTER[id];
        let score = master ? master.priority : 1;

        if (ownerId && ownerId !== npcId) score += 15; // 敵の領土を奪う意欲
        if (!ownerId) score += 5; // 未占領地を広げる
        
        return { id, score, ownerId, name: master ? master.name : `地区${id}` };
    });

    targets.sort((a, b) => b.score - a.score);

    // 2. NPCの行動決定
    setTimeout(() => {
        if (npc.hp < 30) {
            npc.hp = Math.min(npc.maxHp, npc.hp + 20);
            npc.ap = Math.min(npc.maxAp, npc.ap + 30);
            io.emit('GAME_LOG', `🧘 ${npc.username}: 休息を選び、体制を整えています。`);
        } else if (targets.length > 0) {
            const target = targets[0];

            if (target.ownerId === npcId) {
                npc.districtId = target.id;
                io.emit('GAME_LOG', `🚚 ${npc.username}: ${target.name} へ本陣を移しました。`);
            } else {
                npc.ap -= 5;
                const defenderId = target.ownerId;
                const defValue = defenderId ? calculateFinalStats(defenderId).def : 35;
                
                const battleResult = resolveBattle(stats.atk, defValue);

                if (battleResult.isWin) {
                    gameState.districts[target.id] = npcId;
                    npc.districtId = target.id;
                    io.emit('GAME_LOG', `⚔️ ${npc.username}: ${target.name} を制圧しました！`);
                } else {
                    npc.hp -= 20;
                    io.emit('GAME_LOG', `❌ ${npc.username}: ${target.name} への侵攻に失敗しました。`);
                }
            }
        }
        
        setTimeout(() => finalizeTurn(npcId), 1500);
    }, 1000);
}

// ==========================================
// 🔄 ターン終了処理とゲーム終了判定
// ==========================================
function finalizeTurn(currentId) {
    const playerIds = Object.keys(gameState.players);
    const currentIndex = playerIds.indexOf(currentId);
    
    // 次のプレイヤーのインデックスを計算 (多人数ループ対応)
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextId = playerIds[nextIndex];

    gameState.turnOwnerId = nextId;

    // 一周したらターン数(Day)を進める
    if (nextId === gameState.firstPlayerId) {
        gameState.turn++;
    }

    if (gameState.turn > gameState.maxTurn) {
        handleGameOver(playerIds);
        return; 
    }

    // クライアントへ最新状態を送信
    io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    io.emit(SERVER_EVENTS.TURN_START, {
        turn: gameState.turn,
        turnOwnerId: nextId,
        turnOwnerName: gameState.players[nextId]?.username
    });

    if (gameState.players[nextId]?.isNpc) {
        setTimeout(processNpcTurn, 2000);
    }
}

// ゲーム終了時のDB保存ロジック
async function handleGameOver(playerIds) {
    gameState.status = 'finished';
    io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    
    const scores = {};
    playerIds.forEach(id => scores[id] = 0);
    Object.values(gameState.districts).forEach(ownerId => {
        if (scores[ownerId] !== undefined) scores[ownerId]++;
    });

    const sortedPlayers = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const winnerId = sortedPlayers[0];
    const loserId = sortedPlayers[1] || null; // APIが1対1想定のため、ひとまず2位を敗者として扱う

    const winner = gameState.players[winnerId];
    const loser = gameState.players[loserId];

    io.emit('GAME_LOG', `🏆 ゲーム終了！勝者: ${winner?.username} (${scores[winnerId]} 拠点)`);
    io.emit(SERVER_EVENTS.GAME_OVER, { winnerId, scores });

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
            console.log("✅ 試合結果DB保存完了:", data);
        } catch (err) {
            console.error("❌ 試合結果保存エラー:", err);
        }
    }
}

// ==========================================
// 🔌 Socket.io 通信イベント
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);
    socket.authToken = socket.handshake.auth?.token || "";

    // 🚀 【プレイヤー参加】
    socket.on('join_game', async (userData) => {
        const playerCount = Object.keys(gameState.players).length;
        
        // 4人を超えようとしたら弾く
        if (playerCount >= MAX_PLAYERS) {
            socket.emit('ERROR_MESSAGE', "ルームはすでに満員です");
            return;
        }

        const teamInfo = TEAM_CONFIG[playerCount]; // 順番に応じて色を割り当て
        
        let baseStats = { hp: 100, maxHp: 100, ap: 100, maxAp: 100, atk: 60, def: 45 };
        let godName = "なし";

        // DBからユーザー情報（神のバフ含む）を取得
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
        
        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || `Player ${playerCount + 1}`,
            dbUserId: userData?.id || null,
            token: socket.authToken,
            godName: godName,
            ...baseStats,
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: false,
            isNpc: false
        };

        if (godName !== "なし") {
            io.emit('GAME_LOG', `👼 ${gameState.players[socket.id].username} が【${godName}】の加護を受けて参戦！`);
        }

        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    });

    // 🚀 【NPCの任意追加】フロントからボタン等で発火させる
    socket.on('ADD_NPC', () => {
        const currentCount = Object.keys(gameState.players).length;
        if (currentCount >= MAX_PLAYERS) return;

        const npcId = `npc_${Date.now()}`;
        const teamInfo = TEAM_CONFIG[currentCount];

        gameState.players[npcId] = {
            id: npcId,
            username: `猛将ラプパプ(${teamInfo.name})`,
            dbUserId: null, token: null, godName: "セブの精霊",
            hp: 120, maxHp: 120, ap: 100, maxAp: 100,
            atk: 75, def: 55, 
            team: teamInfo.id,
            teamColor: teamInfo.color,
            isReady: true, // NPCは最初から準備完了状態
            isNpc: true,
            districtId: null 
        };

        io.emit('GAME_LOG', `🤖 ${gameState.players[npcId].username} が参戦しました！`);
        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    });

    // 🚀 【ゲーム開始】全員が準備完了になったらスタート
    socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
        const p = gameState.players[socket.id];
        if (p) {
            p.districtId = String(data.startDistrictId);
            gameState.districts[p.districtId] = socket.id;
            p.isReady = true;

            // プレイヤーとNPCを含め、参加している全員がisReadyなら開始
            if (Object.values(gameState.players).every(pl => pl.isReady)) {
                gameState.status = 'playing';
                gameState.turn = 1;
                // 最初のプレイヤーのIDを取得（オブジェクトの最初のキー）
                const firstId = Object.keys(gameState.players)[0];
                gameState.firstPlayerId = firstId;
                gameState.turnOwnerId = firstId;
                
                io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
                io.emit(SERVER_EVENTS.TURN_START, { turn: 1, turnOwnerId: firstId });
            }
        }
    });

    // 🚀 【アクション実行（攻撃・移動・待機）＆ DB保存】
    socket.on("ACTION_SUBMIT", async (data) => {
        if (gameState.turnOwnerId !== socket.id) return;
        const p = gameState.players[socket.id];
        const targetId = String(data.targetId);
        const stats = calculateFinalStats(socket.id);

        if (data.type === 'attack') {
            p.ap -= 5;
            const defenderId = gameState.districts[targetId];
            const defValue = defenderId ? calculateFinalStats(defenderId).def : 30;
            const result = resolveBattle(stats.atk, defValue);

            if (result.isWin) {
                gameState.districts[targetId] = socket.id;
                p.districtId = targetId;
                io.emit('GAME_LOG', `⚔️ ${p.username}: ${targetId} を制圧！`);

                if (!p.isNpc && p.token) {
                    try {
                        const response = await fetch(`${API_BASE_URL}capture.php`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${p.token}`
                            },
                            body: JSON.stringify({ territory_id: parseInt(targetId) })
                        });
                        const dbResult = await response.json();
                        console.log(`✅ [DB] 陣地 ${targetId} 制圧記録:`, dbResult.message || dbResult);
                    } catch (err) {
                        console.error("❌ [DB] 陣地保存失敗:", err);
                    }
                }
            } else {
                p.hp -= 20;
                io.emit('GAME_LOG', `❌ ${p.username}: ${targetId} への攻撃に失敗。`);
            }
        } else if (data.type === 'move') {
            p.districtId = targetId;
            io.emit('GAME_LOG', `🚚 ${p.username}: ${targetId} へ本陣を移動。`);
        } else if (data.type === 'stay') {
            p.hp = Math.min(p.maxHp, p.hp + 20);
            p.ap = Math.min(p.maxAp, p.ap + 35);
            io.emit('GAME_LOG', `🧘 ${p.username}: 休息を選択。`);
        }

        finalizeTurn(socket.id);
    });

    // 🚀 【アイテム使用ロジック ＆ DB連動】
    socket.on("ACTION_USE_ITEM", async (data) => {
        if (gameState.turnOwnerId !== socket.id) return;
        const p = gameState.players[socket.id];
        const itemId = data.itemId;

        if (!p || p.isNpc || !p.token) return;

        try {
            const response = await fetch(`${API_BASE_URL}use-item.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${p.token}`
                },
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
                io.emit('GAME_LOG', `🧪 ${p.username} ${dbResult.message}`);
                io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
            } else {
                socket.emit('ERROR_MESSAGE', dbResult.message || "アイテムの使用に失敗しました");
            }
        } catch (err) {
            console.error("❌ [DB] アイテム使用API通信エラー:", err);
            socket.emit('ERROR_MESSAGE', "サーバーエラーが発生しました");
        }
    });

    // 🚀 【プレイヤー切断時のクリーンアップ】
    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        delete gameState.players[socket.id];
        
        // プレイヤーが一人もいなくなったらリセット
        if (Object.keys(gameState.players).length === 0) {
            gameState.status = 'waiting';
            gameState.districts = {};
        }
        io.emit('playerDisconnected', socket.id);
        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    });
});

setInterval(() => {
    if (Object.keys(gameState.players).length > 0) {
        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    }
}, 1000);

server.listen(PORT, () => {
    console.log(`🚀 Heavy Tactical Server Running on port ${PORT}`);
});