import Phaser from "phaser";
import socket from "../../socket";
import { SERVER_EVENTS } from "../../../shared/socketEvents.js";
import { PHASER_TO_REACT, REACT_TO_PHASER, emitToReact } from "../events/PhaserBridge";
import { MAP_CONFIG } from "../config/mapConfig";

const MAP_SCALE = 0.12;

const COLOR = {
  NEUTRAL: 0x95a5a6,
  HIGHLIGHT: 0xffff00,
  PLAYER_DOT: 0xf1c40f,
  ENEMY_DOT: 0x2ecc71,
  TEAM_RED: 0xff4d4d,
  TEAM_BLUE: 0x00ffff,
};

// TODO: 移行完了後に削除 — Tiledの隣接データで置き換える
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
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this._dragMoved = false;
    this.otherPlayers = {};
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
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this._initSocket();
    this._setupReactListeners();
    this.updateStatusToReact();
  }

  shutdown() {
    this._reactListeners?.forEach(({ event, handler }) =>
      window.removeEventListener(event, handler),
    );
  }

  _setupReactListeners() {
    const handlers = [
      { event: "ACTION_STAY", handler: () => this.showLog("🧘 休息中...") },
      {
        event: "MAP_REPAINT",
        handler: (e) => {
          if (e.detail.districts && e.detail.players) {
            this._syncDistricts(e.detail.districts, e.detail.players);
          }
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM,
        handler: (e) => this.confirmDeployment(Number(e.detail.districtId)),
      },
    ];
    handlers.forEach(({ event, handler }) => window.addEventListener(event, handler));
    this._reactListeners = handlers;
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
      const myPos = Number(this.currentDistrictId);
      const targetId = Number(id);
      const neighbors = ADJACENCY[myPos] || [];

      // 新システム移行完了前は、ID < 100（Tiled由来）の場合は隣接制限をスキップ
      if (neighbors.includes(targetId) || (myPos < 100 && targetId < 100)) {
        this.showLog(`🎯 ターゲット確認：${this.districts[targetId].name}`);

        if (typeof store.openPrediction === "function") {
          store.openPrediction(targetId, this.districts[targetId].name);
        }

        Object.values(this.districts).forEach((d) => {
          const baseCol =
            d.owner === "red"
              ? COLOR.TEAM_RED
              : d.owner === "blue"
                ? COLOR.TEAM_BLUE
                : COLOR.NEUTRAL;
          this._redrawDistrict(d, baseCol);
        });
        this._redrawDistrict(this.districts[targetId], COLOR.HIGHLIGHT, 0.8);
      } else {
        this.showLog("⚠️ 隣接する地区しか攻撃できません！");
      }
    }
  }

  confirmDeployment(startId) {
    this.isSelectionMode = false;
    this.currentDistrictId = Number(startId);
    this._placePlayer(this.currentDistrictId);
    const store = window.useGameStore?.getState();
    const team = store?.myTeam || "red";
    const d = this.districts[this.currentDistrictId];
    if (d) {
      d.owner = team;
      this._redrawDistrict(d, team === "red" ? COLOR.TEAM_RED : COLOR.TEAM_BLUE);
    }
  }

  _loadDistrictsFromTMJ() {
    const targetLayers = ["islandName", "areaName", "districtName", "spotName"];

    targetLayers.forEach((layerName) => {
      const objectLayer = this.tiledMap.getObjectLayer(layerName);

      if (!objectLayer) {
        console.warn(`⚠️ オブジェクトレイヤーが見つかりません: ${layerName}`);
        return;
      }

      objectLayer.objects.forEach((obj) => {
        let districtId = obj.id;

        if (obj.properties) {
          if (Array.isArray(obj.properties)) {
            const idProp = obj.properties.find((p) => !isNaN(parseInt(p.name, 10)));
            if (idProp) districtId = parseInt(idProp.name, 10);
          } else {
            districtId = obj.properties.id || obj.properties.districtId || districtId;
          }
        }

        const poly = (obj.polygon || []).map((p) => ({
          x: (obj.x + p.x) * MAP_SCALE,
          y: (obj.y + p.y) * MAP_SCALE,
        }));

        if (poly.length === 0) return;

        this.districts[districtId] = {
          id: districtId,
          name: obj.name,
          type: layerName,
          polygon: poly,
          center: this._calcCenter(poly),
          owner: "neutral",
          graphics: this.add.graphics().setDepth(2),
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

    this.tileLayers = [];
    map.layers.forEach((layerData) => {
      const layer = map.createLayer(layerData.name, allTilesets, 0, 0);
      if (layer) {
        layer.setScale(MAP_SCALE);
        this.tileLayers.push(layer);
      }
    });

    this.tiledMap = map;
  }

  _drawDistrictPolygons() {
    const w = this.tiledMap.widthInPixels * MAP_SCALE;
    const h = this.tiledMap.heightInPixels * MAP_SCALE;
    const overlay = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setInteractive();
    overlay.setDepth(1).on("pointerup", (p) => this._onMapClicked(p.x, p.y));

    const sizeByType = { islandName: "36px", areaName: "16px", districtName: "8px", spotName: "8px" };

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

  _getLodType(zoom) {
    if (zoom < 1.5) return "islandName";
    if (zoom < 2.5) return "areaName";
    if (zoom < 3.5) return "districtName";
    return "spotName";
  }

  _updateLabelVisibility() {
    const lodType = this._getLodType(this.cameras.main.zoom);
    Object.values(this.districts).forEach((d) => {
      if (d.textLabel) d.textLabel.setVisible(d.type === lodType);
    });
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

    if (alpha > 0) {
      d.graphics.fillStyle(color, alpha);
    }

    d.graphics.beginPath();
    d.polygon.forEach((p, i) =>
      i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y),
    );
    d.graphics.closePath();

    if (alpha > 0) d.graphics.fillPath();

    d.graphics.lineStyle(2, 0xffffff, 0.4).strokePath();
  }

  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;
    if (this.player) this.player.destroy();
    this.player = this.add
      .circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT)
      .setDepth(10)
      .setStrokeStyle(3, 0x000000);
    this.cameras.main.pan(start.center.x, start.center.y, 600, "Power2");
  }

  _syncDistricts(serverDistricts, serverPlayers) {
    Object.entries(serverDistricts).forEach(([districtId, ownerId]) => {
      const d = this.districts[Number(districtId)];
      if (!d) return;
      const actualTeam = serverPlayers[ownerId] ? serverPlayers[ownerId].team : "neutral";
      if (d.owner !== actualTeam) {
        d.owner = actualTeam;
        this._redrawDistrict(
          d,
          actualTeam === "red"
            ? COLOR.TEAM_RED
            : actualTeam === "blue"
              ? COLOR.TEAM_BLUE
              : COLOR.NEUTRAL,
        );
      }
    });
  }

  _syncPlayers(players) {
    Object.entries(players).forEach(([playerId, data]) => {
      if (playerId === socket.id) return;
      const district = this.districts[Number(data.districtId)];
      if (!district) return;
      if (!this.otherPlayers[playerId]) {
        this.otherPlayers[playerId] = {
          dot: this.add
            .circle(district.center.x, district.center.y, 10, COLOR.ENEMY_DOT)
            .setDepth(3),
        };
      } else {
        this.otherPlayers[playerId].dot.setPosition(district.center.x, district.center.y);
      }
    });
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (!state) return;
      const myData = state.players[socket.id];
      if (myData && myData.isReady) {
        this.isSelectionMode = false;
        this.currentDistrictId = Number(myData.districtId);
      }
      if (state.districts && state.players) {
        this._syncDistricts(state.districts, state.players);
        this._syncPlayers(state.players);
      }
    });
  }

  _calcCenter(p) {
    return {
      x: p.reduce((s, v) => s + v.x, 0) / p.length,
      y: p.reduce((s, v) => s + v.y, 0) / p.length,
    };
  }

  showLog(message) {
    emitToReact("NEW_LOG", message);
  }

  updateStatusToReact() {
    emitToReact(PHASER_TO_REACT.STATS_UPDATED, this.playerStats);
  }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(
      0,
      0,
      this.tiledMap.widthInPixels * MAP_SCALE,
      this.tiledMap.heightInPixels * MAP_SCALE,
    );

    this.input.on("pointerdown", () => {
      this._dragMoved = false;
    });

    this.input.on("pointermove", (p) => {
      if (p.isDown) {
        if (p.getDistance() > 3) this._dragMoved = true;
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      } else {
        const worldPoint = cam.getWorldPoint(p.x, p.y);
        const hoveredId = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
        this._updateHoverText(hoveredId);
      }
    });

    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const newZoom = cam.zoom - deltaY * 0.0009;
      cam.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 8));
      this._updateLabelVisibility();
    });

    cam.setZoom(1);
    this._updateLabelVisibility();
  }

  _updateHoverText(hoveredId) {
    const lodType = this._getLodType(this.cameras.main.zoom);

    Object.values(this.districts).forEach((d) => {
      if (!d.textLabel) return;
      const isHovered = d.id === hoveredId;
      d.textLabel.setVisible(d.type === lodType || isHovered);
      d.textLabel.setScale(isHovered ? 1.2 : 1.0);
    });
  }
}
