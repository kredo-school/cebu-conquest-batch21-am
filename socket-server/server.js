const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ==========================================
// マスターデータ＆定数定義
// ==========================================

// --- 1. Socketイベント名の完全統一 ---
// src/game/socketEvents.js と値（文字列）を完全に一致させています
const EVENTS = {
  CLIENT: {
    PLAYER_MOVE: "playerMove",
    TERRITORY_CLAIMED: "territoryClaimed",
    BATTLE_START: "battleStart",
    ACTION_ESCAPE: "actionEscape",  // 新規: 逃げる
    ACTION_DEFEND: "actionDefend",  // 新規: 防御
    ITEM_WARP: "itemWarp"           // 新規: ワープアイテム使用
  },
  SERVER: {
    SYNC_STATE: "syncState",
    PLAYER_MOVED: "playerMoved",
    TERRITORY_UPDATED: "territoryUpdated",
    BATTLE_RESULT: "battleResult",
    NPC_UPDATE: "npcUpdate",
    STATUS_UPDATED: "statusUpdated", // 新規: バフ等ステータス更新
    ACTION_RESULT: "actionResult"    // 新規: 逃走結果など
  }
};

// --- 2. ワープ移動用スポット座標テーブル ---
// GI-Project_ID管理シート - Spots.csv より抜粋
const SPOT_COORDS = {
  10011: { x: 320, y: 480 }, // サン・ペドロ要塞
  10012: { x: 350, y: 500 }, // カルボン・マーケット
  20000: { x: 800, y: 200 }  // マクタン・シュライン
  // ※他のスポット座標も確定次第ここに追加してください
};

// ==========================================
// ゲームステート管理
// ==========================================

// ゲーム全体の状態
let gameState = {
    status: 'waiting',
    turn: 1,
    players: {},
    districts: {},
    pendingActions: {} // ★修正1: アクション保留箱を追加
};

function resolveBattle(attackerAtk, defenderDef) {
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    const isWin = Math.random() < winProbability;
    return { isWin, winProbability };
}

// --- ターン終了＆アクション一斉解決エンジン ---
function resolveTurn() {
    console.log(`\n=== ターン ${gameState.turn} 解決フェーズ ===`);
    const actions = gameState.pendingActions;
    let turnLogs = []; // クライアントに表示するログ

    // ②＆③: アクションの処理（AP消費とサーバーバトル）
    for (const [playerId, action] of Object.entries(actions)) {
        const player = gameState.players[playerId];
        if (!player) continue;

        // プレイヤーの所有陣地数をカウント（逃走判定用）
        const myTerritoriesCount = Object.values(gameState.districts).filter(owner => owner === playerId).length;

        // --- 新規: 防御と逃げるのアクション ---
        if (action.type === EVENTS.CLIENT.ACTION_DEFEND) {
            // 防御: そのターンの間、被ダメージ計算時に防御力を1.5倍にするためのフラグ
            player.isDefending = true; 
            turnLogs.push(`🛡️ ${player.username} は防御の構えをとった！`);
        } 
        else if (action.type === EVENTS.CLIENT.ACTION_ESCAPE) {
            // 逃げる処理
            if (myTerritoriesCount >= 1) {
                player.stamina = Math.max(0, player.stamina - 5);
                turnLogs.push(`🏃 ${player.username} は無事に逃走した！`);
                io.to(playerId).emit(EVENTS.SERVER.ACTION_RESULT, { success: true, message: '逃走成功' });
            } else {
                player.hp = Math.max(0, player.hp - 50);
                turnLogs.push(`💥 ${player.username} は逃走に失敗し、50のダメージを受けた！`);
                io.to(playerId).emit(EVENTS.SERVER.ACTION_RESULT, { success: false, message: '逃走失敗' });
            }
        }
        // --- 既存: 休息と攻撃のアクション ---
        else if (action.type === 'rest') {
            // 休息アクション: APを30回復
            player.stamina = Math.min(100, player.stamina + 30);
            turnLogs.push(`💤 ${player.username} は休息し、APを回復した。`);
        } 
        else if (action.type === 'attack') {
            // 攻撃アクション: APを20消費してバトル
            if (player.stamina >= 20) {
                player.stamina -= 20; 
                const targetId = action.targetId; // 攻める陣地のID
                
                // バトル判定 (勝率計算)
                // ※テスト用に固定値。必要に応じて防御側(defender)のisDefendingフラグを見てDEFを1.5倍にするロジックをここに追加できます
                const result = resolveBattle(60, 40); 
                
                if (result.isWin) {
                    // ★修正3: 勝利時の処理を移植（陣地獲得と色の即時更新）
                    gameState.districts[targetId] = playerId;
                    turnLogs.push(`⚔️ ${player.username} が陣地を獲得しました！`);
                    
                    io.emit(EVENTS.SERVER.TERRITORY_UPDATED, {
                        districtId: targetId,
                        owner: playerId,
                        team: player.team 
                    });
                } else {
                    // ★修正3: 敗北時の処理を移植（HP減少）
                    player.hp = Math.max(0, player.hp - 20);
                    turnLogs.push(`🛡️ ${player.username} は陣地の制圧に失敗し、ダメージを受けた...`);
                }
            } else {
                turnLogs.push(`⚠️ ${player.username} はスタミナ不足で動けなかった！`);
            }
        }
    }

    // クライアントへ結果と最新ステータスを送信
    io.emit('turnResult', { logs: turnLogs, state: gameState });

    // 【重要】ターン終了直前に、全員の `isDefending` フラグをリセット
    for (const pId in gameState.players) {
        if (gameState.players[pId]) {
            gameState.players[pId].isDefending = false;
        }
    }

    // ①＆④: 10ターン制ロジックと勝利条件判定
    if (gameState.turn >= 10) {
        console.log("=== ゲーム終了！勝敗判定 ===");
        let scores = {};
        
        // 陣地の数をカウント
        for (const district in gameState.districts) {
            const owner = gameState.districts[district];
            scores[owner] = (scores[owner] || 0) + 1;
        }

        // 最も陣地が多いプレイヤーを特定
        let winnerId = null;
        let maxScore = -1;
        for (const [pId, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                winnerId = pId;
            }
        }

        gameState.status = 'finished';
        io.emit('gameOver', { winnerId: winnerId, scores: scores });
    } else {
        // 次のターンへ進む
        gameState.turn++;
        gameState.pendingActions = {}; // アクション箱をリセット
        io.emit('turnStart', { turn: gameState.turn });
    }
}

// ==========================================
// Socket 通信処理
// ==========================================

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

    // --- 1. ゲーム参加 ---
    socket.on('join_game', (userData) => {
        const currentPlayers = Object.keys(gameState.players);

        if (currentPlayers.length >= 2 && !gameState.players[socket.id]) {
            console.log(`入室拒否: ルーム満員 (${socket.id})`);
            socket.emit('room_full', { message: '現在ルームは満員です。観戦モードは未実装です。' });
            return;
        }

        let assignedTeam = 'red'; 
        if (currentPlayers.length === 1) {
            const existingPlayer = gameState.players[currentPlayers[0]];
            assignedTeam = existingPlayer.team === 'red' ? 'blue' : 'red';
        }

        gameState.players[socket.id] = {
            id: socket.id,
            userId: userData?.userId || socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            x: userData?.x || 0,
            y: userData?.y || 0,
            districtId: null, 
            hp: 100,          
            stamina: 100,
            team: assignedTeam,
            isDefending: false // 初期化時に防御フラグを持たせる
        };

        console.log(`参加者: ${gameState.players[socket.id].username} [${assignedTeam}チーム] (現在: ${Object.keys(gameState.players).length}名)`);

        // ★修正2: 2人揃ったらターン1をスタートさせる
        if (Object.keys(gameState.players).length === 2 && gameState.status === 'waiting') {
            gameState.status = 'playing';
            gameState.turn = 1;
            gameState.pendingActions = {};
            console.log(`★ 2名揃いました！セブとり合戦、開始！`);
            io.emit('gameStart', { 
                startTime: Date.now(),
                status: gameState.status 
            });
            // ターン開始イベントを発火！
            io.emit('turnStart', { turn: gameState.turn });
        }
    });

    // --- 2. プレイヤー移動 ---
    socket.on(EVENTS.CLIENT.PLAYER_MOVE, (moveData) => { 
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = moveData.x;
            gameState.players[socket.id].y = moveData.y;
            socket.broadcast.emit(EVENTS.SERVER.PLAYER_MOVED, { id: socket.id, x: moveData.x, y: moveData.y });
        }
    });

    // --- 3. アクションの提出 ---
    socket.on('actionSubmit', (actionData) => {
        if (gameState.status !== 'playing') return;

        console.log(`[TURN ${gameState.turn}] Player ${socket.id} がアクション決定: ${actionData.type}`);

        // 保留箱にアクションを格納
        gameState.pendingActions[socket.id] = actionData;
        
        // 相手に「準備完了」を通知（UI更新用）
        io.emit('playerReady', { socketId: socket.id });

        // 両者のアクションが揃ったらターン一斉解決！
        if (Object.keys(gameState.pendingActions).length === 2) {
            resolveTurn();
        }
    });

    // --- 【新規】4. ワープアイテムの使用 ---
    socket.on(EVENTS.CLIENT.ITEM_WARP, (data) => {
        const targetCoords = SPOT_COORDS[data.spot_id];
        
        if (targetCoords && gameState.players[socket.id]) {
            // ① サーバー上のプレイヤー座標を更新
            gameState.players[socket.id].x = targetCoords.x;
            gameState.players[socket.id].y = targetCoords.y;
            
            // ② 全クライアントにブロードキャスト（Phaser側でキャラを瞬間移動）
            io.emit(EVENTS.SERVER.PLAYER_MOVED, { 
                id: socket.id, 
                x: targetCoords.x, 
                y: targetCoords.y 
            });
            console.log(`🚀 ワープ発動: ${gameState.players[socket.id].username} が spot_id:${data.spot_id} へ移動しました。`);
        } else {
            console.log(`⚠️ ワープ失敗: 無効な spot_id (${data.spot_id})`);
        }
    });

    // --- 5. 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`ユーザー切断: ${socket.id}`);
        delete gameState.players[socket.id];
        delete gameState.pendingActions[socket.id]; // 切断時はアクションも消す
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
        }
        io.emit('playerDisconnected', socket.id);
    });
});

// 状態の定期同期
setInterval(() => {
    if (Object.keys(gameState.players).length > 0) io.emit(EVENTS.SERVER.SYNC_STATE, gameState);
}, 1000);

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中 (PORT: ${PORT})`);
    console.log(`★ 10ターン制・AP管理・同時ターン処理エンジン 稼働中！`);
    console.log(`★ ワープ機能・防御/逃げるロジック 統合済み`);
    console.log(`-----------------------------------------`);
});