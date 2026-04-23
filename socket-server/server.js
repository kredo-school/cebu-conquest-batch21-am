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
//  【API設定】PHPバックエンドとの通信用
// ==========================================
const API_BASE_URL = 'http://localhost/cebu-conquest-batch21-am/api/';

// ==========================================
//  【27地区マスタ】すべての地区のバフと優先度
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

//  【全地区連結】島全体を網羅した隣接リスト（NPCの移動経路）
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

let matchingTimer = null;

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
//  タクティカル・ラプパプ AIエンジン (CPU思考)
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

        if (ownerId && ownerId !== npcId) score += 15; // プレイヤーの領土を奪う意欲
        if (!ownerId) score += 5; // 未占領地を広げる
        
        return { id, score, ownerId, name: master ? master.name : `地区${id}` };
    });

    targets.sort((a, b) => b.score - a.score);

    // 2. NPCの行動決定（HPやAPに基づいた判断）
    setTimeout(() => {
        if (npc.hp < 30) {
            // 休息を選択
            npc.hp = Math.min(npc.maxHp, npc.hp + 20);
            npc.ap = Math.min(npc.maxAp, npc.ap + 30);
            io.emit('GAME_LOG', `🧘 ${npc.username}: 休息を選び、体制を整えています。`);
        } else if (targets.length > 0) {
            const target = targets[0];

            if (target.ownerId === npcId) {
                // 自陣内での移動
                npc.districtId = target.id;
                io.emit('GAME_LOG', `🚚 ${npc.username}: ${target.name} へ本陣を移しました。`);
            } else {
                // 攻撃実行
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

// ターン終了処理とゲーム終了判定 (DB保存処理追加)
function finalizeTurn(currentId) {
    const playerIds = Object.keys(gameState.players);
    const currentIndex = playerIds.indexOf(currentId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextId = playerIds[nextIndex];

    gameState.turnOwnerId = nextId;

    // 全員が1回ずつ終わったらターン数(Day)を進める
    if (nextId === gameState.firstPlayerId) {
        gameState.turn++;
    }

    // ==========================================
    // 【ゲーム終了＆結果保存】maxTurnを超えたら終了
    // ==========================================
    if (gameState.turn > gameState.maxTurn) {
        gameState.status = 'finished';
        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
        
        // 陣地数でスコア計算
        const scores = {};
        playerIds.forEach(id => scores[id] = 0);
        Object.values(gameState.districts).forEach(ownerId => {
            if (scores[ownerId] !== undefined) scores[ownerId]++;
        });

        const sortedPlayers = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
        const winnerId = sortedPlayers[0];
        const loserId = sortedPlayers[1] || null;

        const winner = gameState.players[winnerId];
        const loser = gameState.players[loserId];

        io.emit('GAME_LOG', `🏆 ゲーム終了！勝者: ${winner?.username} (${scores[winnerId]} 拠点)`);
        io.emit(SERVER_EVENTS.GAME_OVER, { winnerId, scores });

        // 実際のプレイヤーが勝者の場合のみ結果を保存（NPCは保存しない）
        if (winner && !winner.isNpc && winner.token) {
            fetch(`${API_BASE_URL}result.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${winner.token}`
                },
                body: JSON.stringify({
                    winner_id: winner.dbUserId || 1, // join_gameで渡されたID
                    loser_id: loser?.dbUserId || 2,
                    winner_score: scores[winnerId],
                    loser_score: scores[loserId] || 0
                })
            }).then(res => res.json())
              .then(data => console.log("✅ 試合結果DB保存完了:", data))
              .catch(err => console.error("❌ 試合結果保存エラー:", err));
        }
        return; // これ以上ターンを進めない
    }

    // クライアントへ最新状態を送信
    io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    io.emit(SERVER_EVENTS.TURN_START, {
        turn: gameState.turn,
        turnOwnerId: nextId,
        turnOwnerName: gameState.players[nextId]?.username
    });

    // 次がNPCなら思考開始
    if (gameState.players[nextId]?.isNpc) {
        setTimeout(processNpcTurn, 2000);
    }
}

// ==========================================
//  Socket.io 通信イベント (切断・同期・マッチング)
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    // クライアントから送られたトークンをソケットに保持
    socket.authToken = socket.handshake.auth?.token || "";

    socket.on('join_game', (userData) => {
        const isFirst = Object.keys(gameState.players).length === 0;
        
        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || "issei",
            dbUserId: userData?.id || null,  // フロントからDBのユーザーIDをもらう想定
            token: socket.authToken,         // APIを叩くためのトークン
            hp: 100, maxHp: 100, ap: 100, maxAp: 100,
            atk: 60, def: 45,
            team: isFirst ? 'red' : 'blue',
            isReady: false,
            isNpc: false
        };

        // マッチング待機演出
        if (matchingTimer) clearTimeout(matchingTimer);
        matchingTimer = setTimeout(() => {
            if (Object.keys(gameState.players).length === 1) {
                const npcId = "cpu_lapulapu";
                gameState.players[npcId] = {
                    id: npcId, username: "猛将ラプパプ(CPU)",
                    dbUserId: null, token: null,
                    hp: 120, maxHp: 120, ap: 100, maxAp: 100,
                    atk: 75, def: 55, team: 'blue',
                    isReady: true, isNpc: true,
                    districtId: "11101" // CPU初期位置
                };
                gameState.districts["11101"] = npcId;
                gameState.status = 'standby';
                io.emit('gameStart', { status: 'standby' });
                io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
            }
        }, 3000);

        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    });

    socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
        const p = gameState.players[socket.id];
        if (p) {
            p.districtId = String(data.startDistrictId);
            gameState.districts[p.districtId] = socket.id;
            p.isReady = true;

            if (Object.values(gameState.players).every(pl => pl.isReady)) {
                gameState.status = 'playing';
                gameState.turn = 1;
                gameState.firstPlayerId = socket.id;
                gameState.turnOwnerId = socket.id;
                io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
                io.emit(SERVER_EVENTS.TURN_START, { turn: 1, turnOwnerId: socket.id });
            }
        }
    });

    // ★ 非同期処理 (async) に変更し、DB保存ロジックを追加
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

                // ==========================================
                // 【陣地占領時のDB保存】
                // ==========================================
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

    // プレイヤー切断時のクリーンアップ
    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        delete gameState.players[socket.id];
        
        if (Object.keys(gameState.players).length < 2) {
            if (matchingTimer) clearTimeout(matchingTimer);
            gameState.status = 'waiting';
            gameState.districts = {};
            // 残ったのがNPCだけなら消す
            const remainingId = Object.keys(gameState.players)[0];
            if (remainingId && gameState.players[remainingId].isNpc) {
                delete gameState.players[remainingId];
            }
        }
        io.emit('playerDisconnected', socket.id);
        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    });
});

// 1秒ごとの強制同期（ハートビート）
setInterval(() => {
    if (Object.keys(gameState.players).length > 0) {
        io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
    }
}, 1000);

server.listen(PORT, () => {
    console.log(`🚀 Heavy Tactical Server Running on port ${PORT}`);
});