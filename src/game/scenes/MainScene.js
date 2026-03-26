// TMJの districtName レイヤーからポリゴンを読み込み、
// ハードコードされた DISTRICTS を完全に置き換える

import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../socketEvents";

/**
 * 【設定定数】
 * 開発効率を最大化するため、調整可能な変数を一箇所にまとめています。
 */
const MAP_SCALE = 0.5;

// ✅ 任務：領地とプレイヤーの色識別を直感的に！
const COLOR = {
  MY_TERRITORY: 0xe74c3c,    // 自分の領地（情熱の赤）
  ENEMY_TERRITORY: 0x27ae60, // 他人の領地（警戒の緑）
  NEUTRAL: 0x4a90d9,         // 未開の地（中立の青）
  HIGHLIGHT: 0xffff00,       // 選択中の地区（輝く黄）
  PLAYER_DOT: 0xf1c40f,      // 自分の現在地（司令官の黄）
  ENEMY_DOT: 0x2ecc71        // 敵の現在地（ライバルの緑）
};

// 【隣接グラフ】どの地区からどこへ進軍可能かを定義
const ADJACENCY = {
  101: [102, 103, 104, 105, 201], 102: [101, 104, 105, 401], 103: [101, 105, 201, 301],
  104: [101, 102, 105, 401], 105: [101, 103, 104, 301], 201: [202, 101, 103],
  202: [201], 301: [302, 103, 105], 302: [301], 401: [402, 102, 104], 402: [401],
};

/**
 * 【ポリゴン内外判定】
 * クリックした座標が多角形（地区）の中にあるかを数学的に判定します。
 */
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
    this.districts = {};      // 全地区データのコンテナ
    // ✅ 任務：能力値の名前を React の Store (stamina, blessing) と完全に一致させる
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this.START_DISTRICT_ID = 102;
    this._dragMoved = false;
    this.otherPlayers = {};   // 他プレイヤー管理用
    this.isSelectionMode = true; // ✅ 任務：最初は「出撃地点選択モード」
  }

  preload() {
    this.load.image("tiles", "assets/tilesets/Slates.png");
    this.load.tilemapTiledJSON("map", "assets/maps/cebu_map_簡易版.tmj");
  }

  create() {
    // ✅ 任務：すべての初期化関数を「順番に」呼び出す（関数未定義エラーを殲滅！）
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this.enemySprites = {};
    this._initSocket();
    this.updateStatusToReact(); // 初回ステータスをUIへ送信
    
    this.showLog("📍 地図をタップして開始地点を選択せよ");
  }

  /**
   * ✅ 任務：情報の取捨選択ロジック（毎フレーム実行）
   * ズームアウト時は地区名を隠し、戦況把握を優先させます。
   */
  update() {
    const zoom = this.cameras.main.zoom;
    Object.values(this.districts).forEach(d => {
      if (d.textLabel) {
        // ズームが 0.8 倍より小さい時は文字を非表示にしてスッキリさせる
        d.textLabel.setVisible(zoom > 0.8);
      }
    });
  }

  /**
   * ✅ 任務：React（サイドバー・HUD）への一括ステータス送信
   */
  updateStatusToReact() {
    window.dispatchEvent(new CustomEvent('UPDATE_STATUS', { detail: this.playerStats }));
  }

  showLog(message) {
    window.dispatchEvent(new CustomEvent('NEW_LOG', { detail: message }));
    console.log(`[GameLog] ${message}`);
  }

  /**
   * ✅ 任務：出撃確定（Reactの「出撃ボタン」から呼び出される司令塔）
   */
  confirmDeployment(startId) {
    this.isSelectionMode = false;
    this.currentDistrictId = startId;
    this._placePlayer(startId);
    
    // サーバーへ「この場所から開始する」と通信
    socket.emit("READY_TO_START", { startDistrictId: startId });
    this.showLog(`🚀 地区 ${startId} より攻略を開始する！`);
  }

  /**
   * ✅ 任務：プレイヤーを地図上に降臨させる
   */
  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;

    // 自機ドット生成
    this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT).setDepth(3);
    
    // 名前の表示（共有ロッカー Registry から取得）
    const name = this.registry.get("playerName") || "Guest";
    this.playerLabel = this.add.text(start.center.x, start.center.y - 20, name, {
      fontSize: "11px", color: "#ffffff", stroke: "#000000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3);

    this.claimDistrict(id, "player");
    this.cameras.main.centerOn(start.center.x, start.center.y);
  }

  /**
   * ✅ 任務：いっせい式バトルロジック（ダブルペナルティ）
   * 敗北時に HP と Stamina の両方を削り、「一歩戻る」動きを再現します。
   */
  startBattle(targetId) {
    const myFinalAtk = this.playerStats.atk * this.playerStats.blessing;
    const winRate = myFinalAtk / (myFinalAtk + 50);

    this.showLog(`⚔️ 地区${targetId}の敵と交戦！`);

    this.time.delayedCall(500, () => {
      if (Math.random() < winRate) {
        this.showLog(`🎉 勝利！ 地区${targetId}を我が領土とした！`);
        this.movePlayer(targetId);
        this.claimDistrict(targetId, "player");
      } else {
        // ダブルペナルティ：HPとSTを大幅に消耗
        this.playerStats.hp = Math.max(0, this.playerStats.hp - 20);
        this.playerStats.stamina = Math.max(0, this.playerStats.stamina - 25);
        this.showLog(`💀 敗北... 致命傷を負い、スタミナも尽きかけている。`);
        
        // 元の地区へ戻る演出
        this.movePlayer(this.currentDistrictId);
      }
      this.updateStatusToReact(); // Reactのバーを即座に更新
    });
  }

  /**
   * ✅ 任務：タイルマップのセットアップ（ここがエラーの源泉でした）
   */
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
    if (!this.tiledMap) return;
    const objectLayer = this.tiledMap.getObjectLayer("districtName");
    if (!objectLayer) return;

    objectLayer.objects.forEach((obj) => {
      const id = parseInt(obj.properties?.[0]?.name, 10);
      if (isNaN(id)) return;
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
      };
    });
  }

  _drawDistrictPolygons() {
    const inputOverlay = this.add
      .rectangle(0, 0, 50 * TILE_SIZE * MAP_SCALE, 50 * TILE_SIZE * MAP_SCALE, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();

    inputOverlay.on("pointerup", (p) => {
      // ドラッグしていなければクリックとして処理
      if (!this._dragMoved) this._onMapClicked(p.x, p.y);
    });
    inputOverlay.on("pointermove", (p) => this._onMapHover(p.x, p.y));

    Object.values(this.districts).forEach((district) => {
      district.graphics = this.add.graphics();
      this._redrawDistrict(district, COLOR.NEUTRAL);
      this.add
        .text(district.center.x, district.center.y, district.name, {
          fontSize: "9px",
          color: "#ffffff",
          align: "center",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(2);
    // 地図全体を操作可能にする透明なオーバーレイ
    const overlay = this.add.rectangle(0, 0, 2000, 2000, 0, 0).setOrigin(0).setInteractive();
    overlay.on("pointerdown", (p) => this._onMapClicked(p.x, p.y));
    
    Object.values(this.districts).forEach((d) => {
      d.graphics = this.add.graphics();
      this._redrawDistrict(d, COLOR.NEUTRAL);
      d.textLabel = this.add.text(d.center.x, d.center.y, d.name, {
        fontSize: "9px", color: "#ffffff", stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5).setDepth(2);
    });
  }

  _onMapClicked(screenX, screenY) {
    const cam = this.cameras.main;
    const worldX = cam.scrollX + screenX / cam.zoom;
    const worldY = cam.scrollY + screenY / cam.zoom;
    const clickedId = this._getDistrictAtPoint(worldX, worldY);
    const worldP = { x: screenX + this.cameras.main.scrollX, y: screenY + this.cameras.main.scrollY };
    const clickedId = this._getDistrictAtPoint(worldP.x, worldP.y);
    if (!clickedId) return;

    // 配置フェーズ：選択された場所を黄色く光らせ、Reactへ通知
    if (this.isSelectionMode) {
      Object.values(this.districts).forEach(d => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[clickedId], COLOR.HIGHLIGHT, 0.8);
      window.dispatchEvent(new CustomEvent('DISTRICT_SELECTED', { detail: clickedId }));
      return;
    }

    // ゲーム本編：スタミナと隣接チェック
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
      this.movePlayer(clickedId);
      this.claimDistrict(clickedId, "player");
      // サーバーへ移動を通知
      socket.emit("PLAYER_MOVE", { fromDistrictId: this.currentDistrictId, toDistrictId: clickedId });
    }
  }

  _onMapHover(screenX, screenY) {
    const cam = this.cameras.main;
    const worldX = cam.scrollX + screenX / cam.zoom;
    const worldY = cam.scrollY + screenY / cam.zoom;
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

  // ─────────────────────────────────────────
  // syncState受信 → 敵プレイヤー描画・陣地同期
  // ─────────────────────────────────────────

  // 陣地の色を同期
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
        this._redrawDistrict(district, COLOR.PLAYER);
        district.owner = "player";
      } else {
        this._redrawDistrict(district, COLOR.ENEMY);
        district.owner = "enemy";
      }
    });
  /**
   * 【内部計算・ユーティリティ】
   */
  _redrawDistrict(d, color, alpha = 0.5) {
    if (!d.graphics) return;
    d.graphics.clear().fillStyle(color, alpha).beginPath();
    d.polygon.forEach((p, i) => (i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y)));
    d.graphics.closePath().fillPath().lineStyle(2, 0xffffff, 0.8).strokePath();
  }

  _calcCenter(p) {
    return { x: p.reduce((s, v) => s + v.x, 0) / p.length, y: p.reduce((s, v) => s + v.y, 0) / p.length };
  }

  _getDistrictAtPoint(x, y) {
    for (const d of Object.values(this.districts)) {
      if (pointInPolygon({ x, y }, d.polygon)) return d.id;
    }
    return null;
  }

  _setupCamera() {
    const cam = this.cameras.main;

    // マップ全体サイズに合わせてカメラ境界を設定
    // Tiledのマップサイズ（tilewidth × mapwidth など）に合わせて調整
    // 【今：簡易版マップ用】
    const MAP_WIDTH = 1600; // 50tiles × 32px
    const MAP_HEIGHT = 1600; // 50tiles × 32px
    // 【本番マップに切り替えたら↓に変える】
    // const MAP_WIDTH  = 8000;  // 250tiles × 32px
    // const MAP_HEIGHT = 9600;  // 300tiles × 32px

    cam.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // 初期ズーム（全体が見える程度に設定）
    cam.setZoom(1.09);

    // ズームの範囲制限
    const ZOOM_MIN = 0.1;
    const ZOOM_MAX = 2.0;

    // ─── ドラッグスクロール ───
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let camStartX = 0;
    let camStartY = 0;

    this.input.on("pointerdown", (pointer) => {
      // 2本指ピンチ中はドラッグしない
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
      // 2本指になったらドラッグ中断
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        isDragging = false;
        return;
      }

      const dx = (pointer.x - dragStartX) / cam.zoom;
      const dy = (pointer.y - dragStartY) / cam.zoom;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this._dragMoved = true;
      cam.setScroll(camStartX - dx, camStartY - dy);
    });

    // ─── マウスホイールズーム ───
    this.input.on("wheel", (pointer, _objs, _dx, dy) => {
      const zoomDelta = dy > 0 ? -0.05 : 0.05;
      const newZoom = Phaser.Math.Clamp(cam.zoom + zoomDelta, ZOOM_MIN, ZOOM_MAX);

      // ポインター位置を中心にズーム
      const worldX = cam.scrollX + pointer.x / cam.zoom;
      const worldY = cam.scrollY + pointer.y / cam.zoom;
      cam.setZoom(newZoom);
      cam.setScroll(worldX - pointer.x / newZoom, worldY - pointer.y / newZoom);
    });

    // ─── ピンチズーム（スマホ2本指）───
    let lastPinchDistance = 0;

    this.input.on("pointermove", () => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      if (!p1.isDown || !p2.isDown) {
        lastPinchDistance = 0;
        return;
      }

      // 2本指の距離を計算
      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

      if (lastPinchDistance === 0) {
        lastPinchDistance = dist;
        return;
      }

      const pinchDelta = (dist - lastPinchDistance) * 0.005;
      const newZoom = Phaser.Math.Clamp(cam.zoom + pinchDelta, ZOOM_MIN, ZOOM_MAX);

      // 2本指の中心を基準にズーム
      const centerX = (p1.x + p2.x) / 2;
      const centerY = (p1.y + p2.y) / 2;
      const worldX = cam.scrollX + centerX / cam.zoom;
      const worldY = cam.scrollY + centerY / cam.zoom;
      cam.setZoom(newZoom);
      cam.setScroll(worldX - centerX / newZoom, worldY - centerY / newZoom);

      lastPinchDistance = dist;
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
      // プレイヤーを正しい位置に移動
      const start = this.districts[districtId];
      if (start && this.player) {
        this.player.setPosition(start.center.x, start.center.y);
        this.playerLabel.setPosition(start.center.x, start.center.y - 20);
        start.owner = "player";
        this._redrawDistrict(start, COLOR.PLAYER);
      }
    });

    // SYNC_STATE だけで敵の描画・領地同期を全部まかなう
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
        this._redrawDistrict(district, COLOR.PLAYER);
        district.owner = "player";
      } else {
        this._redrawDistrict(district, COLOR.ENEMY);
        district.owner = "enemy";
      }
    });

    socket.on(SERVER_EVENTS.BATTLE_RESULT, (result) => {
      const isWinner = result.winnerId === socket.id;
      if (isWinner) {
        this.showLog(`🎉 勝利！ 地区${result.districtId}を制圧`);
        this.movePlayer(result.districtId);
        this.claimDistrict(result.districtId, "player");
      } else {
        this.playerStats.hp = Math.max(0, this.playerStats.hp - result.hpDamage);
        this.showLog(`💀 敗北… HP -${result.hpDamage} (残HP: ${this.playerStats.hp})`);
        this.updateStatusHUD();
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
    // サーバーからの同期データ受信
    socket.on("syncState", (data) => {
      Object.entries(data.territories || {}).forEach(([id, ownerId]) => {
        const isMine = (ownerId === socket.id);
        const color = isMine ? COLOR.MY_TERRITORY : COLOR.ENEMY_TERRITORY;
        if (this.districts[id]) {
          this.districts[id].owner = isMine ? "player" : "enemy";
          this._redrawDistrict(this.districts[id], color);
        }
      });
    });
  }

  movePlayer(id) {
    const d = this.districts[id];
    if (!d) return;
    this.tweens.add({ targets: [this.player, this.playerLabel], x: d.center.x, y: (t) => t === this.player ? d.center.y : d.center.y - 20, duration: 300 });
    this.currentDistrictId = id;
  }

  claimDistrict(id, owner) {
    if (!this.districts[id]) return;
    this.districts[id].owner = owner;
    this._redrawDistrict(this.districts[id], owner === "player" ? COLOR.MY_TERRITORY : COLOR.ENEMY_TERRITORY);
  }
}