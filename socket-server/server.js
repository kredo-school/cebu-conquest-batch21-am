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

// 🚀 神の恩恵（ボーナス）定義
const GOD_BONUSES = {
    war:       { atk: 10, def: 0, hp: 0,  apRegen: 0,   faith: 0 },   // 戦いの神
    fertility: { atk: 0,  def: 0, hp: 0,  apRegen: 0.2, faith: 0 },   // 豊穣の神 (AP回復量+20% = 1.2倍)
    guardian:  { atk: 0,  def: 10,hp: 20, apRegen: 0,   faith: 0 },   // 守護の神
    holy:      { atk: 0,  def: 0, hp: 0,  apRegen: 0,   faith: 0.2 }  // 聖なる神
};

// 🚀 サーバー内 簡易バフテーブル（特産品バフ：API連携まではこれで代用）
const DISTRICT_BUFFS = {
    "1": { atk: 10, def: 0, hp: 0 },   
    "2": { atk: 0, def: 10, hp: 0 },   
    // 必要に応じて拡張
};

// 🚀 データベースに試合結果を保存する非同期関数
async function saveGameResultToDB(winnerId, scores) {
    try {
        const payload = {
            winner_id: winnerId, // 勝者のID
            scores: scores,      // 陣地の獲得数など
            timestamp: new Date().toISOString()
        };

        console.log("📡 DBに結果を送信中...", payload);

        const response = await fetch(`${API_BASE_URL}/result.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // PHP側からのレスポンスを解析
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

function resolveBattle(attackerAtk, defenderDef) {
    // 信仰力(Faith)込みの最終ステータスが渡ってくる前提
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

    // =========================================================
    // 🚀 【新規追加】APIを叩いてDBに結果を非同期で保存！
    // =========================================================
    // 相手が切断した場合や引き分けの場合は、適切なIDを渡すよう調整が必要です
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

        // 🚀 初期ステータス適用（神選択前）
        gameState.players[socket.id] = {
            id: socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            districtId: null, 
            hp: 100, maxHp: 100, 
            ap: 100, maxAp: 100, stamina: 100, // staminaは互換性維持のため残す
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

        // 🚀 神のボーナスを適用
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

        // 🚀 AP不足チェック
        if (player.ap <= 0 && actionData.type !== 'stay' && actionData.type !== 'rest') {
            io.to(socket.id).emit(EVENTS.SERVER.ACTION_REJECTED, { message: "AP(スタミナ)が足りません！" });
            return;
        }

        try {
            switch (actionData.type) {
                case 'stay':
                case 'rest':
                    // 仕様: HP +20 / AP +30 (豊穣の神なら apRegenMultiでボーナス)
                    player.hp = Math.min(player.maxHp, player.hp + 20);
                    const apRecover = Math.floor(30 * player.apRegenMulti);
                    player.ap = Math.min(player.maxAp, player.ap + apRecover);
                    player.stamina = player.ap; // 互換性維持
                    turnLogs.push(`💤 ${player.username} は待機し、HPとAPを回復した。`);
                    break;

                case 'defend': 
                    player.isDefending = true; 
                    turnLogs.push(`🛡️ ${player.username} は防御を固めた！（被ダメージ軽減）`);
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
                        
                        const targetId = actionData.targetId;
                        const defenderId = gameState.districts[targetId];
                        
                        let targetDef = 40;
                        let targetFaith = 1.0;
                        let defender = null;

                        if (defenderId && gameState.players[defenderId]) {
                            defender = gameState.players[defenderId];
                            targetDef = defender.def;
                            targetFaith = defender.faith;
                            
                            // 防御フラグが立っていたら防御力1.5倍
                            if (defender.isDefending) {
                                targetDef = Math.floor(targetDef * 1.5);
                                turnLogs.push(`🛡️ ${defender.username} の鉄壁の防御！`);
                            }
                        }

                        // 🚀 信仰力(Faith)を乗算して最終ステータスを算出
                        const finalAtk = player.atk * player.faith;
                        const finalDef = targetDef * targetFaith;

                        const result = resolveBattle(finalAtk, finalDef);

                        if (result.isWin) {
                            gameState.districts[targetId] = socket.id;
                            player.districtId = targetId; 

                            // 特産品バフの付与
                            const buff = DISTRICT_BUFFS[targetId];
                            if (buff) {
                                player.atk += buff.atk || 0;
                                player.def += buff.def || 0;
                            }

                            turnLogs.push(`⚔️ ${player.username} が地区 ${targetId} を制圧！`);
                            checkCompleteDomination();
                        } else {
                            // 敗北時ダメージ計算（もし自分が防御フラグを立てていたら半減）
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

            // 自分の行動が終わったら防御フラグをリセット
            if (actionData.type !== 'defend') {
                player.isDefending = false;
            }

            // =========================================================
            // サドンデス判定（HPが0以下なら即敗北）
            // =========================================================
            if (player.hp <= 0) {
                player.hp = 0;
                turnLogs.push(`💀 ${player.username} の体力が尽きた...！`);
                
                // 生き残った相手プレイヤーのIDを取得して勝者とする
                const winnerId = playerIds.find(id => id !== socket.id) || null;
                
                // 死亡ログをクライアントに送ってから即ゲーム終了
                io.emit(EVENTS.SERVER.ACTION_RESULT, { logs: turnLogs, state: gameState });
                endGame(winnerId);
                return; // ⚠️ ここで処理を強制終了（下のターン交代に進ませない）
            }

            // ターン交代
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