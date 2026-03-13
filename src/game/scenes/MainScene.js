// src/game/scenes/MainScene.js

import Phaser from "phaser";

// ═══════════════════════════════════════════════════
// 定数
// ═══════════════════════════════════════════════════

const TILE_SIZE = 32;
const MAP_SCALE = 0.5;

const COLOR = {
  PLAYER:    0xe74c3c,
  ENEMY:     0x27ae60,
  NEUTRAL:   0x4a90d9,
  HIGHLIGHT: 0xf39c12,
  PLAYER_UI: "#f1c40f",
};

const INITIAL_PLAYER_STATS = {
  atk:   50,
  def:   40,
  hp:    100,
  ap:    80,
  faith: 1.0,
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
// ポリゴン内外判定（Ray Casting アルゴリズム）
// ═══════════════════════════════════════════════════
function pointInPolygon(point, polygon) {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
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
    this.districts         = {};
    this.playerStats       = { ...INITIAL_PLAYER_STATS };
    this.currentDistrictId = null;
    this.START_DISTRICT_ID = 102;
  }

  // ───────────────────────────────────────────────
  // アセット読み込み
  // ───────────────────────────────────────────────
  preload() {
    this.load.image("tiles", "assets/tilesets/Slates.png");
    this.load.tilemapTiledJSON("map", "assets/maps/cebu_map_簡易版.tmj");
  }

  // ───────────────────────────────────────────────
  // シーン初期化
  // ───────────────────────────────────────────────
  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._placePlayer();
    this._createHUD();
    this._setupCamera();
  }

  // ───────────────────────────────────────────────
  // ① タイルマップのセットアップ
  // ───────────────────────────────────────────────
  _setupTilemap() {
    const map = this.make.tilemap({ key: "map" });

    const tileset = map.addTilesetImage("Slates.png", "tiles");
    if (!tileset) {
      console.error("[MainScene] タイルセットの紐付けに失敗。TMJのtileset.nameを確認");
      return;
    }

    this.tileLayer = map.createLayer("タイルレイヤー1", tileset, 0, 0);
    if (this.tileLayer) this.tileLayer.setScale(MAP_SCALE);

    this.tiledMap = map;
  }

  // ───────────────────────────────────────────────
  // ② TMJ の districtName レイヤーからポリゴンを抽出
  // ───────────────────────────────────────────────
  _loadDistrictsFromTMJ() {
    if (!this.tiledMap) return;

    const objectLayer = this.tiledMap.getObjectLayer("districtName");
    if (!objectLayer) {
      console.error("[MainScene] districtName レイヤーが見つかりません");
      return;
    }

    objectLayer.objects.forEach((obj) => {
      const districtIdStr = obj.properties?.[0]?.name;
      const districtId    = parseInt(districtIdStr, 10);
      if (isNaN(districtId)) {
        console.warn(`[MainScene] 不正な地区ID: ${districtIdStr}`, obj);
        return;
      }

      const absolutePolygon = (obj.polygon || []).map((p) => ({
        x: (obj.x + p.x) * MAP_SCALE,
        y: (obj.y + p.y) * MAP_SCALE,
      }));

      const center = this._calcPolygonCenter(absolutePolygon);

      this.districts[districtId] = {
        id:       districtId,
        name:     obj.name,
        polygon:  absolutePolygon,
        center,
        owner:    null,
        graphics: null,
      };
    });

    console.log("[MainScene] 読み込んだ地区:", Object.keys(this.districts).map(Number));
  }

  // ───────────────────────────────────────────────
  // ③ ポリゴンの描画 + クリック/ホバー判定登録
  // ───────────────────────────────────────────────
  _drawDistrictPolygons() {
    const inputOverlay = this.add
      .rectangle(0, 0, 50 * TILE_SIZE * MAP_SCALE, 50 * TILE_SIZE * MAP_SCALE, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();

    inputOverlay.on("pointerdown", (pointer) => this._onMapClicked(pointer.x, pointer.y));
    inputOverlay.on("pointermove", (pointer) => this._onMapHover(pointer.x, pointer.y));

    Object.values(this.districts).forEach((district) => {
      district.graphics = this.add.graphics();
      this._redrawDistrict(district, COLOR.NEUTRAL);

      this.add
        .text(district.center.x, district.center.y, district.name, {
          fontSize:        "9px",
          color:           "#ffffff",
          align:           "center",
          wordWrap:        { width: 80 },
          stroke:          "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setDepth(2);
    });
  }

  // ───────────────────────────────────────────────
  // ポリゴンを指定カラーで再描画
  // ───────────────────────────────────────────────
  _redrawDistrict(district, fillColor, alpha = 0.5) {
    const gfx = district.graphics;
    if (!gfx) return;
    gfx.clear();
    gfx.fillStyle(fillColor, alpha);
    gfx.beginPath();
    district.polygon.forEach((p, i) => {
      i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y);
    });
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2, 0xffffff, 0.8);
    gfx.strokePath();
  }

  // ───────────────────────────────────────────────
  // ④ プレイヤーを初期拠点（102）に配置
  // ───────────────────────────────────────────────
  _placePlayer() {
    this.currentDistrictId = this.START_DISTRICT_ID;

    const start = this.districts[this.START_DISTRICT_ID];
    if (!start) {
      console.error("[MainScene] 初期拠点の地区データが見つかりません");
      return;
    }

    this.player = this.add
      .circle(start.center.x, start.center.y, 12, 0xf1c40f)
      .setDepth(3);

    this.playerLabel = this.add
      .text(start.center.x, start.center.y - 20, "あきら", {
        fontSize:        "11px",
        color:           COLOR.PLAYER_UI,
        stroke:          "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    start.owner = "player";
    this._redrawDistrict(start, COLOR.PLAYER);
  }

  // ───────────────────────────────────────────────
  // ⑤ HUD の生成
  // ───────────────────────────────────────────────
  _createHUD() {
    this.add
      .rectangle(0, 0, 320, 28, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10);

    this.statusText = this.add
      .text(8, 6, "", { fontSize: "11px", color: "#ffffff" })
      .setScrollFactor(0)
      .setDepth(11);

    this.logText = this.add
      .text(8, this.scale.height - 28, "", {
        fontSize:        "11px",
        color:           "#aaffaa",
        backgroundColor: "#00000099",
        padding:         { x: 4, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(11);

    this.updateStatusHUD();
  }

  // ───────────────────────────────────────────────
  // ⑥ カメラ設定（ドラッグスクロール）
  // ───────────────────────────────────────────────
  _setupCamera() {
    const mapPixelW = 50 * TILE_SIZE * MAP_SCALE;
    const mapPixelH = 50 * TILE_SIZE * MAP_SCALE;
    this.cameras.main.setBounds(0, 0, mapPixelW, mapPixelH);

    this.input.on("pointerdown", (p) => {
      this._dragStartX = p.x + this.cameras.main.scrollX;
      this._dragStartY = p.y + this.cameras.main.scrollY;
    });

    this.input.on("pointermove", (p) => {
      if (p.isDown) {
        this.cameras.main.scrollX = this._dragStartX - p.x;
        this.cameras.main.scrollY = this._dragStartY - p.y;
      }
    });
  }

  // ═══════════════════════════════════════════════
  // クリック・ホバーのハンドラ
  // ═══════════════════════════════════════════════

  _onMapClicked(screenX, screenY) {
    const worldX    = screenX + this.cameras.main.scrollX;
    const worldY    = screenY + this.cameras.main.scrollY;
    const clickedId = this._getDistrictAtPoint(worldX, worldY);

    if (!clickedId) return;

    // React へ選択地区情報を送信
    this._emitToReact("phaser:selectDistrict", {
      districtId: clickedId,
      name:       this.districts[clickedId].name,
      owner:      this.districts[clickedId].owner,
    });

    if (clickedId === this.currentDistrictId) return;

    const neighbors = ADJACENCY[this.currentDistrictId] || [];
    if (!neighbors.includes(clickedId)) {
      this.showLog(`⚠ 地区${clickedId}へは直接移動できません`);
      return;
    }

    const target = this.districts[clickedId];
    if (target.owner === "enemy") {
      this.startBattle(clickedId);
    } else {
      this.movePlayer(clickedId);
      this.claimDistrict(clickedId, "player");
    }
  }

  _onMapHover(screenX, screenY) {
    const worldX    = screenX + this.cameras.main.scrollX;
    const worldY    = screenY + this.cameras.main.scrollY;
    const hoveredId = this._getDistrictAtPoint(worldX, worldY);

    Object.values(this.districts).forEach((d) => {
      if      (d.owner === "player") this._redrawDistrict(d, COLOR.PLAYER);
      else if (d.owner === "enemy")  this._redrawDistrict(d, COLOR.ENEMY);
      else                           this._redrawDistrict(d, COLOR.NEUTRAL);
    });

    if (hoveredId && this.districts[hoveredId]) {
      this._redrawDistrict(this.districts[hoveredId], COLOR.HIGHLIGHT, 0.7);
    }
  }

  // ═══════════════════════════════════════════════
  // ゲームロジック
  // ═══════════════════════════════════════════════

  movePlayer(districtId) {
    const target = this.districts[districtId];
    if (!target) return;

    const tweenCfg = (obj, x, y) => ({ targets: obj, x, y, duration: 300, ease: "Power2" });
    this.tweens.add(tweenCfg(this.player,      target.center.x,      target.center.y));
    this.tweens.add(tweenCfg(this.playerLabel, target.center.x, target.center.y - 20));
    this.currentDistrictId = districtId;
  }

  claimDistrict(districtId, owner) {
    const target = this.districts[districtId];
    if (!target) return;

    target.owner = owner;
    this._redrawDistrict(target, owner === "player" ? COLOR.PLAYER : COLOR.ENEMY);
    this.showLog(`✅ 「${target.name}」を占領！`);

    // React へ占領イベントを送信（けい担当Socket.IOへはいっせい経由で流す）
    this._emitToReact("phaser:territoryClaimed", { districtId, owner });

    // TODO: Socket.IO 直接送信（けいと連携後に実装）
    // socket.emit('territoryClaimed', { districtId, owner });
  }

  startBattle(targetDistrictId) {
    const enemyStats = { atk: 45, def: 50 }; // TODO: けいのSocket経由で取得
    const myFinalAtk = this.playerStats.atk * this.playerStats.faith;
    const winRate    = myFinalAtk / (myFinalAtk + enemyStats.def);
    const winPercent = Math.round(winRate * 100);

    this.showLog(`⚔ バトル！ 予測勝率: ${winPercent}%`);

    this.time.delayedCall(300, () => {
      if (Math.random() < winRate) {
        this.showLog(`🎉 勝利！ 地区${targetDistrictId}を制圧`);
        this.movePlayer(targetDistrictId);
        this.claimDistrict(targetDistrictId, "player");
        this._emitToReact("battleResult", {
          result: "win", districtId: targetDistrictId, winPercent,
        });
      } else {
        const damage = Math.floor(enemyStats.atk * 0.5);
        this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);
        this.showLog(`💀 敗北… HP -${damage} (残HP: ${this.playerStats.hp})`);
        this.updateStatusHUD();
        this._emitToReact("battleResult", {
          result: "lose", damage, remainHp: this.playerStats.hp, winPercent,
        });
        if (this.playerStats.hp <= 0) this.respawnPlayer();
      }
    });
  }

  respawnPlayer() {
    this.showLog("💫 リスポーン！ 初期拠点へ戻ります");
    this.playerStats = { ...INITIAL_PLAYER_STATS };
    this.movePlayer(this.START_DISTRICT_ID);
    this.updateStatusHUD();
  }

  // ═══════════════════════════════════════════════
  // UI 更新
  // ═══════════════════════════════════════════════

  updateStatusHUD() {
    const s = this.playerStats;
    this.statusText?.setText(
      `HP:${s.hp}  ATK:${s.atk}  DEF:${s.def}  AP:${s.ap}  信仰:${s.faith.toFixed(1)}`
    );
    this._emitToReact("statsUpdated", {
      hp: s.hp, atk: s.atk, def: s.def, ap: s.ap, faith: s.faith,
    });
  }

  showLog(message) {
    console.log(`[MainScene] ${message}`);
    this.logText?.setText(message);
  }

  // ═══════════════════════════════════════════════
  // ユーティリティ
  // ═══════════════════════════════════════════════

  // Phaser → React へカスタムイベントを送信
  _emitToReact(eventName, payload) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }

  _getDistrictAtPoint(worldX, worldY) {
    const point = { x: worldX, y: worldY };
    for (const [id, district] of Object.entries(this.districts)) {
      if (pointInPolygon(point, district.polygon)) return Number(id);
    }
    return null;
  }

  _calcPolygonCenter(polygon) {
    const sumX = polygon.reduce((s, p) => s + p.x, 0);
    const sumY = polygon.reduce((s, p) => s + p.y, 0);
    return { x: sumX / polygon.length, y: sumY / polygon.length };
  }
}