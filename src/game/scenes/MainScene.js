import Phaser from "phaser";

const DISTRICTS = [
  { id: 101, name: "歴史保護地区", col: 2, row: 1, color: 0x4a90d9 },
  { id: 102, name: "ダウンタウン・港湾", col: 1, row: 2, color: 0x4a90d9 },
  { id: 103, name: "新都心・ITパーク", col: 3, row: 2, color: 0x4a90d9 },
  { id: 104, name: "山間・アップタウン", col: 2, row: 3, color: 0x4a90d9 },
  { id: 105, name: "ショッピング商業特区", col: 1, row: 3, color: 0x4a90d9 },
];

const CELL_SIZE = 120;
const OFFSET_X = 100;
const OFFSET_Y = 80;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.cells = {};
  }

  create() {
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

      cell.on("pointerdown", () => this.movePlayer(district.id));
      cell.on("pointerover", () => cell.setAlpha(0.8));
      cell.on("pointerout", () => cell.setAlpha(1));
    });

    this.add
      .text(250, 30, "セブ市街地エリア", {
        fontSize: "20px",
        color: "#f1c40f",
      })
      .setOrigin(0.5);

    // プレイヤー初期位置（102番地区）
    const start = this.cells[102];
    this.player = this.add.circle(start.x, start.y, 20, 0xf1c40f).setDepth(1);
    this.playerLabel = this.add
      .text(start.x, start.y - 30, "あきら", {
        fontSize: "12px",
        color: "#f1c40f",
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.currentDistrictId = 102;
  }

  movePlayer(districtId) {
    const target = this.cells[districtId];
    if (!target) return;

    this.tweens.add({
      targets: this.player,
      x: target.x,
      y: target.y,
      duration: 300,
      ease: "Power2",
    });

    this.tweens.add({
      targets: this.playerLabel,
      x: target.x,
      y: target.y - 30,
      duration: 300,
      ease: "Power2",
    });

    target.cell.setFillStyle(0xe74c3c);
    target.owner = "player";
    this.currentDistrictId = districtId;

    console.log(`移動: 地区${districtId} ${target.district.name}`);
  }
}
