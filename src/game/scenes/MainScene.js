import Phaser from "phaser";
import socket from "../../socket";

const MAP_SCALE = 0.5;

const COLOR = {
  TEAM_RED: 0xe74c3c,    
  TEAM_BLUE: 0x3498db,   
  NEUTRAL: 0x95a5a6,     
  HIGHLIGHT: 0xffff00,   
  PLAYER_DOT: 0xf1c40f,  
  ENEMY_DOT: 0xffffff    
};

const ADJACENCY = {
  101: [102, 103, 104, 105, 201], 102: [101, 104, 105, 401], 103: [101, 105, 201, 301],
  104: [101, 102, 105, 401], 105: [101, 103, 104, 301], 201: [202, 101, 103],
  202: [201], 301: [302, 103, 105], 302: [301], 401: [402, 102, 104], 402: [401],
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
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, team: 'red' }; 
    this.currentDistrictId = null;
    this.otherPlayers = {};   
    this.isSelectionMode = true; 
    this.isMyTurn = true; 
  }

  preload() {
    this.load.image("tiles", "assets/tilesets/Slates.png");
    this.load.tilemapTiledJSON("map", "assets/maps/cebu_map_簡易版.tmj");
    this.load.image('player_image', 'assets/sprites/player_dot.png'); 
  }

  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this._initSocket(); 
    
    this.updateStatusToReact();
    this.showLog("📍 作戦開始地点を選定してください");
  }

  update() {
    const zoom = this.cameras.main.zoom;
    Object.values(this.districts).forEach(d => {
      if (d.textLabel) d.textLabel.setVisible(zoom > 0.8);
    });
  }

  _initSocket() {
    window.addEventListener('syncState', (event) => {
      const gameState = event.detail;
      for (const socketId in gameState.players) {
        const playerInfo = gameState.players[socketId];
        if (socketId === socket.id) {
          this.playerStats.team = playerInfo.team;
          continue; 
        }
        if (!this.otherPlayers[socketId]) {
          const color = playerInfo.team === 'red' ? COLOR.TEAM_RED : COLOR.TEAM_BLUE;
          const char = this.add.circle(0, 0, 12, color).setDepth(5).setStrokeStyle(2, 0xffffff);
          this.otherPlayers[socketId] = char;
        }
        const dist = this.districts[playerInfo.districtId];
        if (dist) {
          this.otherPlayers[socketId].x = dist.center.x;
          this.otherPlayers[socketId].y = dist.center.y;
        }
      }
      for (const id in gameState.districts) {
        const ownerSocketId = gameState.districts[id];
        const ownerInfo = gameState.players[ownerSocketId];
        if (this.districts[id] && ownerInfo) {
          const teamColor = ownerInfo.team === 'red' ? COLOR.TEAM_RED : COLOR.TEAM_BLUE;
          this._redrawDistrict(this.districts[id], teamColor);
        }
      }
    });
  }

  confirmDeployment(startId) {
    this.isSelectionMode = false;
    this.currentDistrictId = startId;
    this._placePlayer(startId);
    Object.values(this.districts).forEach(d => this._redrawDistrict(d, COLOR.NEUTRAL));
    
    // ✅ 出撃地点を占領（Statusに反映される）
    this.claimDistrict(startId, this.playerStats.team);
    
    const districtName = this.districts[startId]?.name || `Sector ${startId}`;
    window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { 
      detail: { currentDistrictName: districtName } 
    }));

    this.showLog(`🚀 地区 ${startId} より攻略を開始します`);
  }

  _onMapClicked(screenX, screenY) {
    const worldP = { x: screenX + this.cameras.main.scrollX, y: screenY + this.cameras.main.scrollY };
    const clickedId = this._getDistrictAtPoint(worldP.x, worldP.y);
    if (!clickedId) return;

    const store = window.useGameStore?.getState();

    if (this.isSelectionMode) {
      Object.values(this.districts).forEach(d => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[clickedId], COLOR.HIGHLIGHT, 0.8);
      window.dispatchEvent(new CustomEvent('DISTRICT_SELECTED', { detail: clickedId }));
      return;
    }

    if (!store) return;
    if (clickedId === this.currentDistrictId) return;
    if (!store.isMyTurn) {
      this.showLog("📡 通信待機中（相手のターンです）");
      return;
    }
    if (store.stamina < 20) {
      this.showLog("🔋 スタミナ不足です！「次の日」ボタンで休息してください");
      return;
    }

    const neighbors = ADJACENCY[this.currentDistrictId] || [];
    if (!neighbors.includes(clickedId)) {
      this.showLog("🚫 その地区は遠すぎて進軍できません");
      return;
    }

    this.movePlayer(clickedId);
    
    // ✅ 移動先を占領（これでReactのHUDが 1/11, 2/11 と動く）
    this.claimDistrict(clickedId, store.myTeam || this.playerStats.team);

    window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { 
      detail: { 
        stamina: store.stamina - 20,
        currentDistrictName: this.districts[clickedId].name 
      } 
    }));

    socket.emit("PLAYER_MOVE", { toDistrictId: clickedId });
  }

  movePlayer(id) {
    const d = this.districts[id];
    if (!d || !this.player) return;
    this.tweens.add({
      targets: [this.player, this.playerLabel],
      x: d.center.x,
      y: (t) => t === this.player ? d.center.y : d.center.y - 25,
      duration: 300,
      ease: 'Power2'
    });
    this.currentDistrictId = id;
  }

  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;
    if (this.player) this.player.destroy();
    if (this.playerLabel) this.playerLabel.destroy();
    this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT).setDepth(10).setStrokeStyle(3, 0x000000);
    this.playerLabel = this.add.text(start.center.x, start.center.y - 25, "YOU", {
      fontSize: "14px", color: "#fff", stroke: "#000", strokeThickness: 4, fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(10);
    this.cameras.main.pan(start.center.x, start.center.y, 600, 'Power2');
  }

  /**
   * 🚩 占領メソッド：地図の色を変え、React Storeの占領数も更新する
   */
  claimDistrict(id, team) {
    if (!this.districts[id]) return;
    this.districts[id].owner = team;
    const color = team === 'red' ? COLOR.TEAM_RED : COLOR.TEAM_BLUE;
    this._redrawDistrict(this.districts[id], color);

    // ✅ ReactのStoreに占領情報を同期（0/11を動かす鍵）
    const store = window.useGameStore?.getState();
    const myId = store?.myId || socket.id || 'me'; 

    if (store) {
      store.setStatus({
        districts: {
          ...store.districts,
          [id]: myId // 地区IDに自分の通信IDを紐づける
        }
      });
      console.log(`[Phaser] District ${id} claimed by ${myId}`);
    }
  }

  _redrawDistrict(d, color, alpha = 0.5) {
    if (!d.graphics) return;
    d.graphics.clear().fillStyle(color, alpha).beginPath();
    d.polygon.forEach((p, i) => (i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y)));
    d.graphics.closePath().fillPath().lineStyle(2, 0xffffff, 0.8).strokePath();
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
      const id = parseInt(obj.properties?.[0]?.name, 10);
      const poly = (obj.polygon || []).map((p) => ({
        x: (obj.x + p.x) * MAP_SCALE,
        y: (obj.y + p.y) * MAP_SCALE,
      }));
      this.districts[id] = { id, name: obj.name, polygon: poly, center: this._calcCenter(poly), owner: "neutral", graphics: null };
    });
  }

  _drawDistrictPolygons() {
    const overlay = this.add.rectangle(0, 0, 2000, 2000, 0, 0).setOrigin(0).setInteractive();
    overlay.on("pointerdown", (p) => this._onMapClicked(p.x, p.y));
    Object.values(this.districts).forEach((d) => {
      d.graphics = this.add.graphics();
      this._redrawDistrict(d, COLOR.NEUTRAL);
      d.textLabel = this.add.text(d.center.x, d.center.y, d.name, { 
        fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2 
      }).setOrigin(0.5).setDepth(2);
    });
  }

  updateStatusToReact() { window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { detail: this.playerStats })); }
  showLog(message) { window.dispatchEvent(new CustomEvent('NEW_LOG', { detail: message })); }
  _calcCenter(p) { return { x: p.reduce((s, v) => s + v.x, 0) / p.length, y: p.reduce((s, v) => s + v.y, 0) / p.length }; }
  _getDistrictAtPoint(x, y) {
    for (const d of Object.values(this.districts)) { if (pointInPolygon({ x, y }, d.polygon)) return d.id; }
    return null;
  }
  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 1600, 1600).setZoom(1.0);
    this.input.on("pointermove", (p) => {
      if (!p.isDown) return;
      cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
      cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
    });
    this.input.on("wheel", (p, o, dx, dy) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom + (dy > 0 ? -0.1 : 0.1), 0.5, 2.5));
    });
  }
}