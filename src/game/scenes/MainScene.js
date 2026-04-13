import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../../../shared/socketEvents.js";
import { PHASER_TO_REACT, REACT_TO_PHASER } from "../events/PhaserBridge";

const MAP_SCALE = 0.5;

const COLOR = {
  MY_TERRITORY: 0xe74c3c, 
  ENEMY_TERRITORY: 0x27ae60, 
  NEUTRAL: 0x4a90d9, 
  HIGHLIGHT: 0xffff00, 
  PLAYER_DOT: 0xf1c40f, 
  ENEMY_DOT: 0x2ecc71, 
  TEAM_RED: 0xe74c3c,
  TEAM_BLUE: 0x3498db,
};

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

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.districts = {};
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this._dragMoved = false;
    this.otherPlayers = {};
    this.isSelectionMode = true; 
  }

  preload() {
    this.load.image("tiles", "/assets/tilesets/Slates.png");
    this.load.tilemapTiledJSON("map", "/assets/maps/cebu_map_簡易版.tmj");
  }

  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this._initSocket();
    this._setupReactListeners();
    this.updateStatusToReact();
    this.showLog("📍 地図をタップして開始地点を選択せよ");
  }

  update() {
    const zoom = this.cameras.main.zoom;
    Object.values(this.districts).forEach((d) => {
      if (d.textLabel) d.textLabel.setVisible(zoom > 0.8);
    });
  }

  _setupReactListeners() {
    const handlers = [
      { event: 'ACTION_STAY', handler: () => this.handleStay() },
      { event: 'ACTION_DEFEND', handler: () => this.handleDefense() },
      { event: 'ACTION_ESCAPE', handler: () => this.handleEscape() },
      {
        event: REACT_TO_PHASER?.COMMAND_DEPLOY_CONFIRM || "COMMAND_DEPLOY_CONFIRM",
        handler: (e) => this.confirmDeployment(e.detail.districtId),
      },
    ];
    handlers.forEach(({ event, handler }) => window.addEventListener(event, handler));
    this._reactListeners = handlers;
  }

  handleStay() {
    this.showLog("🧘 休息：APを回復し、待機中...");
    this.updateStatusToReact();
  }

  handleDefense() {
    this.showLog("🛡️ 防御：守りを固めています！");
  }

  handleEscape() {
    this.showLog("🏃 逃走：安全圏へ離脱します！");
  }

  /**
   * 🚀 修正：Day 1 以降のクリックで Attack ボタンを有効化するように変更
   */
  _onMapClicked(x, y) {
    if (this._dragMoved) return;
    const worldPoint = this.cameras.main.getWorldPoint(x, y);
    const id = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
    
    console.log("🗺️ マップクリック検知 ID:", id); // デバッグ用

    if (!id) return;

    const store = window.useGameStore?.getState();
    if (!store) return;

    if (this.isSelectionMode) {
      // --- 出撃地点選択モード ---
      Object.values(this.districts).forEach((d) => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[id], COLOR.HIGHLIGHT, 0.8);
      store.setStatus({ selectedDistrictId: id, currentDistrictName: this.districts[id].name });
    } else {
      // --- ⚔️ 攻撃対象選択モード（Day 1 以降） ---
      const neighbors = ADJACENCY[this.currentDistrictId] || [];
      const isNeighbor = neighbors.includes(id);

      if (isNeighbor) {
        this.showLog(`🎯 ターゲット選択：${this.districts[id].name}`);
        
        // 1. 地図上の見た目を更新（選択した場所を黄色く光らせる）
        Object.values(this.districts).forEach((d) => {
          const baseColor = (d.owner === "red") ? COLOR.TEAM_RED : (d.owner === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL);
          this._redrawDistrict(d, baseColor);
        });
        this._redrawDistrict(this.districts[id], COLOR.HIGHLIGHT, 0.8);

        // 2. React の Store を更新（これで Attack ボタンが赤くなります）
        store.setStatus({ selectedDistrictId: id });
        
        // 3. 念のためカスタムイベントも飛ばす
        window.dispatchEvent(new CustomEvent('DISTRICT_SELECTED', { detail: id }));
      } else {
        this.showLog("⚠️ 隣接する地区しか攻撃できません！");
      }
    }
  }

  confirmDeployment(startId) {
    this.isSelectionMode = false; 
    this.currentDistrictId = startId;
    this._placePlayer(startId);
    Object.values(this.districts).forEach((d) => this._redrawDistrict(d, COLOR.NEUTRAL));
    const store = window.useGameStore?.getState();
    const team = store?.myTeam || "red";
    this.claimDistrict(startId, team);
    this.showLog(`🚀 地区 ${startId} より攻略を開始します`);
  }

  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;
    if (this.player) this.player.destroy();
    if (this.playerLabel) this.playerLabel.destroy();
    this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT).setDepth(10).setStrokeStyle(3, 0x000000);
    this.playerLabel = this.add.text(start.center.x, start.center.y - 25, "YOU", { fontSize: "14px", color: "#fff", stroke: "#000", strokeThickness: 4, fontWeight: "bold" }).setOrigin(0.5).setDepth(10);
    this.cameras.main.pan(start.center.x, start.center.y, 600, "Power2");
  }

  claimDistrict(id, team) {
    const d = this.districts[id];
    if (!d) return;
    d.owner = team;
    const color = (team === "red") ? COLOR.TEAM_RED : (team === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL);
    this.tweens.add({
      targets: d.graphics,
      alpha: 0.1,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => { this._redrawDistrict(d, color); }
    });
    const store = window.useGameStore?.getState();
    if (store) {
      store.setStatus({ districts: { ...store.districts, [id]: store.myId || "me" } });
    }
  }

  _setupTilemap() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("Slates.png", "tiles");
    this.tileLayer = map.createLayer("タイルレイヤー1", tileset, 0, 0);
    if (this.tileLayer) this.tileLayer.setScale(MAP_SCALE);
    this.tiledMap = map;
  }

  _loadDistrictsFromTMJ() {
    const objectLayer = this.tiledMap.getObjectLayer("districtName");
    if (!objectLayer) return;
    objectLayer.objects.forEach((obj) => {
      const prop = obj.properties?.[0];
      let id = prop ? parseInt(prop.name, 10) || parseInt(prop.value, 10) : obj.id;
      const poly = (obj.polygon || []).map((p) => ({ x: (obj.x + p.x) * MAP_SCALE, y: (obj.y + p.y) * MAP_SCALE }));
      this.districts[id] = { id, name: obj.name, polygon: poly, center: this._calcCenter(poly), owner: "neutral", graphics: null, textLabel: null };
    });
  }

  _drawDistrictPolygons() {
    const overlay = this.add.rectangle(0, 0, 4000, 4000, 0, 0).setOrigin(0).setInteractive();
    overlay.setDepth(1).on("pointerdown", (p) => this._onMapClicked(p.x, p.y));
    Object.values(this.districts).forEach((d) => {
      d.graphics = this.add.graphics().setDepth(2);
      this._redrawDistrict(d, COLOR.NEUTRAL);
      d.textLabel = this.add.text(d.center.x, d.center.y, d.name, { fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5).setDepth(3);
    });
  }

  _getDistrictAtPoint(x, y) {
    for (const d of Object.values(this.districts)) {
      if (pointInPolygon({ x, y }, d.polygon)) return d.id;
    }
    return null;
  }

  _redrawDistrict(d, color, alpha = 0.5) {
    if (!d || !d.graphics) return;
    d.graphics.clear().fillStyle(color, alpha).beginPath();
    d.polygon.forEach((p, i) => i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y));
    d.graphics.closePath().fillPath().lineStyle(2, 0xffffff, 0.8).strokePath();
    d.graphics.setAlpha(alpha); 
  }

  _calcCenter(p) { return { x: p.reduce((s, v) => s + v.x, 0) / p.length, y: p.reduce((s, v) => s + v.y, 0) / p.length }; }

  updateStatusToReact() {
    const eventName = PHASER_TO_REACT?.STATS_UPDATED || "UPDATE_STATUS";
    window.dispatchEvent(new CustomEvent(eventName, { detail: this.playerStats }));
  }

  showLog(message) { window.dispatchEvent(new CustomEvent("NEW_LOG", { detail: message })); }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.tiledMap.widthInPixels * MAP_SCALE, this.tiledMap.heightInPixels * MAP_SCALE);
    cam.setBackgroundColor("#1a365d");
    this.input.on("pointerdown", () => { this._dragMoved = false; });
    this.input.on("pointermove", (pointer) => {
      if (!pointer.isDown) return;
      if (pointer.getDistance() > 3) this._dragMoved = true;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (!state) return;
      if (state.turn >= 1) this.isSelectionMode = false;
      if (state.districts) this._syncDistricts(state.districts);
      if (state.players) this._syncPlayers(state.players);
    });
  }

  _syncPlayers(players) {
    const mySocketId = socket.id;
    Object.entries(players).forEach(([playerId, data]) => {
      if (playerId === mySocketId) {
        if (data.districtId && data.districtId !== this.currentDistrictId) {
          this.currentDistrictId = data.districtId;
          this._placePlayer(data.districtId);
        }
        return;
      }
      const district = this.districts[data.districtId];
      if (!district) return;
      if (!this.otherPlayers[playerId]) {
        this.otherPlayers[playerId] = {
          dot: this.add.circle(district.center.x, district.center.y, 10, COLOR.ENEMY_DOT).setDepth(3),
          label: this.add.text(district.center.x, district.center.y - 18, data.username || "ENEMY", { fontSize: "10px", color: "#2ecc71", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5).setDepth(3),
        };
      } else {
        this.otherPlayers[playerId].dot.setPosition(district.center.x, district.center.y);
        this.otherPlayers[playerId].label.setPosition(district.center.x, district.center.y - 18);
      }
    });
  }

  _syncDistricts(serverDistricts) {
    const mySocketId = socket.id;
    Object.entries(serverDistricts).forEach(([districtId, ownerId]) => {
      const d = this.districts[Number(districtId)];
      if (!d) return;
      const serverOwnerTeam = (ownerId === mySocketId) ? "red" : (ownerId ? "blue" : "neutral");
      if (d.owner !== serverOwnerTeam) {
        d.owner = serverOwnerTeam;
        const color = (serverOwnerTeam === "red") ? COLOR.TEAM_RED : (serverOwnerTeam === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL);
        this._redrawDistrict(d, color);
      }
    });
  }
}