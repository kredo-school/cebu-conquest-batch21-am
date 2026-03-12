// src/game/scenes/MainScene.js
// TMJの districtName レイヤーからポリゴンを読み込み、
// ハードコードされた DISTRICTS を完全に置き換える

import Phaser from "phaser";

// ═══════════════════════════════════════════════════
// 定数
// ═══════════════════════════════════════════════════
const TILE_SIZE = 32; // TMJの tilewidth/tileheight に合わせる

// マップ表示スケール（50×50タイル × 32px = 1600px → 画面に収める）
const MAP_SCALE = 0.5;

// プレイヤーカラー定義
const COLOR = {
  PLAYER: 0xe74c3c, // 赤（自陣）
  ENEMY: 0x27ae60, // 緑（敵陣）
  NEUTRAL: 0x4a90d9, // 青（空き地）
  HIGHLIGHT: 0xf39c12, // 橙（ホバー）
  PLAYER_UI: "#f1c40f",
};
// プレイヤー初期ステータス
const INITIAL_PLAYER_STATS = {
  atk: 50,
  def: 40,
  hp: 100,
  ap: 80,
  faith: 1.0,
};
// 隣接グラフ（地区IDベース）
const ADJACENCY = {
  // セブ市街地
  101: [102, 103, 104, 105, 201], // 歴史保護地区
  102: [101, 104, 105, 401], // ダウンタウン・港湾地区
  103: [101, 105, 201, 301], // 新都心・ビジネス地区
  104: [101, 102, 105, 401], // 山間・アップタウン地区
  105: [101, 103, 104, 301], // ショッピング・商業特区
  // マクタン島
  201: [202, 101, 103], // リゾート・バトルゾーン
  202: [201], // ゲートウェイゾーン
  // 北部
  301: [302, 103, 105], // アドベンチャーゾーン
  302: [301], // コースタル・トレードゾーン
  // 南部
  401: [402, 102, 104], // マリン・ジャイアントゾーン
  402: [401], // ヘリテージ・グルメゾーン
};
// ═══════════════════════════════════════════════════
// ポリゴン内外判定（Ray Casting アルゴリズム）
// point: {x, y}、polygon: [{x, y}, ...] （絶対座標）
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

    // districtId → { polygon(絶対座標), name, graphics, center, owner }
    this.districts = {};
    this.playerStats = { ...INITIAL_PLAYER_STATS };
    this.currentDistrictId = null; // TMJ読み込み後に初期化
    this.START_DISTRICT_ID = 102;
  }

  // ───────────────────────────────────────────────
  // アセット読み込み
  // ───────────────────────────────────────────────
  preload() {
    // タイルセット画像（public/assets/tilesets/ に置くこと）
    this.load.image("tiles", "assets/tilesets/Slates.png");

    // タイルマップ（public/assets/maps/ に置くこと）
    this.load.tilemapTiledJSON("map", "assets/maps/cebu_map_簡易版.tmj");
  }

  // ───────────────────────────────────────────────
  // シーン初期化
  // ───────────────────────────────────────────────
  create() {
    // ① タイルマップを生成・描画
    this._setupTilemap();

    // ② districtName レイヤーからポリゴンを抽出
    this._loadDistrictsFromTMJ();

    // ③ ポリゴンを画面に描画 + クリック判定を登録
    this._drawDistrictPolygons();

    // ④ プレイヤーを初期拠点へ配置
    this._placePlayer();

    // ⑤ HUD 生成
    this._createHUD();

    // ⑥ カメラ設定（ドラッグ移動）
    this._setupCamera();
  }

  // ───────────────────────────────────────────────
  // ① タイルマップのセットアップ
  // ───────────────────────────────────────────────
  _setupTilemap() {
    const map = this.make.tilemap({ key: "map" });

    // タイルセットを紐付け（TMJ内の "name" と一致させること）
    const tileset = map.addTilesetImage("Slates.png", "tiles");
    if (!tileset) {
      console.error("[MainScene] タイルセットの紐付けに失敗。TMJのtileset.nameを確認");
      return;
    }

    // タイルレイヤー描画（TMJのレイヤー名 "タイルレイヤー1" に合わせる）
    this.tileLayer = map.createLayer("タイルレイヤー1", tileset, 0, 0);
    if (this.tileLayer) {
      this.tileLayer.setScale(MAP_SCALE);
    }

    // マップオブジェクトを後で参照できるよう保持
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
      // プロパティの name が地区ID（例: "103"）になっている
      const districtIdStr = obj.properties?.[0]?.name;
      const districtId = parseInt(districtIdStr, 10);
      if (isNaN(districtId)) {
        console.warn(`[MainScene] 不正な地区ID: ${districtIdStr}`, obj);
        return;
      }

      // ポリゴン頂点を絶対座標に変換 & MAP_SCALE を適用
      const absolutePolygon = (obj.polygon || []).map((p) => ({
        x: (obj.x + p.x) * MAP_SCALE,
        y: (obj.y + p.y) * MAP_SCALE,
      }));

      // 重心（ラベル・プレイヤー配置用）
      const center = this._calcPolygonCenter(absolutePolygon);

      this.districts[districtId] = {
        id: districtId,
        name: obj.name,
        polygon: absolutePolygon,
        center,
        owner: null, // null=中立 / "player" / "enemy"
        graphics: null, // 描画オブジェクト（後で設定）
      };
    });

    console.log("[MainScene] 読み込んだ地区:", Object.keys(this.districts).map(Number));
  }

  // ───────────────────────────────────────────────
  // ③ ポリゴンの描画 + クリック判定登録
  // ───────────────────────────────────────────────
  _drawDistrictPolygons() {
    // 入力判定用の透明な矩形レイヤー（マップ全体）
    const inputOverlay = this.add
      .rectangle(0, 0, 50 * TILE_SIZE * MAP_SCALE, 50 * TILE_SIZE * MAP_SCALE, 0x000000, 0)
      .setOrigin(0, 0)
      .setInteractive();

    // クリック座標からどの地区かを判定
    inputOverlay.on("pointerdown", (pointer) => {
      this._onMapClicked(pointer.x, pointer.y);
    });

    // ポリゴンのホバー（どの地区かをハイライト）
    inputOverlay.on("pointermove", (pointer) => {
      this._onMapHover(pointer.x, pointer.y);
    });

    // 各地区のポリゴンを描画
    Object.values(this.districts).forEach((district) => {
      const gfx = this.add.graphics();
      district.graphics = gfx;
      this._redrawDistrict(district, COLOR.NEUTRAL);

      // 地区名ラベル
      this.add
        .text(district.center.x, district.center.y, district.name, {
          fontSize: "9px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: 80 },
          stroke: "#000000",
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

    this.player = this.add.circle(start.center.x, start.center.y, 12, 0xf1c40f).setDepth(3);

    this.playerLabel = this.add
      .text(start.center.x, start.center.y - 20, "あきら", {
        fontSize: "11px",
        color: COLOR.PLAYER_UI,
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    // 初期拠点を自陣カラーに
    start.owner = "player";
    this._redrawDistrict(start, COLOR.PLAYER);
  }

  // ───────────────────────────────────────────────
  // ⑤ HUD の生成
  // ───────────────────────────────────────────────
  _createHUD() {
    // HUD背景
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
        fontSize: "11px",
        color: "#aaffaa",
        backgroundColor: "#00000099",
        padding: { x: 4, y: 2 },
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

    // ドラッグでスクロール
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
    // スクリーン座標 → ワールド座標に変換
    const worldX = screenX + this.cameras.main.scrollX;
    const worldY = screenY + this.cameras.main.scrollY;
    const clickedId = this._getDistrictAtPoint(worldX, worldY);

    if (!clickedId) return;

    // いっせい(React)へ、クリックした陣地の情報を送る
    window.dispatchEvent(
      new CustomEvent("phaser:selectDistrict", {
        detail: {
          districtId: clickedId,
          name: this.districts[clickedId].name,
          owner: this.districts[clickedId].owner,
        },
      }),
    );
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
    const worldX = screenX + this.cameras.main.scrollX;
    const worldY = screenY + this.cameras.main.scrollY;
    const hoveredId = this._getDistrictAtPoint(worldX, worldY);

    // 全地区のハイライトをリセット
    Object.values(this.districts).forEach((d) => {
      if (d.owner === "player") this._redrawDistrict(d, COLOR.PLAYER);
      else if (d.owner === "enemy") this._redrawDistrict(d, COLOR.ENEMY);
      else this._redrawDistrict(d, COLOR.NEUTRAL);
    });

    // ホバー中の地区をハイライト
    if (hoveredId && this.districts[hoveredId]) {
      this._redrawDistrict(this.districts[hoveredId], COLOR.HIGHLIGHT, 0.7);
    }
  }

  // ═══════════════════════════════════════════════
  // ゲームロジック
  // ═══════════════════════════════════════════════

  // プレイヤー移動（Tween）
  movePlayer(districtId) {
    const target = this.districts[districtId];
    if (!target) return;

    const tweenCfg = (obj, x, y) => ({
      targets: obj,
      x,
      y,
      duration: 300,
      ease: "Power2",
    });

    this.tweens.add(tweenCfg(this.player, target.center.x, target.center.y));
    this.tweens.add(tweenCfg(this.playerLabel, target.center.x, target.center.y - 20));
    this.currentDistrictId = districtId;
  }

  // 陣地占領
  claimDistrict(districtId, owner) {
    const target = this.districts[districtId];
    if (!target) return;
    target.owner = owner;
    this._redrawDistrict(target, owner === "player" ? COLOR.PLAYER : COLOR.ENEMY);
    this.showLog(`✅ 「${target.name}」を占領！`);

    // TODOを置き換え。Reactへ占領イベントを飛ばし、ReactからSocket.IOへ送ってもらう
    window.dispatchEvent(
      new CustomEvent("phaser:territoryClaimed", {
        detail: { districtId, owner },
      }),
    );
  }

 // ③ バトル結果を React へ通知
startBattle(targetDistrictId) {
  const enemyStats = { atk: 45, def: 50 };
  const myFinalAtk = this.playerStats.atk * this.playerStats.faith;
  const winRate    = myFinalAtk / (myFinalAtk + enemyStats.def);
  const winPercent = Math.round(winRate * 100);

  this.showLog(`⚔ バトル！ 予測勝率: ${winPercent}%`);

  this.time.delayedCall(300, () => {
    if (Math.random() < winRate) {
      this.showLog(`🎉 勝利！ 地区${targetDistrictId}を制圧`);
      this.movePlayer(targetDistrictId);
      this.claimDistrict(targetDistrictId, "player");

      window.dispatchEvent(
        new CustomEvent("battleResult", {
          detail: { result: "win", districtId: targetDistrictId, winPercent },
        })
      );
    } else {
      const damage = Math.floor(enemyStats.atk * 0.5);
      this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);
      this.showLog(`💀 敗北… HP -${damage} (残HP: ${this.playerStats.hp})`);
      this.updateStatusHUD(); // ← ここで statsUpdated も一緒に飛ぶ

      window.dispatchEvent(
        new CustomEvent("battleResult", {
          detail: {
            result:    "lose",
            damage,
            remainHp:  this.playerStats.hp,
            winPercent,
          },
        })
      );

      if (this.playerStats.hp <= 0) this.respawnPlayer();
    }
  });
}

  // リスポーン
  respawnPlayer() {
    this.showLog("💫 リスポーン！ 初期拠点へ戻ります");
    this.playerStats = { ...INITIAL_PLAYER_STATS };
    this.movePlayer(this.START_DISTRICT_ID);
    this.updateStatusHUD();
  }

  // ═══════════════════════════════════════════════
  // ユーティリティ
  // ═══════════════════════════════════════════════

  // ワールド座標からどの地区かを返す
  _getDistrictAtPoint(worldX, worldY) {
    const point = { x: worldX, y: worldY };
    for (const [id, district] of Object.entries(this.districts)) {
      if (pointInPolygon(point, district.polygon)) {
        return Number(id);
      }
    }
    return null;
  }

  // ポリゴンの重心を計算
  _calcPolygonCenter(polygon) {
    const sumX = polygon.reduce((s, p) => s + p.x, 0);
    const sumY = polygon.reduce((s, p) => s + p.y, 0);
    return { x: sumX / polygon.length, y: sumY / polygon.length };
  }

  // React へのステータス通知を追加
  updateStatusHUD() {
    const s = this.playerStats;
    this.statusText?.setText(
      `HP:${s.hp}  ATK:${s.atk}  DEF:${s.def}  AP:${s.ap}  信仰:${s.faith.toFixed(1)}`,
    );
    // React HUD へ通知
  window.dispatchEvent(
    new CustomEvent("statsUpdated", {
      detail: { hp: s.hp, atk: s.atk, def: s.def, ap: s.ap, faith: s.faith },
    })
  );
}
  

  // ログ表示
  showLog(message) {
    console.log(`[MainScene] ${message}`);
    this.logText?.setText(message);
  }
}
