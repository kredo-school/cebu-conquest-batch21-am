// src/game/scenes/MainScene.js

import Phaser from "phaser";

// ═══════════════════════════════════════════════════
// 地区データ（セブ市街地エリア 5地区）
// ═══════════════════════════════════════════════════
const DISTRICTS = [
  { id: 101, name: "歴史保護地区",       col: 2, row: 1, color: 0x4a90d9 },
  { id: 102, name: "ダウンタウン・港湾",  col: 1, row: 2, color: 0x4a90d9 },
  { id: 103, name: "新都心・ITパーク",   col: 3, row: 2, color: 0x4a90d9 },
  { id: 104, name: "山間・アップタウン",  col: 2, row: 3, color: 0x4a90d9 },
  { id: 105, name: "ショッピング商業特区", col: 1, row: 3, color: 0x4a90d9 },
];

// 隣接グラフ（移動可能な地区の組み合わせ）
const ADJACENCY = {
  101: [102, 103],
  102: [101, 104, 105],
  103: [101, 104],
  104: [102, 103, 105],
  105: [102, 104],
};

// ═══════════════════════════════════════════════════
// 定数
// ═══════════════════════════════════════════════════
const CELL_SIZE   = 120;
const OFFSET_X    = 100;
const OFFSET_Y    = 80;
const START_DISTRICT_ID = 102;

// プレイヤーカラー定義
const COLOR = {
  PLAYER:    0xe74c3c, // 赤（自陣）
  ENEMY:     0x27ae60, // 緑（敵陣）
  NEUTRAL:   0x4a90d9, // 青（空き地）
  PLAYER_UI: "#f1c40f", // 黄（プレイヤーUI）
};

// プレイヤー初期ステータス
const INITIAL_PLAYER_STATS = {
  atk:   50,
  def:   40,
  hp:    100,
  ap:    80,
  faith: 1.0, // 信仰力（バフ乗算の基底値）
};

// ═══════════════════════════════════════════════════
// MainScene
// ═══════════════════════════════════════════════════
export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.cells        = {};   // { [districtId]: { cell, x, y, district, owner } }
    this.playerStats  = { ...INITIAL_PLAYER_STATS };
    this.currentDistrictId = START_DISTRICT_ID;
  }

  // ───────────────────────────────────────────────
  // アセット読み込み
  // ───────────────────────────────────────────────
  preload() {
    // タイルマップ（TSX埋め込み済みのTMJを使用すること）
    // this.load.image('tiles', 'assets/tilesets/Slates.png');
    // this.load.tilemapTiledJSON('map', 'assets/maps/cebu_map_簡易版.tmj');
  }

  // ───────────────────────────────────────────────
  // シーン初期化
  // ───────────────────────────────────────────────
  create() {
    this._drawDistricts();
    this._drawAreaTitle();
    this._placePlayer();
    this._createHUD();
  }

  // ───────────────────────────────────────────────
  // 地区セルの描画
  // ───────────────────────────────────────────────
  _drawDistricts() {
    DISTRICTS.forEach((district) => {
      const x = OFFSET_X + district.col * CELL_SIZE;
      const y = OFFSET_Y + district.row * CELL_SIZE;

      const cell = this.add
        .rectangle(x, y, CELL_SIZE - 8, CELL_SIZE - 8, district.color)
        .setInteractive()
        .setStrokeStyle(2, 0xffffff);

      this.add
        .text(x, y, district.name, {
          fontSize: "11px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: CELL_SIZE - 16 },
        })
        .setOrigin(0.5);

      this.cells[district.id] = { cell, x, y, district, owner: null };

      // イベント登録
      cell.on("pointerdown", () => this.onCellClicked(district.id));
      cell.on("pointerover",  () => cell.setAlpha(0.8));
      cell.on("pointerout",   () => cell.setAlpha(1.0));
    });
  }

  // ───────────────────────────────────────────────
  // エリアタイトル描画
  // ───────────────────────────────────────────────
  _drawAreaTitle() {
    this.add.text(250, 30, "セブ市街地エリア", {
      fontSize: "20px",
      color: COLOR.PLAYER_UI,
    }).setOrigin(0.5);
  }

  // ───────────────────────────────────────────────
  // プレイヤー初期配置
  // ───────────────────────────────────────────────
  _placePlayer() {
    const start = this.cells[START_DISTRICT_ID];

    this.player = this.add
      .circle(start.x, start.y, 20, 0xf1c40f)
      .setDepth(1);

    this.playerLabel = this.add
      .text(start.x, start.y - 30, "あきら", {
        fontSize: "12px",
        color: COLOR.PLAYER_UI,
      })
      .setOrigin(0.5)
      .setDepth(1);

    // 初期拠点を自陣カラーに
    this.cells[START_DISTRICT_ID].owner = "player";
    this.cells[START_DISTRICT_ID].cell.setFillStyle(COLOR.PLAYER);
  }

  // ───────────────────────────────────────────────
  // HUD（ステータス表示 & ログ）の生成
  // ───────────────────────────────────────────────
  _createHUD() {
    this.statusText = this.add
      .text(10, 10, "", { fontSize: "12px", color: "#ffffff" })
      .setDepth(2);
    this.updateStatusHUD();

    this.logText = this.add
      .text(10, 500, "", { fontSize: "11px", color: "#aaffaa" })
      .setDepth(2);
  }

  // ═══════════════════════════════════════════════
  // ゲームロジック
  // ═══════════════════════════════════════════════

  // セルクリック時のハンドラ
  onCellClicked(districtId) {
    if (districtId === this.currentDistrictId) return;

    const neighbors = ADJACENCY[this.currentDistrictId] || [];
    if (!neighbors.includes(districtId)) {
      this.showLog(`⚠ 地区${districtId}へは直接移動できません`);
      return;
    }

    const target = this.cells[districtId];
    if (target.owner === "enemy") {
      this.startBattle(districtId);
    } else {
      // 空き地 → そのまま占領
      this.movePlayer(districtId);
      this.claimDistrict(districtId, "player");
    }
  }

  // プレイヤー移動（Tweenアニメ）
  movePlayer(districtId) {
    const target = this.cells[districtId];
    if (!target) return;

    const tweenConfig = (obj, x, y) => ({
      targets: obj, x, y, duration: 300, ease: "Power2",
    });

    this.tweens.add(tweenConfig(this.player,      target.x,      target.y));
    this.tweens.add(tweenConfig(this.playerLabel, target.x, target.y - 30));

    this.currentDistrictId = districtId;
  }

  // 陣地占領処理
  claimDistrict(districtId, owner) {
    const target = this.cells[districtId];
    target.owner = owner;
    target.cell.setFillStyle(owner === "player" ? COLOR.PLAYER : COLOR.ENEMY);
    this.showLog(`✅ 地区${districtId}「${target.district.name}」を占領！`);

    // TODO: Socket.IO → territoryClaimed イベント送信（けい担当）
    // socket.emit('territoryClaimed', { districtId, owner: 'player' });
  }

  // バトルロジック P = A / (A + D)
  startBattle(targetDistrictId) {
    // TODO: 後でNPCデータから取得
    const enemyStats = { atk: 45, def: 50 };

    const myFinalAtk = this.playerStats.atk * this.playerStats.faith;
    const winRate    = myFinalAtk / (myFinalAtk + enemyStats.def);
    const winPercent = Math.round(winRate * 100);

    this.showLog(`⚔ バトル開始！ 予測勝率: ${winPercent}%`);

    // 300ms後に勝敗確定（演出の間）
    this.time.delayedCall(300, () => {
      if (Math.random() < winRate) {
        this.showLog(`🎉 勝利！ 地区${targetDistrictId}を制圧`);
        this.movePlayer(targetDistrictId);
        this.claimDistrict(targetDistrictId, "player");
      } else {
        const damage = Math.floor(enemyStats.atk * 0.5);
        this.playerStats.hp = Math.max(0, this.playerStats.hp - damage);
        this.showLog(`💀 敗北… HP -${damage} (残HP: ${this.playerStats.hp})`);
        this.updateStatusHUD();

        if (this.playerStats.hp <= 0) this.respawnPlayer();
      }
    });
  }

  // リスポーン処理
  respawnPlayer() {
    this.showLog("💫 リスポーン！ 初期拠点へ戻ります");
    this.playerStats = { ...INITIAL_PLAYER_STATS };
    this.movePlayer(START_DISTRICT_ID);
    this.updateStatusHUD();
  }

  // ═══════════════════════════════════════════════
  // UI更新
  // ═══════════════════════════════════════════════

  updateStatusHUD() {
    const s = this.playerStats;
    this.statusText.setText(
      `HP:${s.hp}  ATK:${s.atk}  DEF:${s.def}  AP:${s.ap}  信仰:${s.faith.toFixed(1)}`
    );
  }

  showLog(message) {
    console.log(`[MainScene] ${message}`);
    this.logText.setText(message);
  }
}