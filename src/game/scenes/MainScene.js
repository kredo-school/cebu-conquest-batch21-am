import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../../../shared/socketEvents.js";
import { PHASER_TO_REACT, REACT_TO_PHASER, emitToReact } from "../events/PhaserBridge";
import { MAP_CONFIG } from "../config/mapConfig";
import ZoomManager from "./ZoomManager";

const MAP_SCALE = 0.5;

const COLOR = {
  NEUTRAL: 0x95a5a6,
  HIGHLIGHT: 0xffff00,
  PLAYER_DOT: 0xf1c40f, // 自分：黄
  ENEMY_DOT: 0xffffff, // 🚀 NPC：白（黒枠付きで視認性最大）
  TEAM_RED: 0xff4d4d, // 赤（issei領土）
  TEAM_BLUE: 0x00ffff, // 青（NPC領土）
};

const normalizeId = (id) => {
  if (id === null || id === undefined || id === "") return null;
  const n = Number(id);
  return isNaN(n) ? null : n;
};

const ADJACENCY = {
  11101: ["11102", "11104", "11105", "11120"],
  11102: ["11101", "11104", "11106", "11108"],
  11108: ["11102", "11104", "11109", "11112"],
  11112: ["11108", "11109", "11116", "11113", "11119"],
  11113: ["11109", "11112", "11117", "11118", "11119"],
  11119: ["11112", "11113", "11115", "11118", "11120", "11121"],
  11120: ["11116", "11119", "11101", "11121"],
};

function pointInPolygon(point, polygon) {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
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
    this.playerStats = { hp: 100, stamina: 100, faith: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this._dragMoved = false;
    this.isSelectionMode = true;
    this._reactListeners = [];
    this._myTeam = null;
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
    this.zoomManager = new ZoomManager();
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this._initSocket();
    this._setupReactListeners();
    this.updateStatusToReact();
  }

  update() {
    this.zoomManager.tick(this.cameras.main.zoom, this.districts);
  }

  // 🚀 リスナー統合版（重複を削除してクリーンアップ）
  _setupReactListeners() {
    const handlers = [
      {
        event: REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM,
        handler: (e) => {
          this.isSelectionMode = false;
          this.currentDistrictId = normalizeId(e.detail.districtId);
          this._placePlayer(this.currentDistrictId);
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_STAY,
        handler: () => {
          this.showLog("🧘 休息中...");
          socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: "stay" });
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_ATTACK,
        handler: (e) => {
          const targetId = e.detail?.targetId;
          if (!targetId) return;
          socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: "attack", targetId: String(targetId) });
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_ESCAPE,
        handler: () => {
          socket.emit(CLIENT_EVENTS.ACTION_ESCAPE);
          this.showLog("🏃 逃走中...");
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_DEFEND,
        handler: () => {
          socket.emit(CLIENT_EVENTS.ACTION_DEFEND);
          this.showLog("🛡️ 防御中...");
        },
      },
      {
        event: "MAP_REPAINT",
        handler: (e) => {
          if (e.detail.districts && e.detail.players) {
            this._syncDistricts(e.detail.districts, e.detail.players);
          }
        },
      },
    ];

    handlers.forEach(({ event, handler }) => window.addEventListener(event, handler));
    this._reactListeners = handlers;
  }

  shutdown() {
    this._reactListeners?.forEach(({ event, handler }) =>
      window.removeEventListener(event, handler),
    );
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (s) => {
      if (!s) return;
      this._syncDistricts(s.districts, s.players);
      this._syncPlayers(s.players);
    });
    socket.on(SERVER_EVENTS.GAME_START, (s) => {
      if (!s) return;
      if (s.districts && s.players) {
        this._syncDistricts(s.districts, s.players);
        this._syncPlayers(s.players);
      }
    });
    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      emitToReact(PHASER_TO_REACT.TURN_START, data ?? {});
      const msg =
        data?.turnOwnerId === socket.id
          ? "🎯 あなたのターンです！"
          : `⏳ ${data?.turnOwnerName || "相手"}のターンです`;
      this.showLog(msg);
    });
    socket.on(SERVER_EVENTS.ACTION_RESULT, (data) => {
      if (!data) return;
      if (data.stats) {
        Object.assign(this.playerStats, data.stats);
        this.updateStatusToReact();
      }
      if (data.message) this.showLog(data.message);
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

  _loadDistrictsFromTMJ() {
  const targetLayers = ["islandName", "areaName", "districtName", "spotName"];
  targetLayers.forEach((layerName) => {
    const objectLayer = this.tiledMap.getObjectLayer(layerName);
    if (!objectLayer) return;
    objectLayer.objects.forEach((obj) => {

      // ✅ properties[0].name が "11101" などの文字列ID
      const rawId = obj.properties?.[0]?.name ?? obj.id;
      const districtId = normalizeId(rawId);
      if (!districtId) return;

      const poly = (obj.polygon || []).map((p) => ({
        x: (obj.x + p.x) * MAP_SCALE,
        y: (obj.y + p.y) * MAP_SCALE,
      }));
      if (poly.length === 0) return;

      this.districts[districtId] = {
        id: districtId,
        name: obj.name,       // 表示名（日本語）はobj.nameのまま
        type: layerName,
        polygon: poly,
        center: {
          x: poly.reduce((s, v) => s + v.x, 0) / poly.length,
          y: poly.reduce((s, v) => s + v.y, 0) / poly.length,
        },
        owner: "neutral",
        graphics: this.add.graphics().setDepth(2),
      };
      this._redrawDistrict(this.districts[districtId], COLOR.NEUTRAL, 0);
    });
  });
}

  _drawDistrictPolygons() {
    const w = this.tiledMap.widthInPixels * MAP_SCALE;
    const h = this.tiledMap.heightInPixels * MAP_SCALE;
    const overlay = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setInteractive().setDepth(1);
    overlay.on("pointerup", (p) => this._onMapClicked(p.x, p.y));

    const sizeByType = {
      islandName: "36px",
      areaName: "18px",
      districtName: "12px",
      spotName: "10px",
    };
    Object.values(this.districts).forEach((d) => {
      d.textLabel = this.add
        .text(d.center.x, d.center.y, d.name, {
          fontSize: sizeByType[d.type] ?? "16px",
          color: "#ffffff",
          stroke: "#000",
          strokeThickness: 4,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
    });
  }

  _setupCamera() {
    const cam = this.cameras.main;
    this.input.on("pointerdown", () => {
      this._dragMoved = false;
    });
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
    this.input.on("wheel", (pointer, _objs, _dx, deltaY, _dz, event) => {
      const isPinch = event?.ctrlKey === true;
      const zoomSpeed = isPinch ? 0.1 : 0.001;
      const oldZoom = cam.zoom;
      const newZoom = Phaser.Math.Clamp(oldZoom - deltaY * zoomSpeed, 0.5, 8);
      if (oldZoom === newZoom) return;
      const worldX = cam.scrollX + pointer.x / oldZoom;
      const worldY = cam.scrollY + pointer.y / oldZoom;
      cam.setZoom(newZoom);
      cam.scrollX = worldX - pointer.x / newZoom;
      cam.scrollY = worldY - pointer.y / newZoom;
      this._clampCamera();
      this._updateLabelVisibility();
      if (isPinch && event?.preventDefault) event.preventDefault();
    });
    cam.setZoom(1);
    this._clampCamera();
  }

  _clampCamera() {
    const cam = this.cameras.main;
    const mapW = this.tiledMap.widthInPixels * MAP_SCALE;
    const mapH = this.tiledMap.heightInPixels * MAP_SCALE;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    cam.scrollX =
      mapW > viewW ? Phaser.Math.Clamp(cam.scrollX, 0, mapW - viewW) : (mapW - viewW) / 2;
    cam.scrollY =
      mapH > viewH ? Phaser.Math.Clamp(cam.scrollY, 0, mapH - viewH) : (mapH - viewH) / 2;
  }

  _onMapClicked(x, y) {
    if (this._dragMoved) return;
    const worldPoint = this.cameras.main.getWorldPoint(x, y);
    const id = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
    if (!id) return;

    if (this.isSelectionMode) {
      // 選択モード：スポーン地点を選ぶフェーズ
      Object.values(this.districts).forEach((d) => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[id], COLOR.HIGHLIGHT, 0.8);

      // Reactに地区選択を通知（Zustandはいっせい側で更新する）
      emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
        districtId: id,
        districtName: this.districts[id]?.name ?? String(id),
      });
    } else {
      // プレイ中：攻撃・移動の選択フェーズ
      const myPos = String(this.currentDistrictId);
      const targetId = String(id);
      if (targetId === myPos) return;

      if (!(ADJACENCY[myPos] || []).includes(targetId)) {
        this.showLog("⚠️ 隣接していない地区には行動できません。");
        return;
      }

      // オーナー判定：サーバーが返す "red" | "blue" だけで比較
      const targetOwner = (this.districts[id]?.owner ?? "neutral").toLowerCase();
      const isMyTerritory = targetOwner === this._myTeam;
      const isNeutral = targetOwner === "neutral";

      // Reactに選択結果を通知（ターン判定・モーダル表示はいっせいに任せる）
      emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
        districtId: id,
        districtName: this.districts[id]?.name ?? String(id),
        isMyTerritory,
        isNeutral,
      });

      // ログだけPhaser側で出す
      if (isMyTerritory) {
        this.showLog(`🚚 移動先: ${this.districts[id]?.name}`);
      } else {
        this.showLog(`🎯 攻撃対象: ${this.districts[id]?.name}`);
      }
    }
  }

  _getDistrictAtPoint(x, y) {
    let hitId = null;
    let highestPriority = 0;
    const priority = { spotName: 4, districtName: 3, areaName: 2, islandName: 1 };
    for (const d of Object.values(this.districts)) {
      if (pointInPolygon({ x, y }, d.polygon)) {
        const p = priority[d.type] || 0;
        if (p > highestPriority) {
          hitId = d.id;
          highestPriority = p;
        }
      }
    }
    return hitId;
  }

  _redrawDistrict(d, color, alpha = 0) {
    if (!d || !d.graphics) return;
    d.graphics.clear();
    if (alpha > 0) d.graphics.fillStyle(color, alpha);
    d.graphics.beginPath();
    d.polygon.forEach((p, i) =>
      i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y),
    );
    d.graphics.closePath();
    if (alpha > 0) d.graphics.fillPath();
    d.graphics.lineStyle(2, 0xffffff, 0.4).strokePath();
  }

  _placePlayer(id) {
    const d = this.districts[normalizeId(id)];
    if (!d) return;
    if (this.player) this.player.destroy();
    this.player = this.add
      .circle(d.center.x, d.center.y, 20, COLOR.PLAYER_DOT)
      .setDepth(1000)
      .setStrokeStyle(5, 0x000000);
    this.cameras.main.pan(d.center.x, d.center.y, 600, "Power2");
  }

  _syncDistricts(serverDistricts, serverPlayers) {
    Object.entries(serverDistricts).forEach(([dId, ownerId]) => {
      const d = this.districts[normalizeId(dId)];
      if (!d || !serverPlayers[ownerId]) return;
      const team = serverPlayers[ownerId].team?.toLowerCase();
      d.owner = team ?? "neutral";
      const col =
        team === "red" ? COLOR.TEAM_RED : team === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL;
      this._redrawDistrict(d, col, 0.7);
    });
  }

  _syncPlayers(players) {
    Object.values(this.otherPlayers).forEach((p) => {
      if (p.dot) p.dot.destroy();
    });
    this.otherPlayers = {};

    Object.entries(players).forEach(([playerId, data]) => {
      const rawId = data.districtId || data.currentDistrict || data.pos;
      const dId = normalizeId(rawId);

      if (playerId === socket.id) {
        this._myTeam = data.team?.toLowerCase() ?? null; // ← 追加：チームを記憶
        this.currentDistrictId = dId;
        this._placePlayer(dId);
        this.isSelectionMode = false;
        return;
      }

      const d = this.districts[dId];
      if (d && d.center) {
        this.otherPlayers[playerId] = {
          dot: this.add
            .circle(d.center.x, d.center.y, 16, COLOR.ENEMY_DOT)
            .setDepth(900)
            .setStrokeStyle(5, 0x000000),
        };
      }
    });
  }

  _getLodType(zoom) {
    if (zoom < 1.5) return "islandName";
    if (zoom < 2.5) return "areaName";
    if (zoom < 3.5) return "districtName";
    return "spotName";
  }

  _updateLabelVisibility() {
    const lod = this._getLodType(this.cameras.main.zoom);
    Object.values(this.districts).forEach((d) => {
      if (d.textLabel) d.textLabel.setVisible(d.type === lod);
    });
  }

  _updateHoverText(hoveredId) {
    const lod = this._getLodType(this.cameras.main.zoom);
    Object.values(this.districts).forEach((d) => {
      if (d.textLabel) d.textLabel.setVisible(d.type === lod || d.id === hoveredId);
    });
    if (this.zoomManager) this.zoomManager.setHover(hoveredId, this.districts);
  }

  showLog(message) {
    if (!message) return;
    emitToReact(PHASER_TO_REACT.GAME_LOG, message);
  }

  updateStatusToReact() {
    emitToReact(PHASER_TO_REACT.STATS_UPDATED, this.playerStats);
  }
}
