// src/game/scenes/MainScene.js
import Phaser from "phaser";
import socket from "../../socket";

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