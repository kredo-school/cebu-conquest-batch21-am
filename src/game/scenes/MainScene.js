// src/game/scenes/MainScene.js
// TMJの districtName レイヤーからポリゴンを読み込み、
// ハードコードされた DISTRICTS を完全に置き換える

import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../socketEvents";

// ═══════════════════════════════════════════════════
// 定数
// ═══════════════════════════════════════════════════
const TILE_SIZE = 32; // TMJの tilewidth/tileheight に合わせる

// マップ表示スケール
const MAP_SCALE = 0.5;

// プレイヤーカラー定義
const COLOR = {
  PLAYER: 0xe74c3c,
  ENEMY: 0x27ae60,
  NEUTRAL: 0x4a90d9,
  HIGHLIGHT: 0xf39c12,
  PLAYER_UI: "#f1c40f",
};

// プレイヤー初期ステータス
const INITIAL_PLAYER_STATS = {
  atk: 50,
  def: 40,
  hp: 100,
  ap: 80,
  faith: 1.0,
};

// 隣接グラフ（省略せずに保持）
const ADJACENCY = {
  101: [102, 103, 104, 105, 201],
  102: [101, 104, 105, 401],
  103: [101, 105, 201, 301],
  104: [101, 102, 105, 401],
  105: [101, 103, 104, 301],
  201: [202, 101, 103],
  202: [201],
  301: [302, 103, 105],
  302: [301],
  401: [402, 102, 104],
  402: [401],
};

// ポリゴン内外判定
function pointInPolygon(point, polygon) {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ═══════════════════════════════════════════════════
// MainScene
// ═══════════════════════════════════════════════════
export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.districts = {};
    this.playerStats = { ...INITIAL_PLAYER_STATS };
    this.currentDistrictId = null;
    this.START_DISTRICT_ID = 102;
  }

  preload() {
    this.load.image("tiles", "assets/tilesets/Slates.png");
    this.load.tilemapTiledJSON("map", "assets/maps/cebu_map_簡易版.tmj");
  }

  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._placePlayer(); // ここで名前が表示されます
    this._createHUD();
    this._setupCamera();
    this._initSocket();
  }

  _setupTilemap() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("Slates.png", "tiles");
    if (!tileset) return;
    this.tileLayer = map.createLayer("タイルレイヤー1", tileset, 0, 0);
    if (this.tileLayer) this.tileLayer.setScale(MAP_SCALE);
    this.tiledMap = map;
  }

  _loadDistrictsFromTMJ() {
    if (!this.tiledMap) return;
    const objectLayer = this.tiledMap.getObjectLayer("districtName");
    if (!objectLayer) return;

    objectLayer.objects.forEach((obj) => {
      const districtIdStr = obj.properties?.[0]?.name;
      const districtId = parseInt(districtIdStr, 10);
      if (isNaN(districtId)) return;

      const absolutePolygon = (obj.polygon || []).map((p) => ({
        x: (obj.x + p.x) * MAP_SCALE,
        y: (obj.y + p.y) * MAP_SCALE,
      }));

      const center = this._calcPolygonCenter(absolutePolygon);

      this.districts[districtId] = {
        id: districtId,
        name: obj.name,
        polygon: absolutePolygon,
        center,
        owner: null,
        graphics: null,
      };
    });
  }

  _drawDistrictPolygons() {
    const inputOverlay = this.add
      .rectangle(0, 0, 50 * TILE_SIZE * MAP_SCALE, 50 * TILE_SIZE * MAP_SCALE, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();

    inputOverlay.on("pointerdown", (p) => this._onMapClicked(p.x, p.y));
    inputOverlay.on("pointermove", (p) => this._onMapHover(p.x, p.y));

    Object.values(this.districts).forEach((district) => {
      district.graphics = this.add.graphics();
      this._redrawDistrict(district, COLOR.NEUTRAL);
      this.add.text(district.center.x, district.center.y, district.name, {
        fontSize: "9px", color: "#ffffff", align: "center", stroke: "#000000", strokeThickness: 2,
      }).setOrigin(0.5).setDepth(2);
    });
  }

  _redrawDistrict(district, fillColor, alpha = 0.5) {
    const gfx = district.graphics;
    if (!gfx) return;
    gfx.clear().fillStyle(fillColor, alpha).beginPath();
    district.polygon.forEach((p, i) => i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y));
    gfx.closePath().fillPath().lineStyle(2, 0xffffff, 0.8).strokePath();
  }

  // ───────────────────────────────────────────────
  // ④ プレイヤーを初期拠点（102）に配置（★ここを修正！）
  // ───────────────────────────────────────────────
  _placePlayer() {
    this.currentDistrictId = this.START_DISTRICT_ID;
    const start = this.districts[this.START_DISTRICT_ID];
    if (!start) return;

    this.player = this.add.circle(start.center.x, start.center.y, 12, 0xf1c40f).setDepth(3);

    // 【役割：名前の取得】
    // PhaserGame.jsx で registry.set した 'playerName' を取り出します。
    const nameFromLogin = this.registry.get('playerName') || 'Guest';

    this.playerLabel = this.add
      .text(start.center.x, start.center.y - 20, nameFromLogin, { // ★ "あきら" から変更
        fontSize: "11px",
        color: COLOR.PLAYER_UI,
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    start.owner = "player";
    this._redrawDistrict(start, COLOR.PLAYER);
  }

  _createHUD() {
    this.add.rectangle(0, 0, 320, 28, 0x000000, 0.6).setOrigin(0, 0).setScrollFactor(0).setDepth(10);
    this.statusText = this.add.text(8, 6, "", { fontSize: "11px", color: "#ffffff" }).setScrollFactor(0).setDepth(11);
    this.logText = this.add.text(8, this.scale.height - 28, "", {
      fontSize: "11px", color: "#aaffaa", backgroundColor: "#00000099", padding: { x: 4, y: 2 },
    }).setScrollFactor(0).setDepth(11);
    this.updateStatusHUD();
  }

  _setupCamera() {
  const mapPixelW = 50 * TILE_SIZE * MAP_SCALE; // 約800px
  const mapPixelH = 50 * TILE_SIZE * MAP_SCALE; // 約800px

  // カメラが動ける範囲を地図のサイズに合わせる
  this.cameras.main.setBounds(0, 0, mapPixelW, mapPixelH);

  // ★ ここを追加：地図を画面（キャンバス）の中央に配置する
  // 【役割】画面の幅から地図の幅を引いて、半分移動させることで「中央寄せ」にします
  const offsetX = (this.scale.width - mapPixelW) / 2;
  const offsetY = (this.scale.height - mapPixelH) / 2;
  
  // 地図が画面より小さい場合のみ、カメラをずらして中央に見せる
  if (offsetX > 0) this.cameras.main.setViewport(offsetX, offsetY, mapPixelW, mapPixelH);
  
  // 背景色を少し明るい紺色にして「海」っぽくする（没入感UP）
  this.cameras.main.setBackgroundColor('#1a1a2e'); 
}

  _onMapClicked(screenX, screenY) {
    const worldX = screenX + this.cameras.main.scrollX;
    const worldY = screenY + this.cameras.main.scrollY;
    const clickedId = this._getDistrictAtPoint(worldX, worldY);
    if (!clickedId) return;

    if (clickedId === this.currentDistrictId) return;

    const neighbors = ADJACENCY[this.currentDistrictId] || [];
    if (!neighbors.includes(clickedId)) {
      this.showLog(`⚠ 地区${clickedId}へは直接移動できません`);
      return;
    }

    const target = this.districts[clickedId];
    if (target.owner === "enemy") {
      this.startBattle(clickedId);
    } else {
      this._emitPlayerMove(this.currentDistrictId, clickedId);
      this.movePlayer(clickedId);
      this.claimDistrict(clickedId, "player");
      this._emitTerritoryClaimed(clickedId);
    }
  }

  _onMapHover(screenX, screenY) {
    const worldX = screenX + this.cameras.main.scrollX;
    const worldY = screenY + this.cameras.main.scrollY;
    const hoveredId = this._getDistrictAtPoint(worldX, worldY);

    Object.values(this.districts).forEach((d) => {
      if (d.owner === "player") this._redrawDistrict(d, COLOR.PLAYER);
      else if (d.owner === "enemy") this._redrawDistrict(d, COLOR.ENEMY);
      else this._redrawDistrict(d, COLOR.NEUTRAL);
    });

    if (hoveredId && this.districts[hoveredId]) {
      this._redrawDistrict(this.districts[hoveredId], COLOR.HIGHLIGHT, 0.7);
    }
  }

  movePlayer(districtId) {
    const target = this.districts[districtId];
    if (!target) return;
    const tweenCfg = (obj, x, y) => ({ targets: obj, x, y, duration: 300, ease: "Power2" });
    this.tweens.add(tweenCfg(this.player, target.center.x, target.center.y));
    this.tweens.add(tweenCfg(this.playerLabel, target.center.x, target.center.y - 20));
    this.currentDistrictId = districtId;
  }

  claimDistrict(districtId, owner) {
    const target = this.districts[districtId];
    if (!target) return;
    target.owner = owner;
    this._redrawDistrict(target, owner === "player" ? COLOR.PLAYER : COLOR.ENEMY);
    this.showLog(`✅ 「${target.name}」を占領！`);
  }

  startBattle(targetDistrictId) {
    const enemyStats = { atk: 45, def: 50 };
    const myFinalAtk = this.playerStats.atk * this.playerStats.faith;
    const winRate = myFinalAtk / (myFinalAtk + enemyStats.def);
    const winPercent = Math.round(winRate * 100);

    this.showLog(`⚔ バトル！ 予測勝率: ${winPercent}%`);

    this.time.delayedCall(300, () => {
      if (Math.random() < winRate) {
        this.showLog(`🎉 勝利！ 地区${targetDistrictId}を制圧`);
        this.movePlayer(targetDistrictId);
        this.claimDistrict(targetDistrictId, "player");
      } else {
        const damage = Math.floor(enemyStats.atk * 0.5);
        this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);
        this.showLog(`💀 敗北… HP -${damage} (残HP: ${this.playerStats.hp})`);
        this.updateStatusHUD();
        if (this.playerStats.hp <= 0) this.respawnPlayer();
      }
    });
  }

  respawnPlayer() {
    this.playerStats = { ...INITIAL_PLAYER_STATS };
    this.movePlayer(this.START_DISTRICT_ID);
    this.updateStatusHUD();
  }

  updateStatusHUD() {
    const s = this.playerStats;
    this.statusText?.setText(`HP:${s.hp}  ATK:${s.atk}  DEF:${s.def}  AP:${s.ap}  信仰:${s.faith.toFixed(1)}`);
  }

  showLog(message) {
    console.log(`[MainScene] ${message}`);
    this.logText?.setText(message);
  }

  _getDistrictAtPoint(worldX, worldY) {
    const point = { x: worldX, y: worldY };
    for (const [id, district] of Object.entries(this.districts)) {
      if (pointInPolygon(point, district.polygon)) return Number(id);
    }
    return null;
  }

  _calcPolygonCenter(polygon) {
    const sumX = polygon.reduce((s, p) => s + p.x, 0);
    const sumY = polygon.reduce((s, p) => s + p.y, 0);
    return { x: sumX / polygon.length, y: sumY / polygon.length };
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (p) => this._applySyncState(p));
    socket.on(SERVER_EVENTS.PLAYER_MOVED, (p) => {
      if (p.playerId !== socket.id) this._renderOtherPlayer(p);
    });
    socket.on(SERVER_EVENTS.TERRITORY_UPDATED, (p) => {
      if (!this.districts[p.districtId]) return;
      this.districts[p.districtId].owner = p.owner;
      const color = p.owner === "player" ? COLOR.PLAYER : p.owner === "neutral" ? COLOR.NEUTRAL : COLOR.ENEMY;
      this._redrawDistrict(this.districts[p.districtId], color);
    });
  }

  _applySyncState({ territories }) {
    Object.entries(territories).forEach(([id, data]) => {
      const d = this.districts[id];
      if (!d) return;
      d.owner = data.owner;
      const color = data.owner === "player" ? COLOR.PLAYER : data.owner === "neutral" ? COLOR.NEUTRAL : COLOR.ENEMY;
      this._redrawDistrict(d, color);
    });
  }

  _renderOtherPlayer({ playerId, toDistrictId }) {
    const target = this.districts[toDistrictId];
    if (!target) return;
    if (!this.otherPlayers) this.otherPlayers = {};
    if (!this.otherPlayers[playerId]) {
      this.otherPlayers[playerId] = this.add.circle(target.center.x, target.center.y, 16, COLOR.ENEMY).setDepth(1);
    } else {
      this.tweens.add({ targets: this.otherPlayers[playerId], x: target.center.x, y: target.center.y, duration: 300 });
    }
  }

  _emitPlayerMove(fromDistrictId, toDistrictId) {
    socket.emit(CLIENT_EVENTS.PLAYER_MOVE, { playerId: socket.id, fromDistrictId, toDistrictId });
  }

  _emitTerritoryClaimed(districtId) {
    socket.emit(CLIENT_EVENTS.TERRITORY_CLAIMED, { playerId: socket.id, districtId, owner: "player" });
  }
}