import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../shared/socketEvents.js';

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const EVENTS = { CLIENT: CLIENT_EVENTS, SERVER: SERVER_EVENTS };

// 🚀 【マスターデータ】バフと優先度の定義
const DISTRICTS_MASTER = {
  "11101": { name: "チチャロン地区", priority: 3, buff: { atk: 10, def: 0 } },
  "11102": { name: "マンゴー地区", priority: 9, buff: { atk: 12, def: 12 } },
  "11119": { name: "マリン・ジャイアント", priority: 8, buff: { atk: 20, def: 0 } },
  "11120": { name: "ヘリテージ・グルメ", priority: 8, buff: { atk: 0, def: 20 } },
};

const ADJACENT_DISTRICTS = {
  "11101": ["11102", "11104", "11105", "11120"],
  "11102": ["11101", "11104", "11106", "11108"],
  "11119": ["11112", "11113", "11115", "11118", "11120"],
  "11120": ["11116", "11119", "11101"]
};

let gameState = { status: 'waiting', turn: 0, maxTurn: 30, turnOwnerId: null, players: {}, districts: {} };
let matchingTimer = null;

function calculateFinalStats(pid) {
  const p = gameState.players[pid];
  if (!p) return { atk: 40, def: 40 };
  let bAtk = 0, bDef = 0;
  Object.entries(gameState.districts).forEach(([dId, oid]) => {
    if (oid === pid && DISTRICTS_MASTER[dId]?.buff) {
      bAtk += DISTRICTS_MASTER[dId].buff.atk; bDef += DISTRICTS_MASTER[dId].buff.def;
    }
  });
  return { atk: p.atk + bAtk, def: p.def + bDef };
}

function processNpcTurn() {
  const npcId = gameState.turnOwnerId;
  const npc = gameState.players[npcId];
  if (!npc || !npc.isNpc) return;

  const neighbors = ADJACENT_DISTRICTS[String(npc.districtId)] || [];
  let targets = neighbors.map(id => ({ id, score: (gameState.districts[id] && gameState.districts[id] !== npcId ? 20 : 5) }));
  targets.sort((a,b) => b.score - a.score);

  if (targets.length > 0) {
    const target = targets[0];
    if (gameState.districts[target.id] === npcId) {
      npc.districtId = target.id;
    } else {
      gameState.districts[target.id] = npcId;
      npc.districtId = target.id;
      io.emit('GAME_LOG', `⚔️ ${npc.username}: 地区 ${target.id} を制圧！`);
    }
  }
  setTimeout(() => finalizeTurn(npcId), 2000);
}

function finalizeTurn(curr) {
  const ids = Object.keys(gameState.players);
  const next = ids.find(id => id !== curr) || ids[0];
  gameState.turnOwnerId = next;
  if (next === Object.keys(gameState.players)[0]) gameState.turn++;
  io.emit(SERVER_EVENTS.SYNC_STATE, gameState);
  if (gameState.players[next]?.isNpc) setTimeout(processNpcTurn, 2000);
}

io.on('connection', (socket) => {
  socket.on('join_game', (userData) => {
    gameState.players[socket.id] = { id: socket.id, username: userData?.username || "issei", hp: 100, atk: 60, def: 45, team: 'red', isReady: false, isNpc: false };
    if (matchingTimer) clearTimeout(matchingTimer);
    matchingTimer = setTimeout(() => {
      if (Object.keys(gameState.players).length === 1) {
        const npcId = "cpu_lapulapu";
        gameState.players[npcId] = { id: npcId, username: "猛将ラプパプ(CPU)", hp: 120, team: 'blue', isReady: true, isNpc: true, districtId: "11101", atk: 70, def: 50 };
        gameState.districts["11101"] = npcId;
        gameState.status = 'standby'; io.emit('gameStart', { status: 'standby' });
      }
    }, 2000);
  });

  socket.on(EVENTS.CLIENT.READY_TO_START, (data) => {
    const p = gameState.players[socket.id];
    if (p) { p.districtId = String(data.startDistrictId); gameState.districts[p.districtId] = socket.id; p.isReady = true; }
    if (Object.values(gameState.players).every(pl => pl.isReady)) {
      gameState.status = 'playing'; gameState.turn = 1; gameState.turnOwnerId = socket.id;
    }
  });

  socket.on('ACTION_SUBMIT', (data) => {
    const p = gameState.players[socket.id];
    if (data.type === 'move') p.districtId = String(data.targetId);
    finalizeTurn(socket.id);
  });

  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    if (Object.keys(gameState.players).length < 2) {
       gameState.status = 'waiting'; gameState.districts = {};
    }
  });
});

// 🚀 ハートビート（以前の鉄壁同期ループ）
setInterval(() => { if (Object.keys(gameState.players).length > 0) io.emit(SERVER_EVENTS.SYNC_STATE, gameState); }, 1000);

server.listen(PORT, () => console.log(`🚀 Final Game Server Running on ${PORT}`));