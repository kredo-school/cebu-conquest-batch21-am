const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ゲーム全体の状態
let gameState = {
    status: 'waiting',
    turn: 1,
    players: {},
    districts: {}
};

// ... (resolveBattle 関数はそのまま維持) ...
function resolveBattle(attackerAtk, defenderDef) {
    const winProbability = attackerAtk / (attackerAtk + defenderDef);
    const isWin = Math.random() < winProbability;
    return { isWin, winProbability };
}

io.on('connection', (socket) => {
    console.log(`ユーザー接続成功: ${socket.id}`);

    // --- 1. ゲーム参加 ---
    socket.on('join_game', (userData) => {
        const currentPlayers = Object.keys(gameState.players);

        // ① プレイヤー人数を2人に制限（満員なら弾く）
        if (currentPlayers.length >= 2 && !gameState.players[socket.id]) {
            console.log(`入室拒否: ルーム満員 (${socket.id})`);
            socket.emit('room_full', { message: '現在ルームは満員です。観戦モードは未実装です。' });
            return;
        }

        // ② チームカラーのサーバー側割り当て
        let assignedTeam = 'red'; // 1人目は必ず「赤」
        if (currentPlayers.length === 1) {
            // 既にいるプレイヤーの色を確認し、空いている色を割り当てる
            const existingPlayer = gameState.players[currentPlayers[0]];
            assignedTeam = existingPlayer.team === 'red' ? 'blue' : 'red';
        }

        // プレイヤーステータスの初期化（サーバーの決定を強制）
        gameState.players[socket.id] = {
            id: socket.id,
            userId: userData?.userId || socket.id,
            username: userData?.username || `Player_${socket.id.substring(0,4)}`,
            x: userData?.x || 0,
            y: userData?.y || 0,
            districtId: null, 
            hp: 100,          
            team: assignedTeam // ★ サーバーで決定した色をセット
        };

        console.log(`参加者: ${gameState.players[socket.id].username} [${assignedTeam}チーム] (現在: ${Object.keys(gameState.players).length}名)`);

        // 2人揃ったらゲーム開始
        if (Object.keys(gameState.players).length === 2 && gameState.status === 'waiting') {
            gameState.status = 'playing';
            console.log(`★ 2名揃いました！セブとり合戦、開始！`);
            io.emit('gameStart', { 
                startTime: Date.now(),
                status: gameState.status 
            });
        }
    });

    // --- 2. プレイヤー移動 ---
    socket.on('playerMove', (moveData) => { /* 省略せずに維持 */
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = moveData.x;
            gameState.players[socket.id].y = moveData.y;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: moveData.x, y: moveData.y });
        }
    });

    // --- 3. 陣地獲得 (③検証とブロードキャスト) ---
    socket.on('territoryClaimed', (data) => {
        console.log(`陣地獲得: District ${data.districtId} by ${data.owner}`);
        
        // サーバー上の正解データ(gameState)を更新
        gameState.districts[data.districtId] = data.owner;
        
        // 獲得者のチーム色をサーバーのgameStateから取得してブロードキャストに含める（安全策）
        const ownerTeam = gameState.players[data.owner]?.team || 'neutral';

        io.emit('territoryUpdated', {
            districtId: data.districtId,
            owner: data.owner,
            team: ownerTeam // ★ クライアントが不正な色を送ってきてもサーバーで上書き
        });
    });

    // --- 4. バトル開始 ---
    socket.on('battleStart', (battleData) => { /* 前回実装した処理を維持 */ });

    // --- 5. 切断処理 ---
    socket.on('disconnect', () => {
        console.log(`ユーザー切断: ${socket.id}`);
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length < 2) {
            gameState.status = 'waiting';
        }
        io.emit('playerDisconnected', socket.id);
    });
});

setInterval(() => {
    if (Object.keys(gameState.players).length > 0) io.emit('syncState', gameState);
}, 1000);

server.listen(PORT, () => {
    console.log(`-----------------------------------------`);
    console.log(`『セブとり合戦』Socketサーバー起動中 (PORT: ${PORT})`);
    console.log(`★ 2名制限 ＆ サーバー側チームカラー割当 適用済`);
    console.log(`-----------------------------------------`);
});