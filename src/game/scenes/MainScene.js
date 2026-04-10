// src/game/scenes/MainScene.js

import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../socketEvents";
import { PHASER_TO_REACT, REACT_TO_PHASER } from "../events/PhaserBridge";

const MAP_SCALE = 0.5;
const TILE_SIZE = 32;

const COLOR = {
  MY_TERRITORY: 0xe74c3c,    // 自分の領地（赤）
  ENEMY_TERRITORY: 0x27ae60, // 敵の領地（緑）
  NEUTRAL: 0x4a90d9,         // 中立（青）
  HIGHLIGHT: 0xffff00,       // 選択中（黄）
  PLAYER_DOT: 0xf1c40f,      // 自分の現在地(黄)
  ENEMY_DOT: 0x2ecc71,       // 敵の現在地（緑）
  TEAM_RED: 0xe74c3c,
  TEAM_BLUE: 0x3498db
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
    this.START_DISTRICT_ID = 102;
    this._dragMoved = false;
    this.otherPlayers = {};
    this.isSelectionMode = true; 
  }

  preload() {
    this.load.image("tiles", "assets/tilesets/Slates.png");
    this.load.tilemapTiledJSON("map", "assets/maps/cebu_map_簡易版.tmj");
  }

  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this.enemySprites = {};
    this._initSocket();
    this._setupReactListeners();
    this._createParticleTexture();
    this.updateStatusToReact();
    this.showLog("📍 地図をタップして開始地点を選択せよ");
  }

  update() {
    const zoom = this.cameras.main.zoom;
    Object.values(this.districts).forEach((d) => {
      if (d.textLabel) d.textLabel.setVisible(zoom > 0.8);
    });
  }

  // --- React連携 ---
  _setupReactListeners() {
    const handlers = [
      { event: REACT_TO_PHASER.COMMAND_STAY, handler: () => this.handleStay() },
      { event: REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM, handler: (e) => this.confirmDeployment(e.detail.districtId) },
    ];

    handlers.forEach(({ event, handler }) => {
      window.addEventListener(event, handler);
    });
    this._reactListeners = handlers;
  }

  handleStay() {
    this.showLog("🧘 休息中...");
    this.playerStats.stamina = Math.min(100, this.playerStats.stamina + 20);
    this.updateStatusToReact();
  }

  /**
   * 🗺️ 地図クリック時の処理
   */
  _onMapClicked(x, y) {
    if (this._dragMoved) return;
    const worldPoint = this.cameras.main.getWorldPoint(x, y);
    const id = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
    if (!id) return;

    if (this.isSelectionMode) {
      // 1. ハイライト描画
      Object.values(this.districts).forEach(d => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[id], COLOR.HIGHLIGHT, 0.8);

      // 🔴 修正ポイント：あきらさんの定数（SELECT_DISTRICT）を使ってReactに通知
      const eventName = PHASER_TO_REACT.SELECT_DISTRICT || 'DISTRICT_SELECTED';
      window.dispatchEvent(new CustomEvent(eventName, { detail: id }));

      // 🔴 重要：Store（Zustand）を直接更新
      // これにより、HUDの「地点未選択」が解消され、App.tsxの「DEPLOY START」ボタンが出現します
      if (window.useGameStore) {
        window.useGameStore.getState().setStatus({ 
          selectedDistrictId: id,
          currentDistrictName: this.districts[id].name 
        });
      }
    }
  }

  confirmDeployment(startId) {
    this.isSelectionMode = false;
    this.currentDistrictId = startId;
    this._placePlayer(startId);
    
    Object.values(this.districts).forEach(d => this._redrawDistrict(d, COLOR.NEUTRAL));
    const store = window.useGameStore?.getState();
    this.claimDistrict(startId, store?.myTeam || 'red');
    
    const districtName = this.districts[startId]?.name || `Sector ${startId}`;
    window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { 
      detail: { currentDistrictName: districtName } 
    }));
    this.showLog(`🚀 地区 ${startId} より攻略を開始します`);
  }

  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;
    if (this.player) this.player.destroy();
    if (this.playerLabel) this.playerLabel.destroy();
    
    this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT)
      .setDepth(10).setStrokeStyle(3, 0x000000);
      
    this.playerLabel = this.add.text(start.center.x, start.center.y - 25, "YOU", {
      fontSize: "14px", color: "#fff", stroke: "#000", strokeThickness: 4, fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(10);
    
    this.cameras.main.pan(start.center.x, start.center.y, 600, 'Power2');
  }

  claimDistrict(id, team) {
    if (!this.districts[id]) return;
    this.districts[id].owner = team;
    const color = team === 'red' ? COLOR.TEAM_RED : COLOR.TEAM_BLUE;
    this._redrawDistrict(this.districts[id], color);

    const store = window.useGameStore?.getState();
    if (store) {
      store.setStatus({
        districts: { ...store.districts, [id]: store.myId || 'me' }
      });
    }
  }

  // --- 内部処理 ---
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
      const id = parseInt(obj.properties?.[0]?.value || obj.name, 10);
      const poly = (obj.polygon || []).map((p) => ({
        x: (obj.x + p.x) * MAP_SCALE,
        y: (obj.y + p.y) * MAP_SCALE,
      }));
      this.districts[id] = {
        id, name: obj.name, polygon: poly,
        center: this._calcCenter(poly), owner: "neutral",
        graphics: null, textLabel: null,
      };
    });
  }

  _drawDistrictPolygons() {
    const overlay = this.add.rectangle(0, 0, 4000, 4000, 0, 0).setOrigin(0).setInteractive();
    overlay.setDepth(1); 
    overlay.on("pointerdown", (p) => this._onMapClicked(p.x, p.y));

    Object.values(this.districts).forEach((d) => {
      d.graphics = this.add.graphics().setDepth(2); 
      this._redrawDistrict(d, COLOR.NEUTRAL);
      d.textLabel = this.add.text(d.center.x, d.center.y, d.name, { 
        fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2 
      }).setOrigin(0.5).setDepth(3);
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
  }

  _calcCenter(p) { return { x: p.reduce((s, v) => s + v.x, 0) / p.length, y: p.reduce((s, v) => s + v.y, 0) / p.length }; }
  updateStatusToReact() { window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { detail: this.playerStats })); }
  showLog(message) { window.dispatchEvent(new CustomEvent('NEW_LOG', { detail: message })); }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 2000, 2000);
    this.input.on("pointermove", (pointer) => {
      if (!pointer.isDown) return;
      this._dragMoved = true;
      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (!state) return;
      if (state.districts) this._syncDistricts(state.districts);
      if (state.players) this._syncPlayers(state.players);
    });

    socket.on(SERVER_EVENTS.GAME_OVER, () => {
      this.showLog("🏁 作戦終了！リザルトを確認してください。");
    });
  }

  _syncPlayers(players) {
    const mySocketId = socket.id;
    Object.entries(players).forEach(([playerId, data]) => {
      if (playerId === mySocketId) return; 
      const district = this.districts[data.districtId];
      if (!district) return;

      if (!this.otherPlayers[playerId]) {
        this.otherPlayers[playerId] = {
          dot: this.add.circle(district.center.x, district.center.y, 10, COLOR.ENEMY_DOT).setDepth(3),
          label: this.add.text(district.center.x, district.center.y - 18, data.name || "ENEMY", {
            fontSize: "10px", color: "#2ecc71", stroke: "#000", strokeThickness: 2
          }).setOrigin(0.5).setDepth(3)
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

      if (!ownerId) {
        this._redrawDistrict(d, COLOR.NEUTRAL);
      } else if (ownerId === mySocketId) {
        this._redrawDistrict(d, COLOR.MY_TERRITORY);
      } else {
        this._redrawDistrict(d, COLOR.ENEMY_TERRITORY);
      }
    });
  }
}