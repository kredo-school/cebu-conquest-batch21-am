import Phaser from "phaser";
import socket from "../../socket";
import { SERVER_EVENTS } from "../../../shared/socketEvents.js";
import { PHASER_TO_REACT, REACT_TO_PHASER, emitToReact } from "../events/PhaserBridge";
import { MAP_CONFIG } from "../config/mapConfig";

const MAP_SCALE = 0.5; 

const COLOR = {
  NEUTRAL: 0x95a5a6,
  HIGHLIGHT: 0xffff00,
  PLAYER_DOT: 0xf1c40f, // 自分：黄
  ENEMY_DOT: 0xffffff,  // 🚀 NPC：白（黒枠付きで視認性最大）
  TEAM_RED: 0xff4d4d,   // 赤（issei領土）
  TEAM_BLUE: 0x00ffff,  // 青（NPC領土）
};

const normalizeId = (id) => {
  if (!id) return null;
  const nameMap = { 
    "アドベンチャーゾーン": 11101, "マンゴー地区": 11102, "エナジー地区": 11103,
    "コータル・トレードゾーン": 11104, "アドベンチャー地区": 11105,
    "ショッピング・商業特区": 11112, "ダウンタウン・港湾地区": 11113,
    "マリン・ジャイアントゾーン": 11119, "ヘリテージ・グルメゾーン": 11120 
  };
  if (nameMap[id]) return nameMap[id];
  const n = Number(id);
  if (isNaN(n)) return id;
  return n < 1000 ? n + 11100 : n;
};

const ADJACENCY = {
  "11101": ["11102", "11104", "11105", "11120"],
  "11102": ["11101", "11104", "11106", "11108"],
  "11108": ["11102", "11104", "11109", "11112"],
  "11112": ["11108", "11109", "11116", "11113", "11119"],
  "11113": ["11109", "11112", "11117", "11118", "11119"],
  "11119": ["11112", "11113", "11115", "11118", "11120", "11121"],
  "11120": ["11116", "11119", "11101", "11121"],
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
    this.otherPlayers = {};
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this._dragMoved = false;
    this.isSelectionMode = true;
  }

  preload() {
    const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];
    if (config.tilesets?.length > 0) {
      config.tilesets.forEach((ts) => this.load.image(ts.key, ts.path));
    }
    this.load.tilemapTiledJSON(config.key, config.path);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x2471a3);
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this._initSocket();
    this._setupReactListeners();
  }

  // 🚀 指摘のあったバグ修正（リスナーの統合）
  _setupReactListeners() {
    // 1. 出撃の確定
    window.addEventListener(REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, (e) => {
      this.isSelectionMode = false;
      this.currentDistrictId = normalizeId(e.detail.districtId);
      this._placePlayer(this.currentDistrictId);
    });

    // 2. 休息ログの表示（指摘のあった修正）
    window.addEventListener("ACTION_STAY", () => {
      this.showLog("🧘 休息中...");
    });

    // 3. マップの再描画命令
    window.addEventListener("MAP_REPAINT", (e) => {
      if (e.detail.districts && e.detail.players) {
        this._syncDistricts(e.detail.districts, e.detail.players);
      }
    });
  }

  _onMapClicked(x, y) {
    if (this._dragMoved) return;
    const worldPoint = this.cameras.main.getWorldPoint(x, y);
    const id = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
    if (!id) return;

    const store = window.useGameStore?.getState();
    if (!store) return;

    if (this.isSelectionMode) {
      Object.values(this.districts).forEach((d) => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[id], COLOR.HIGHLIGHT, 0.8);
      store.setStatus({ selectedDistrictId: id, currentDistrictName: this.districts[id].name });
    } else {
      if (!store.isMyTurn) return;
      const myPos = String(this.currentDistrictId);
      const targetId = String(id);
      const neighbors = ADJACENCY[myPos] || [];

      if (targetId === myPos) return;

      if (!neighbors.includes(targetId)) {
        this.showLog("⚠️ 隣接していない地区には行動できません。");
        return;
      }

      const myTeamStr = (store.myTeam || "").toLowerCase();
      const targetOwnerStr = (this.districts[id].owner || "neutral").toLowerCase();
      const isMyTerritory = targetOwnerStr !== "neutral" && 
        (targetOwnerStr.includes(myTeamStr) || targetOwnerStr.includes("issei") || targetOwnerStr.includes("red"));

      if (isMyTerritory) {
        this.showLog(`🚚 移動: ${this.districts[id].name}`);
        socket.emit("ACTION_SUBMIT", { type: 'move', targetId: targetId });
        this._placePlayer(targetId);
      } else {
        this.showLog(`🎯 攻撃: ${this.districts[id].name}`);
        store.openPrediction(targetId, this.districts[id].name);
      }
    }
  }

  _syncPlayers(players) {
    Object.values(this.otherPlayers).forEach(p => { if (p.dot) p.dot.destroy(); });
    this.otherPlayers = {};

    Object.entries(players).forEach(([playerId, data]) => {
      const rawId = data.districtId || data.currentDistrict || data.pos;
      const dId = normalizeId(rawId);

      if (playerId === socket.id) {
        this.currentDistrictId = dId;
        this._placePlayer(dId);
        this.isSelectionMode = false;
        return;
      }

      const d = this.districts[dId];
      if (d && d.center) {
        this.otherPlayers[playerId] = { 
          dot: this.add.circle(d.center.x, d.center.y, 16, COLOR.ENEMY_DOT)
            .setDepth(900).setStrokeStyle(5, 0x000000) 
        };
      }
    });
  }

  _setupCamera() {
    const cam = this.cameras.main;
    this.input.on("pointermove", (p) => {
      if (p.isDown) {
        if (p.getDistance() > 3) this._dragMoved = true;
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
        this._clampCamera();
      } else {
        const worldPoint = cam.getWorldPoint(p.x, p.y);
        const hoveredId = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
        this._updateHoverText(hoveredId);
      }
    });
    this.input.on("wheel", (ptr, gameObj, dx, dy) => {
      const oldZoom = cam.zoom;
      const newZoom = Phaser.Math.Clamp(oldZoom - dy * 0.001, 0.5, 5);
      if (oldZoom === newZoom) return;
      const cx = cam.width / 2; const cy = cam.height / 2;
      const worldCX = cam.scrollX + cx / oldZoom; const worldCY = cam.scrollY + cy / oldZoom;
      cam.setZoom(newZoom);
      cam.scrollX = worldCX - cx / newZoom; cam.scrollY = worldCY - cy / newZoom;
      this._clampCamera();
      this._updateLabelVisibility();
    });
    cam.setZoom(1); this._clampCamera(); this._updateLabelVisibility();
  }

  _clampCamera() {
    const cam = this.cameras.main;
    const mapW = this.tiledMap.widthInPixels * MAP_SCALE;
    const mapH = this.tiledMap.heightInPixels * MAP_SCALE;
    const viewW = cam.width / cam.zoom; const viewH = cam.height / cam.zoom;
    cam.scrollX = mapW > viewW ? Phaser.Math.Clamp(cam.scrollX, 0, mapW - viewW) : (mapW - viewW) / 2;
    cam.scrollY = mapH > viewH ? Phaser.Math.Clamp(cam.scrollY, 0, mapH - viewH) : (mapH - viewH) / 2;
  }

  _loadDistrictsFromTMJ() {
    const targetLayers = ["islandName", "areaName", "districtName", "spotName"];
    targetLayers.forEach((layerName) => {
      const objectLayer = this.tiledMap.getObjectLayer(layerName);
      if (!objectLayer) return;
      objectLayer.objects.forEach((obj) => {
        let districtId = normalizeId(parseInt(obj.name, 10) || obj.id);
        const poly = (obj.polygon || []).map((p) => ({ x: (obj.x + p.x) * MAP_SCALE, y: (obj.y + p.y) * MAP_SCALE }));
        if (poly.length === 0) return;
        this.districts[districtId] = {
          id: districtId, name: obj.name, type: layerName, polygon: poly,
          center: { x: poly.reduce((s, v) => s + v.x, 0) / poly.length, y: poly.reduce((s, v) => s + v.y, 0) / poly.length },
          owner: "neutral", graphics: this.add.graphics().setDepth(2)
        };
        this._redrawDistrict(this.districts[districtId], COLOR.NEUTRAL, 0);
      });
    });
  }

  _setupTilemap() {
    const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];
    const map = this.make.tilemap({ key: config.key });
    const tilesetList = config.tilesets ?? [{ name: config.tilesetName, key: config.tilesetKey }];
    const allTilesets = tilesetList.map((ts) => map.addTilesetImage(ts.name, ts.key));
    map.layers.forEach((layer) => {
      const l = map.createLayer(layer.name, allTilesets, 0, 0);
      if (l) l.setScale(MAP_SCALE);
    });
    this.tiledMap = map;
  }

  _drawDistrictPolygons() {
    const w = this.tiledMap.widthInPixels * MAP_SCALE; const h = this.tiledMap.heightInPixels * MAP_SCALE;
    const overlay = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setInteractive().setDepth(1);
    overlay.on("pointerup", (p) => this._onMapClicked(p.x, p.y));
    const sizeByType = { islandName: "36px", areaName: "18px", districtName: "12px", spotName: "10px" };
    Object.values(this.districts).forEach((d) => {
      d.textLabel = this.add.text(d.center.x, d.center.y, d.name, {
        fontSize: sizeByType[d.type] ?? "16px", color: "#ffffff", stroke: "#000", strokeThickness: 4, fontStyle: "bold"
      }).setOrigin(0.5).setDepth(3).setVisible(false);
    });
  }

  _syncDistricts(serverDistricts, serverPlayers) {
    Object.entries(serverDistricts).forEach(([dId, ownerId]) => {
      const d = this.districts[normalizeId(dId)];
      if (!d || !serverPlayers[ownerId]) return;
      const team = serverPlayers[ownerId].team.toLowerCase();
      d.owner = team;
      const col = (team.includes('red') || team.includes('issei')) ? COLOR.TEAM_RED : COLOR.TEAM_BLUE;
      this._redrawDistrict(d, col, 0.7);
    });
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (s) => s && (this._syncDistricts(s.districts, s.players), this._syncPlayers(s.players)));
  }

  _redrawDistrict(d, color, alpha = 0.8) {
    if (!d || !d.graphics) return;
    d.graphics.clear();
    if (alpha > 0) d.graphics.fillStyle(color, alpha);
    d.graphics.beginPath();
    d.polygon.forEach((p, i) => i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y));
    d.graphics.closePath();
    if (alpha > 0) d.graphics.fillPath();
    d.graphics.lineStyle(2, 0xffffff, 0.4).strokePath();
  }

  _placePlayer(id) {
    const d = this.districts[normalizeId(id)];
    if (!d) return;
    if (this.player) this.player.destroy();
    this.player = this.add.circle(d.center.x, d.center.y, 20, COLOR.PLAYER_DOT).setDepth(1000).setStrokeStyle(5, 0x000000);
    this.cameras.main.pan(d.center.x, d.center.y, 600, "Power2");
  }

  _getDistrictAtPoint(x, y) {
    let hitId = null; let highP = 0;
    const priority = { spotName: 4, districtName: 3, areaName: 2, islandName: 1 };
    for (const d of Object.values(this.districts)) {
      if (pointInPolygon({ x, y }, d.polygon)) {
        const p = priority[d.type] || 0;
        if (p > highP) { hitId = d.id; highP = p; }
      }
    }
    return hitId;
  }
  _getLodType(zoom) {
    if (zoom < 1.5) return "islandName";
    if (zoom < 2.5) return "areaName";
    if (zoom < 3.5) return "districtName";
    return "spotName";
  }
  _updateLabelVisibility() {
    const lod = this._getLodType(this.cameras.main.zoom);
    Object.values(this.districts).forEach(d => { if(d.textLabel) d.textLabel.setVisible(d.type === lod); });
  }
  _updateHoverText(hid) {
    const lod = this._getLodType(this.cameras.main.zoom);
    Object.values(this.districts).forEach(d => { if(d.textLabel) d.textLabel.setVisible(d.type === lod || d.id === hid); });
  }
  showLog(m) { emitToReact("NEW_LOG", m); }
}