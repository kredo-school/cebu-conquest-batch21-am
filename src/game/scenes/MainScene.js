import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../socketEvents";
import { PHASER_TO_REACT, REACT_TO_PHASER } from "../events/PhaserBridge";

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
    this.load.image("player_image", "assets/sprites/player_dot.png");
  }

  // ───────────────────────────────────────────────
  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this.enemySprites = {};
    this._initSocket();
    this._setupReactListeners();
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

  shutdown() {
    (this._reactListeners || []).forEach(({ event, handler }) => {
      window.removeEventListener(event, handler);
    });
    this._reactListeners = [];
  }

  // ═══════════════════════════════════════════════
  // React連携
  // ═══════════════════════════════════════════════

  // Reactからのカスタムイベントをリッスンする
  _setupReactListeners() {
    const handlers = [
      {
        event: REACT_TO_PHASER.COMMAND_STAY,
        handler: () => this.handleStay(),
      },
      {
        event: REACT_TO_PHASER.COMMAND_ATTACK,
        handler: (e) => {
          const { targetDistrictId } = e.detail;
          if (!targetDistrictId || this.isSelectionMode) return;
          const target = this.districts[targetDistrictId];
          if (!target) return;
          if (target.owner === "enemy") {
            this.startBattle(targetDistrictId);
          } else {
            const fromId = this.currentDistrictId;
            this.movePlayer(targetDistrictId);
            this.claimDistrict(targetDistrictId, "player");
            this._emitPlayerMove(fromId, targetDistrictId);
          }
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_ESCAPE,
        handler: () => {
          if (this.isSelectionMode) return;
          const neighbors = ADJACENCY[this.currentDistrictId] || [];
          const safeId = neighbors.find((id) => this.districts[id]?.owner === "player");
          if (safeId) {
            this.movePlayer(safeId);
            this.showLog(`🏃 地区${safeId}へ撤退！`);
          } else {
            this.playerStats.hp = Math.max(0, this.playerStats.hp - 50);
            this.showLog("💥 逃げ場なし！ HP -50");
            this.updateStatusToReact();
            if (this.playerStats.hp <= 0) this.respawnPlayer();
          }
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_DEFEND,
        handler: () => {
          if (this.isSelectionMode) return;
          this.isDefending = true;
          this.showLog("🛡 防御態勢！次の被ダメージを半減");
          this.time.delayedCall(3000, () => {
            this.isDefending = false;
          });
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM,
        handler: (e) => {
          const { districtId } = e.detail;
          if (districtId) this.confirmDeployment(districtId);
        },
      },
    ];

    handlers.forEach(({ event, handler }) => {
      window.addEventListener(event, handler);
    });

    // shutdown()でクリーンアップできるよう保持
    this._reactListeners = handlers;
  }

  /**
   * 🚀 出撃確定処理
   * 選択モードを終了し、初期地点を占領色で塗ります。
   */
  confirmDeployment(startId) {
    this.isSelectionMode = false;
    this.currentDistrictId = startId;
    this._placePlayer(startId);
    
    // 一旦全地区を中立色でリセット
    Object.values(this.districts).forEach(d => this._redrawDistrict(d, COLOR.NEUTRAL));
    
    // Storeから確実に現在のチーム（赤or青）を取得して初回の占領を実行
    const store = window.useGameStore?.getState();
    const myTeam = store?.myTeam || this.playerStats.team;
    this.claimDistrict(startId, myTeam);
    
    const districtName = this.districts[startId]?.name || `Sector ${startId}`;
    window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { 
      detail: { currentDistrictName: districtName } 
    }));

    this.showLog(`🚀 地区 ${startId} より攻略を開始します`);
  }

  // プレイヤーを地図上に配置
  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;

    const name = this.registry.get("playerName") || "Guest";

    // 地点選択モード時の処理
    if (this.isSelectionMode) {
      Object.values(this.districts).forEach(d => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[clickedId], COLOR.HIGHLIGHT, 0.8);
      window.dispatchEvent(new CustomEvent('DISTRICT_SELECTED', { detail: clickedId }));
      return;
    }
    // 存在しない場合は新規作成
    this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT).setDepth(3);

    // 進軍モード時の処理
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

  // バトルロジック P = A / (A + D)
  startBattle(targetId) {
    const myFinalAtk = this.playerStats.atk * this.playerStats.blessing;
    const winRate = myFinalAtk / (myFinalAtk + 50);

    this.movePlayer(clickedId);
    this.claimDistrict(clickedId, store.myTeam || this.playerStats.team);

    // ── TODO: けいのサーバー統合後にここに差し替える ──────────
    // socket.emit(CLIENT_EVENTS.BATTLE_START, {
    //   attackerId: socket.id,
    //   targetDistrictId: targetId,
    // });
    // → 結果は _initSocket() の BATTLE_RESULT リスナーで受け取る
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
    this._emitToReact(PHASER_TO_REACT.PLAYER_MOVED, { districtId: id });
  }

  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;
    if (this.player) this.player.destroy();
    if (this.playerLabel) this.playerLabel.destroy();
    
    // 駒を Depth 10（最前面）に配置
    this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT)
      .setDepth(10)
      .setStrokeStyle(3, 0x000000);
      
    this.playerLabel = this.add.text(start.center.x, start.center.y - 25, "YOU", {
      fontSize: "14px", color: "#fff", stroke: "#000", strokeThickness: 4, fontWeight: 'bold'
    }).setOrigin(0.5).setDepth(10);
    
    this.cameras.main.pan(start.center.x, start.center.y, 600, 'Power2');
  }

  /**
   * 🚩 占領メソッド
   * 地図の色を変え、React Storeの占領データも更新します。
   */
  claimDistrict(id, team) {
    if (!this.districts[id]) return;
    this.districts[id].owner = team;
    const color = team === 'red' ? COLOR.TEAM_RED : COLOR.TEAM_BLUE;
    this._redrawDistrict(this.districts[id], color);

    const store = window.useGameStore?.getState();
    const myId = store?.myId || socket.id || 'me'; 

    if (store) {
      store.setStatus({
        districts: {
          ...store.districts,
          [id]: myId 
        }
      });
      console.log(`[Phaser] District ${id} claimed by ${myId}`);
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

  /**
   * ✅ 修正点：重なり順（Depth）の固定
   * 1: 透明パネル, 2: 占領色, 3: 地区名テキスト
   */
  _drawDistrictPolygons() {
    const overlay = this.add.rectangle(0, 0, 2000, 2000, 0, 0).setOrigin(0).setInteractive();
    overlay.setDepth(1); 
    overlay.on("pointerdown", (p) => this._onMapClicked(p.x, p.y));

    Object.values(this.districts).forEach((d) => {
      d.graphics = this.add.graphics();
      d.graphics.setDepth(2); 
      this._redrawDistrict(d, COLOR.NEUTRAL);
      
      d.textLabel = this.add.text(d.center.x, d.center.y, d.name, { 
        fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2 
      }).setOrigin(0.5).setDepth(3);
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
  // 内部ユーティリティ
  // ═══════════════════════════════════════════════

  // Phaser → React 統一ブリッジ
  _emitToReact(eventName, payload) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }

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

  updateStatusToReact() { window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { detail: this.playerStats })); }
  showLog(message) { window.dispatchEvent(new CustomEvent('NEW_LOG', { detail: message })); }
  _calcCenter(p) { return { x: p.reduce((s, v) => s + v.x, 0) / p.length, y: p.reduce((s, v) => s + v.y, 0) / p.length }; }
  
  _getDistrictAtPoint(x, y) {
    for (const d of Object.values(this.districts)) { 
      if (pointInPolygon({ x, y }, d.polygon)) return d.id; 
    }
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

      // ★ プレイヤーがまだ生成されていない場合のみ配置
      if (!this.player) {
        this._placePlayer(districtId);
      } else {
        // 既にいれば移動だけ
        this.movePlayer(districtId);
      }

      const start = this.districts[districtId];
      if (start) {
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

    // ★ 他のプレイヤーが既にその地区を選択・仮予約していた場合のエラーハンドリング
    socket.on("ERROR_DISTRICT_TAKEN", ({ districtId }) => {
      const district = this.districts[districtId];
      if (district) {
        // ハイライトを中立カラーに戻す
        this._redrawDistrict(district, COLOR.NEUTRAL);
      }

      // プレイヤーへの警告ログ表示
      this.showLog(`⚠ 地区${districtId}はすでに他のプレイヤーが選択中です`);

      // React側の「出撃」ボタンを非表示に戻すため null を送る
      this._emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, null);
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
