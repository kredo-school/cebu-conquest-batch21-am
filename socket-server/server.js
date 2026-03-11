const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS設定: Vite/Reactフロントエンドからのアクセスを許可
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// サーバー側で保持する【正の世界（Server State）】
const gameState = {
  players: {}, // { socketId: { x, y, color, playerId } }
  territories: {} // { territoryId: { ownerId, color } }
};

// --- バトル判定ロジック（要件定義: A / (A+D)） ---
function resolveBattle(attackerAtk, defenderDef) {
  // 攻撃力(A)と防御力(D)から勝率(P)を計算
  const winProbability = attackerAtk / (attackerAtk + defenderDef);
  // 0〜1の乱数を生成し、勝率と比較して勝敗を決定
  const isWin = Math.random() < winProbability;
  return { isWin, winProbability };
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // 新規プレイヤーの初期状態をセット
  gameState.players[socket.id] = {
    x: 0,
    y: 0,
    color: 'red', // 初期テスト用
    playerId: socket.id
  };

  // 1. 接続した本人に現在の全体ステートを送信
  socket.emit('current_state', gameState);

  // 2. 他の全プレイヤーに新規プレイヤーが参加したことを通知
  socket.broadcast.emit('player_joined', gameState.players[socket.id]);

  // プレイヤーの移動イベントを受信（データの上書きのみ行う）
  socket.on('player_move', (moveData) => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].x = moveData.x;
      gameState.players[socket.id].y = moveData.y;
    }
  });

  // 陣地獲得イベントを受信（データの上書きのみ行う）
  socket.on('territory_claimed', (data) => {
    gameState.territories[data.territoryId] = {
      ownerId: socket.id,
      color: gameState.players[socket.id].color
    };
  });

  // 陣地へ攻撃を仕掛けるイベントを受信
  socket.on('attack_territory', (data) => {
    // data: { territoryId, attackerAtk }
    const targetTerritory = gameState.territories[data.territoryId];
    
    // 誰も所有していない空き地なら無条件で獲得
    if (!targetTerritory || !targetTerritory.ownerId) {
      gameState.territories[data.territoryId] = {
        ownerId: socket.id,
        color: gameState.players[socket.id].color
      };
      console.log(`[BATTLE] 空き地 ${data.territoryId} を無血開城で獲得！`);
      return;
    }

    // 既に誰かの陣地ならバトル発生！
    const defenderId = targetTerritory.ownerId;
    
    // ※本来はDBやステートから防御側のDEFを取得しますが、今はテスト用に固定値「50」とします
    const defenderDef = 50; 
    
    console.log(`[BATTLE] 陣地 ${data.territoryId} でバトル発生！ ATK:${data.attackerAtk} vs DEF:${defenderDef}`);
    const result = resolveBattle(data.attackerAtk, defenderDef);
    
    if (result.isWin) {
      // 勝利：陣地を自軍の色に塗り替える
      gameState.territories[data.territoryId] = {
        ownerId: socket.id,
        color: gameState.players[socket.id].color
      };
      console.log(`[BATTLE RESULT] 攻撃成功！陣地を奪いました (勝率: ${(result.winProbability * 100).toFixed(1)}%)`);
    } else {
      // 敗北：陣地は奪えず弾かれる
      console.log(`[BATTLE RESULT] 攻撃失敗...防衛されました (勝率: ${(result.winProbability * 100).toFixed(1)}%)`);
    }
  });

  // 切断時の処理
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete gameState.players[socket.id];
    io.emit('player_left', socket.id);
  });
});

// 1秒間隔（1000ms）で【正の世界】を全プレイヤーに同期（Tick Rate） ---
setInterval(() => {
  io.emit('sync_state', gameState);
}, 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});