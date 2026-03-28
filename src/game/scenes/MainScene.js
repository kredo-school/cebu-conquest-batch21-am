import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../socketEvents";

const MAP_SCALE = 0.5;
const TILE_SIZE = 32;

const COLOR = {
  MY_TERRITORY: 0xe74c3c, // 自分の領地（赤）
  ENEMY_TERRITORY: 0x27ae60, // 敵の領地（緑）
  NEUTRAL: 0x4a90d9, // 中立（青）
  HIGHLIGHT: 0xffff00, // 選択中（黄）
  PLAYER_DOT: 0xf1c40f, // 自分の現在地(黄)
  ENEMY_DOT: 0x2ecc71, // 敵の現在地（緑）
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

// ═══════════════════════════════════════════════════
// ポリゴン内外判定ユーティリティ
// ═══════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════
// MainScene
// ═══════════════════════════════════════════════════
export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.districts = {};
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this.START_DISTRICT_ID = 102;
    this._dragMoved = false;
    this.otherPlayers = {};
    this.isSelectionMode = true; // 最初は出撃地点選択モード
  }

  // ───────────────────────────────────────────────
  preload() {
    this.load.image("tiles", "assets/tilesets/Slates.png");
    this.load.tilemapTiledJSON("map", "assets/maps/cebu_map_簡易版.tmj");
    this.load.image('player_image', 'assets/sprites/player_dot.png'); 
  }

  // ───────────────────────────────────────────────
  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this.enemySprites = {};
    this._initSocket();
    this.updateStatusToReact();
    this.showLog("📍 地図をタップして開始地点を選択せよ");
  }

  // ───────────────────────────────────────────────
  update() {
    const zoom = this.cameras.main.zoom;
    Object.values(this.districts).forEach((d) => {
      if (d.textLabel) d.textLabel.setVisible(zoom > 0.8);
    });
  }

  // ═══════════════════════════════════════════════
  // React連携
  // ═══════════════════════════════════════════════

  updateStatusToReact() {
    window.dispatchEvent(new CustomEvent("UPDATE_STATUS", { detail: this.playerStats }));
  }

  showLog(message) {
    window.dispatchEvent(new CustomEvent("NEW_LOG", { detail: message }));
    console.log(`[GameLog] ${message}`);
  }

  // ═══════════════════════════════════════════════
  // ゲームロジック
  // ═══════════════════════════════════════════════

  // 出撃確定（Reactの「出撃ボタン」から呼び出される）
  confirmDeployment(startId) {
    this.isSelectionMode = false;
    this.currentDistrictId = startId;
    this._placePlayer(startId);
    socket.emit("READY_TO_START", { startDistrictId: startId });
    this.showLog(`🚀 地区 ${startId} より攻略を開始する！`);
  }

  // プレイヤーを地図上に配置
  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;

    this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT).setDepth(3);

    const name = this.registry.get("playerName") || "Guest";
    this.playerLabel = this.add
      .text(start.center.x, start.center.y - 20, name, {
        fontSize: "11px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);
    }

  // バトルロジック P = A / (A + D)
  startBattle(targetId) {
    const myFinalAtk = this.playerStats.atk * this.playerStats.blessing;
    const winRate = myFinalAtk / (myFinalAtk + 50);

    const neighbors = ADJACENCY[this.currentDistrictId] || [];
    if (!neighbors.includes(targetId)) {
      this.showLog("🚫 その地区は遠すぎて進軍できません");
      return;
    }

    this.time.delayedCall(500, () => {
      if (Math.random() < winRate) {
        this.showLog(`🎉 勝利！ 地区${targetId}を我が領土とした！`);
        this.movePlayer(targetId);
        this.claimDistrict(targetId, "player");
      } else {
        // ダブルペナルティ
        this.playerStats.hp = Math.max(0, this.playerStats.hp - 20);
        this.playerStats.stamina = Math.max(0, this.playerStats.stamina - 25);
        this.showLog("💀 敗北... 致命傷を負い、スタミナも尽きかけている。");
        this.movePlayer(this.currentDistrictId); // 元の地区に戻る
      }
      this.updateStatusToReact();
    });
    /* けいのーサーバー完成用 */
    /* 上記削除して置き換え */

    // // サーバーへ「バトルしたい」とリクエストを投げるだけ
    // socket.emit("BATTLE_START", {
    //   attackerId: socket.id,
    //   targetDistrictId: targetId,
    //   attackerStats: this.playerStats, // 参考値。サーバー側DBの値が優先
    // });
    // this.showLog(`⚔️ 地区${targetId}へ進軍要請を送信...`);
    // // 結果は _initSocket() の BATTLE_RESULT リスナーで受け取る（実装済み）
  }


  // リスポーン
  respawnPlayer() {
    this.showLog("💫 リスポーン！ 初期拠点へ戻ります");
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40 };
    this.movePlayer(this.START_DISTRICT_ID);
    this.updateStatusToReact();
  }

  // プレイヤー移動（Tween）
  // player と playerLabel を別々の tweens.add で処理
  movePlayer(id) {
    const d = this.districts[id];
    if (!d || !this.player) return;

    this.tweens.add({
      targets: this.player,
      x: d.center.x,
      y: d.center.y,
      duration: 300,
      ease: "Power2",
    });
    this.tweens.add({
      targets: this.playerLabel,
      x: d.center.x,
      y: d.center.y - 20,
      duration: 300,
      ease: "Power2",
    });
    this.currentDistrictId = id;
  }

  // 陣地占領
  claimDistrict(id, owner) {
    if (!this.districts[id]) return;
    this.districts[id].owner = owner;
    this._redrawDistrict(
      this.districts[id],
      owner === "player" ? COLOR.MY_TERRITORY : COLOR.ENEMY_TERRITORY,
    );
    if (owner === "player") {
      this._emitTerritoryClaimed(id);
    }
  }

  // ═══════════════════════════════════════════════
  // タイルマップ
  // ═══════════════════════════════════════════════

  _setupTilemap() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("Slates.png", "tiles");
    if (!tileset) {
      console.error("タイルセットが見つかりません");
      return;
    }
    this.tileLayer = map.createLayer("タイルレイヤー1", tileset, 0, 0);
    if (this.tileLayer) this.tileLayer.setScale(MAP_SCALE);
    this.tiledMap = map;
  }

  _loadDistrictsFromTMJ() {
    const objectLayer = this.tiledMap.getObjectLayer("districtName");
    if (!objectLayer) {
      console.error("districtName レイヤーが見つかりません");
      return;
    }

    objectLayer.objects.forEach((obj) => {
      const id = parseInt(obj.properties?.[0]?.name, 10);
      const poly = (obj.polygon || []).map((p) => ({
        x: (obj.x + p.x) * MAP_SCALE,
        y: (obj.y + p.y) * MAP_SCALE,
      }));
      this.districts[id] = {
        id,
        name: obj.name,
        polygon: poly,
        center: this._calcCenter(poly),
        owner: "neutral",
        graphics: null,
        textLabel: null,
      };
    });
  }

  _drawDistrictPolygons() {
    const mapW = 50 * TILE_SIZE * MAP_SCALE;
    const mapH = 50 * TILE_SIZE * MAP_SCALE;

    // クリック・ホバー検出用の透明オーバーレイ
    const overlay = this.add
      .rectangle(0, 0, mapW, mapH, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();

    overlay.on("pointerup", (p) => {
      if (!this._dragMoved) this._onMapClicked(p.x, p.y);
    });
    overlay.on("pointermove", (p) => this._onMapHover(p.x, p.y));

    Object.values(this.districts).forEach((d) => {
      d.graphics = this.add.graphics().setDepth(1);
      this._redrawDistrict(d, COLOR.NEUTRAL);
      d.textLabel = this.add
        .text(d.center.x, d.center.y, d.name, {
          fontSize: "9px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(2);
    });
  }

  // ═══════════════════════════════════════════════
  // クリック・ホバー処理
  // ═══════════════════════════════════════════════

  _onMapClicked(screenX, screenY) {
    const cam = this.cameras.main;
    const worldX = cam.scrollX + screenX / cam.zoom;
    const worldY = cam.scrollY + screenY / cam.zoom;
    const clickedId = this._getDistrictAtPoint(worldX, worldY);
    if (!clickedId) return;

    // 配置フェーズ: ハイライトして React へ通知
    if (this.isSelectionMode) {
      Object.values(this.districts).forEach((d) => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[clickedId], COLOR.HIGHLIGHT, 0.8);
      window.dispatchEvent(new CustomEvent("DISTRICT_SELECTED", { detail: clickedId }));
      return;
    }

    // ゲーム本編
    if (this.playerStats.stamina <= 0) {
      this.showLog("🪫 スタミナ切れ！動けません。");
      return;
    }
    if (clickedId === this.currentDistrictId) return;

    const neighbors = ADJACENCY[this.currentDistrictId] || [];
    if (!neighbors.includes(clickedId)) {
      this.showLog("⚠ 遠すぎて一気には進めません！");
      return;
    }

    const target = this.districts[clickedId];
    if (target.owner === "enemy") {
      this.startBattle(clickedId);
    } else {
      const fromDistrictId = this.currentDistrictId;
      this.movePlayer(clickedId);
      this.claimDistrict(clickedId, "player");
      socket.emit("PLAYER_MOVE", {
        fromDistrictId: fromDistrictId,
        toDistrictId: clickedId,
      });
    }
  }

  _onMapHover(screenX, screenY) {
    const cam = this.cameras.main;
    const worldX = cam.scrollX + screenX / cam.zoom;
    const worldY = cam.scrollY + screenY / cam.zoom;
    const hoveredId = this._getDistrictAtPoint(worldX, worldY);

    // 全地区を現在の所有者カラーに戻す
    Object.values(this.districts).forEach((d) => {
      if (d.owner === "player") this._redrawDistrict(d, COLOR.MY_TERRITORY);
      else if (d.owner === "enemy") this._redrawDistrict(d, COLOR.ENEMY_TERRITORY);
      else this._redrawDistrict(d, COLOR.NEUTRAL);
    });

    // ホバー中の地区をハイライト
    if (hoveredId && this.districts[hoveredId]) {
      this._redrawDistrict(this.districts[hoveredId], COLOR.HIGHLIGHT, 0.7);
    }
  }

  // ═══════════════════════════════════════════════
  // 同期処理
  // ═══════════════════════════════════════════════

  _syncDistricts(districts) {
    if (!districts) return;
    const mySocketId = socket.id;
    Object.entries(districts).forEach(([districtId, owner]) => {
      const district = this.districts[Number(districtId)];
      if (!district) return;
      if (!owner) {
        this._redrawDistrict(district, COLOR.NEUTRAL);
        district.owner = null;
      } else if (owner === mySocketId) {
        this._redrawDistrict(district, COLOR.MY_TERRITORY);
        district.owner = "player";
      } else {
        this._redrawDistrict(district, COLOR.ENEMY_TERRITORY);
        district.owner = "enemy";
      }
    });
  }

  _syncPlayers(players) {
    if (!players) return;
    const mySocketId = socket.id;

    Object.entries(players).forEach(([playerId, data]) => {
      if (playerId === mySocketId) return;
      const district = this.districts[data.districtId];
      if (!district) return;

      if (!this.otherPlayers[playerId]) {
        // 初回: ドット＋ラベル生成
        this.otherPlayers[playerId] = {
          dot: this.add
            .circle(district.center.x, district.center.y, 10, COLOR.ENEMY_DOT)
            .setDepth(3),
          label: this.add
            .text(district.center.x, district.center.y - 18, data.name || playerId.slice(0, 6), {
              fontSize: "10px",
              color: "#2ecc71",
              stroke: "#000",
              strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(3),
        };
      } else {
        // 更新: 位置を移動
        this.otherPlayers[playerId].dot.setPosition(district.center.x, district.center.y);
        this.otherPlayers[playerId].label.setPosition(district.center.x, district.center.y - 18);
      }
    });

    // 退出プレイヤーを削除
    Object.keys(this.otherPlayers).forEach((playerId) => {
      if (!players[playerId]) {
        this.otherPlayers[playerId].dot.destroy();
        this.otherPlayers[playerId].label.destroy();
        delete this.otherPlayers[playerId];
      }
    });
  }

  // ═══════════════════════════════════════════════
  // 内部ユーティリティ（修正④で独立したメソッドとして復活）
  // ═══════════════════════════════════════════════

  _redrawDistrict(d, color, alpha = 0.5) {
    if (!d || !d.graphics) return;
    d.graphics.clear().fillStyle(color, alpha).beginPath();
    d.polygon.forEach((p, i) =>
      i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y),
    );
    d.graphics.closePath().fillPath().lineStyle(2, 0xffffff, 0.8).strokePath();
  }

  _calcCenter(polygon) {
    return {
      x: polygon.reduce((s, v) => s + v.x, 0) / polygon.length,
      y: polygon.reduce((s, v) => s + v.y, 0) / polygon.length,
    };
  }

  _getDistrictAtPoint(x, y) {
    for (const d of Object.values(this.districts)) { if (pointInPolygon({ x, y }, d.polygon)) return d.id; }
    return null;
  }
  _setupCamera() {
    const cam = this.cameras.main;
    const MAP_WIDTH = 50 * TILE_SIZE * MAP_SCALE; // 800px
    const MAP_HEIGHT = 50 * TILE_SIZE * MAP_SCALE; // 800px

    cam.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    cam.setZoom(1.0);

    const ZOOM_MIN = 0.3;
    const ZOOM_MAX = 2.5;

    // ── ドラッグスクロール ──
    let isDragging = false;
    let dragStartX = 0,
      dragStartY = 0;
    let camStartX = 0,
      camStartY = 0;

    this.input.on("pointerdown", (pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) return;
      isDragging = true;
      this._dragMoved = false;
      dragStartX = pointer.x;
      dragStartY = pointer.y;
      camStartX = cam.scrollX;
      camStartY = cam.scrollY;
    });

    this.input.on("pointermove", (pointer) => {
      if (!isDragging) return;
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        isDragging = false;
        return;
      }
      const dx = (pointer.x - dragStartX) / cam.zoom;
      const dy = (pointer.y - dragStartY) / cam.zoom;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this._dragMoved = true;
      cam.setScroll(camStartX - dx, camStartY - dy);
    });

    this.input.on("pointerup", () => {
      isDragging = false;
    });

    // ── マウスホイールズーム ──
    this.input.on("wheel", (pointer, _objs, _dx, dy) => {
      const zoomDelta = dy > 0 ? -0.05 : 0.05;
      const newZoom = Phaser.Math.Clamp(cam.zoom + zoomDelta, ZOOM_MIN, ZOOM_MAX);
      const worldX = cam.scrollX + pointer.x / cam.zoom;
      const worldY = cam.scrollY + pointer.y / cam.zoom;
      cam.setZoom(newZoom);
      cam.setScroll(worldX - pointer.x / newZoom, worldY - pointer.y / newZoom);
    });

    // ── ピンチズーム（スマホ2本指）──
    let lastPinchDistance = 0;

    this.input.on("pointermove", () => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (!p1.isDown || !p2.isDown) {
        lastPinchDistance = 0;
        return;
      }

      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (lastPinchDistance === 0) {
        lastPinchDistance = dist;
        return;
      }

      const newZoom = Phaser.Math.Clamp(
        cam.zoom + (dist - lastPinchDistance) * 0.005,
        ZOOM_MIN,
        ZOOM_MAX,
      );
      const centerX = (p1.x + p2.x) / 2;
      const centerY = (p1.y + p2.y) / 2;
      const worldX = cam.scrollX + centerX / cam.zoom;
      const worldY = cam.scrollY + centerY / cam.zoom;
      cam.setZoom(newZoom);
      cam.setScroll(worldX - centerX / newZoom, worldY - centerY / newZoom);
      lastPinchDistance = dist;
    });
  }

  // ═══════════════════════════════════════════════
  // Socket.IO
  // ═══════════════════════════════════════════════

  _initSocket() {
    socket.connect();

    socket.on("connect", () => {
      socket.emit(CLIENT_EVENTS.PLAYER_MOVE, {
        playerId: socket.id,
        fromDistrictId: null,
        toDistrictId: this.currentDistrictId,
      });
    });

    socket.on("assignStartDistrict", ({ districtId }) => {
      this.START_DISTRICT_ID = districtId;
      this.currentDistrictId = districtId;
      const start = this.districts[districtId];
      if (start && this.player) {
        this.player.setPosition(start.center.x, start.center.y);
        this.playerLabel.setPosition(start.center.x, start.center.y - 20);
        start.owner = "player";
        this._redrawDistrict(start, COLOR.MY_TERRITORY);
      }
    });

    socket.on(SERVER_EVENTS.SYNC_STATE, (gameState) => {
      this._syncDistricts(gameState.districts);
      this._syncPlayers(gameState.players);
    });

    socket.on(SERVER_EVENTS.TERRITORY_UPDATED, (p) => {
      const district = this.districts[p.districtId];
      if (!district) return;
      if (!p.owner) {
        this._redrawDistrict(district, COLOR.NEUTRAL);
        district.owner = null;
      } else if (p.owner === socket.id) {
        this._redrawDistrict(district, COLOR.MY_TERRITORY);
        district.owner = "player";
      } else {
        this._redrawDistrict(district, COLOR.ENEMY_TERRITORY);
        district.owner = "enemy";
      }
    });

    socket.on(SERVER_EVENTS.BATTLE_RESULT, (result) => {
      if (result.winnerId === socket.id) {
        this.showLog(`🎉 勝利！ 地区${result.districtId}を制圧`);
        this.movePlayer(result.districtId);
        this.claimDistrict(result.districtId, "player");
      } else {
        this.playerStats.hp = Math.max(0, this.playerStats.hp - result.hpDamage);
        this.showLog(`💀 敗北… HP -${result.hpDamage} (残HP: ${this.playerStats.hp})`);
        this.updateStatusToReact();
        if (this.playerStats.hp <= 0) this.respawnPlayer();
      }
    });
  }

  _emitPlayerMove(fromDistrictId, toDistrictId) {
    socket.emit(CLIENT_EVENTS.PLAYER_MOVE, { playerId: socket.id, fromDistrictId, toDistrictId });
  }

  _emitTerritoryClaimed(districtId) {
    socket.emit(CLIENT_EVENTS.TERRITORY_CLAIMED, {
      playerId: socket.id,
      districtId,
      owner: socket.id,
    });
  }
}