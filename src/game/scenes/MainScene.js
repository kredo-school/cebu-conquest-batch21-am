import Phaser from 'phaser';
import { EventBus } from '../EventBus'; // 1. EventBusをインポート

const DISTRICTS = [
  { id: 101, name: '歴史保護地区', col: 2, row: 1, color: 0x4a90d9, buff: 'スタミナ回復UP' },
  { id: 102, name: 'ダウンタウン・港湾', col: 1, row: 2, color: 0x4a90d9, buff: '防御力+30%' },
  { id: 103, name: '新都心・ITパーク', col: 3, row: 2, color: 0x4a90d9, buff: '視野拡大' },
  { id: 104, name: '山間・アップタウン', col: 2, row: 3, color: 0x4a90d9, buff: '最大HPアップ' },
  { id: 105, name: 'ショッピング商業特区', col: 1, row: 3, color: 0x4a90d9, buff: '攻撃力UP' },
];

const CELL_SIZE = 120;
const OFFSET_X = 100;
const OFFSET_Y = 80;

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.cells = {};
  }

  create() {
    DISTRICTS.forEach(district => {
      const x = OFFSET_X + district.col * CELL_SIZE;
      const y = OFFSET_Y + district.row * CELL_SIZE;

      const cell = this.add.rectangle(x, y, CELL_SIZE - 8, CELL_SIZE - 8, district.color)
        .setInteractive()
        .setStrokeStyle(2, 0xffffff);

      this.add.text(x, y, district.name, {
        fontSize: '11px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: CELL_SIZE - 16 }
      }).setOrigin(0.5);

      this.cells[district.id] = { cell, x, y, district, owner: null };

      // 2. クリック時にReactへ通知を送る [cite: 30, 102]
      cell.on('pointerdown', () => {
        console.log(`地区選択: ${district.name}`);
        EventBus.emit('territory-selected', district); // React側のUIを開く
      });

      cell.on('pointerover', () => cell.setAlpha(0.8));
      cell.on('pointerout', () => cell.setAlpha(1));
    });

    // 3. React側からのコマンド（攻撃/Stay）を待受ける [cite: 32, 102]
    EventBus.on('react-command-action', (data) => {
      console.log("Reactからの命令を受信:", data);
      if (data.type === 'attack') {
        this.movePlayer(data.id);
      }
    });

    this.add.text(250, 30, 'セブ市街地エリア', { fontSize: '20px', color: '#f1c40f' }).setOrigin(0.5);

    const start = this.cells[102];
    this.player = this.add.circle(start.x, start.y, 20, 0xf1c40f).setDepth(1);
    this.playerLabel = this.add.text(start.x, start.y - 30, 'あきら', { fontSize: '12px', color: '#f1c40f' }).setOrigin(0.5).setDepth(1);
    this.currentDistrictId = 102;

    // ゲーム起動完了通知
    EventBus.emit('current-game-ready', this);
  }

  movePlayer(districtId) {
    const target = this.cells[districtId];
    if (!target) return;

    // 移動アニメーション
    this.tweens.add({
      targets: [this.player, this.playerLabel],
      x: target.x,
      y: (target) => target === this.playerLabel ? target.y - 30 : target.y, // ラベルのオフセット維持
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // 4. 到着後に色を変える（占領処理） [cite: 1, 24]
        target.cell.setFillStyle(0xe74c3c);
        target.owner = 'player';
        this.currentDistrictId = districtId;
      }
    });
  }
}