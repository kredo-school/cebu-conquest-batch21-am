import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../../../shared/socketEvents.js";
import { PHASER_TO_REACT, REACT_TO_PHASER } from "../events/PhaserBridge";
import { MAP_CONFIG } from "../config/mapConfig";

const MAP_SCALE = 0.12;

const COLOR = {
  NEUTRAL: 0x95a5a6,
  HIGHLIGHT: 0xffff00,
  PLAYER_DOT: 0xf1c40f,
  ENEMY_DOT: 0x2ecc71,
  TEAM_RED: 0xff4d4d,
  TEAM_BLUE: 0x00ffff,
};

// 🚀 以前の定義（101系）
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

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.districts = {};
    this.playerStats = { hp: 100, stamina: 100, blessing: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this._dragMoved = false;
    this.otherPlayers = {};
    this.isSelectionMode = true;
  }

  preload() {
    // 設定ファイルから現在のマップ情報を取得
    const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];

    // 複数のタイルセットをループで一括ロード
    if (config.tilesets && config.tilesets.length > 0) {
      config.tilesets.forEach((ts) => {
        this.load.image(ts.key, ts.path);
      });
    }

    // マップデータのロード
    this.load.tilemapTiledJSON(config.key, config.path);
  }

  create() {
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this._setupCamera();
    this._initSocket();
    this._setupReactListeners();
    this.updateStatusToReact();
  }

  

  _setupReactListeners() {
    const handlers = [
      { event: "ACTION_STAY", handler: () => this.showLog("🧘 休息中...") },
      {
        event: "MAP_REPAINT",
        handler: (e) => {
          if (e.detail.districts && e.detail.players) {
            this._syncDistricts(e.detail.districts, e.detail.players);
          }
        },
      },
      {
        event: REACT_TO_PHASER?.COMMAND_DEPLOY_CONFIRM || "COMMAND_DEPLOY_CONFIRM",
        handler: (e) => this.confirmDeployment(Number(e.detail.districtId)),
      },
    ];
    handlers.forEach(({ event, handler }) => window.addEventListener(event, handler));
    this._reactListeners = handlers;
  }

  _onMapClicked(x, y) {
    if (this._dragMoved) return;
    const worldPoint = this.cameras.main.getWorldPoint(x, y);
    const id = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
    if (!id) return;

    const store = window.useGameStore?.getState();
    if (!store) return;

    if (this.isSelectionMode) {
      Object.values(this.districts).forEach((d) => this._redrawDistrict(d, COLOR.NEUTRAL));
      this._redrawDistrict(this.districts[id], COLOR.HIGHLIGHT, 0.8);
      store.setStatus({ selectedDistrictId: id, currentDistrictName: this.districts[id].name });
    } else {
      const myPos = Number(this.currentDistrictId);
      const targetId = Number(id);
      const neighbors = ADJACENCY[myPos] || [];

      console.log(
        `📍 [以前の定義を使用] 現在地: ${myPos}, クリック: ${targetId}, 隣接: ${neighbors}`,
      );

      // 🚀 隣接チェック または 隣接リストがまだ設定されていない場合（17, 18番など）
      if (neighbors.includes(targetId) || (myPos < 100 && targetId < 100)) {
        this.showLog(`🎯 ターゲット確認：${this.districts[targetId].name}`);

        // React側へ「勝率予測モーダルを開け」と命令
        if (typeof store.openPrediction === "function") {
          store.openPrediction(targetId, this.districts[targetId].name);
        }

        // UIのハイライト更新
        Object.values(this.districts).forEach((d) => {
          let baseCol =
            d.owner === "red"
              ? COLOR.TEAM_RED
              : d.owner === "blue"
                ? COLOR.TEAM_BLUE
                : COLOR.NEUTRAL;
          this._redrawDistrict(d, baseCol);
        });
        this._redrawDistrict(this.districts[targetId], COLOR.HIGHLIGHT, 0.8);
      } else {
        this.showLog("⚠️ 隣接する地区しか攻撃できません！");
      }
    }
  }

  confirmDeployment(startId) {
    this.isSelectionMode = false;
    this.currentDistrictId = Number(startId);
    this._placePlayer(this.currentDistrictId);
    const store = window.useGameStore?.getState();
    const team = store?.myTeam || "red";
    const d = this.districts[this.currentDistrictId];
    if (d) {
      d.owner = team;
      this._redrawDistrict(d, team === "red" ? COLOR.TEAM_RED : COLOR.TEAM_BLUE);
    }
  }

  _loadDistrictsFromTMJ() {
    // 読み込みたいオブジェクトレイヤーの名前を配列で全て定義する
    const targetLayers = ["islandName", "areaName", "districtName", "spotName"];

    targetLayers.forEach((layerName) => {
      // Tiledから該当するレイヤーを取得
      const objectLayer = this.tiledMap.getObjectLayer(layerName);

      if (!objectLayer) {
        // Tiled側の名前とズレている場合のデバッグ用警告
        console.warn(`⚠️ オブジェクトレイヤーが見つかりません: ${layerName}`);
        return; // 次のレイヤーの処理へ進む
      }

      objectLayer.objects.forEach((obj) => {
        let districtId = obj.id;

        // Tiledのプロパティ読み込み
        if (obj.properties) {
          if (Array.isArray(obj.properties)) {
            const idProp = obj.properties.find((p) => !isNaN(parseInt(p.name, 10)));
            if (idProp) districtId = parseInt(idProp.name, 10);
          } else {
            districtId = obj.properties.id || obj.properties.districtId || districtId;
          }
        }

        // Tiledで描いたポリゴン座標をゲーム内のスケールに合わせる
        const poly = (obj.polygon || []).map((p) => ({
          x: (obj.x + p.x) * MAP_SCALE,
          y: (obj.y + p.y) * MAP_SCALE,
        }));

        // 点や矩形（ポリゴンを持たないオブジェクト）を弾きたい場合はここでチェック
        if (poly.length === 0) return;

        this.districts[districtId] = {
          id: districtId,
          name: obj.name,
          type: layerName, // 💡 後で「これは島？スポット？」と判別できるように種類を持たせておく
          polygon: poly,
          center: this._calcCenter(poly),
          owner: "neutral",
          graphics: this.add.graphics().setDepth(2),
        };

        // 初期状態の枠線を描画
        this._redrawDistrict(this.districts[districtId], COLOR.NEUTRAL, 0);
      });
    });
  }

  _setupTilemap() {
    const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];
    const map = this.make.tilemap({ key: config.key });

    // 全てのタイルセット画像をマップに追加し、配列に格納する
    const allTilesets = config.tilesets.map((ts) => {
      return map.addTilesetImage(ts.name, ts.key);
    });

    // Tiledのデータ内にある「全てのレイヤー」を自動でループして生成・描画する
    this.tileLayers = []; // 今後レイヤーを操作できるように配列に入れておく
    map.layers.forEach((layerData) => {
      const layer = map.createLayer(layerData.name, allTilesets, 0, 0);
      if (layer) {
        layer.setScale(MAP_SCALE);
        this.tileLayers.push(layer);
      }
    });

    this.tiledMap = map;
  }
  _drawDistrictPolygons() {
    const w = this.tiledMap.widthInPixels * MAP_SCALE;
    const h = this.tiledMap.heightInPixels * MAP_SCALE;
    const overlay = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setInteractive();
    overlay.setDepth(1).on("pointerdown", (p) => this._onMapClicked(p.x, p.y));

    Object.values(this.districts).forEach((d) => {
      // レイヤーの種類（type）に応じて文字の基本サイズを変える
      let baseSize = "16px";
      if (d.type === "islandName") baseSize = "36px";
      else if (d.type === "areaName") baseSize = "16px";
      else if (d.type === "districtName") baseSize = "8px";
      else if (d.type === "spotName") baseSize = "8px";

      d.textLabel = this.add
        .text(d.center.x, d.center.y, d.name, {
          fontSize: baseSize,
          color: "#ffffff",
          stroke: "#000",
          strokeThickness: 4,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
    });
  }

  // ズーム倍率に応じて表示するテキストを切り替える
  _updateLabelVisibility() {
    const zoom = this.cameras.main.zoom;

    Object.values(this.districts).forEach((d) => {
      if (!d.textLabel) return;

      let isVisible = false;

      // ここが切り替えの「閾値（しきいち）」です。テストしながら気持ちいい数値に調整してください！
      if (zoom < 1.5 && d.type === "islandName") {
        isVisible = true;
      } else if (zoom >= 1.5 && zoom < 2.5 && d.type === "areaName") {
        isVisible = true;
      } else if (zoom >= 2.5 && zoom < 3.5 && d.type === "districtName") {
        isVisible = true;
      } else if (zoom >= 3.5 && d.type === "spotName") {
        isVisible = true;
      }

      d.textLabel.setVisible(isVisible);
    });
  }

  // 小さな陣地（スポットなど）の当たり判定を優先する
  _getDistrictAtPoint(x, y) {
    let hitId = null;
    let highestPriority = 0;

    // レイヤーの種類によって「当たり判定の強さ（優先度）」を決める（数字が大きいほど強い）
    const priority = {
      spotName: 4,
      districtName: 3,
      areaName: 2,
      islandName: 1,
    };

    for (const d of Object.values(this.districts)) {
      if (pointInPolygon({ x, y }, d.polygon)) {
        const p = priority[d.type] || 0;

        // 今見つかっている陣地よりも、新しく見つけた陣地の方が優先度が高ければ（小さければ）上書きする
        if (p > highestPriority) {
          hitId = d.id;
          highestPriority = p;
        }
      }
    }

    return hitId;
  }

  _redrawDistrict(d, color, alpha = 0) {
    if (!d || !d.graphics) return;
    d.graphics.clear();

    // alphaが0より大きい（選択中や、チームカラーが乗っている）場合のみ塗りつぶす
    if (alpha > 0) {
      d.graphics.fillStyle(color, alpha);
    }

    d.graphics.beginPath();
    d.polygon.forEach((p, i) =>
      i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y),
    );
    d.graphics.closePath();

    if (alpha > 0) d.graphics.fillPath();

    // 枠線は常に表示するが、選択中は太く、そうでないときは細くする
    d.graphics.lineStyle(2, 0xffffff, 0.4).strokePath();
  }

  _placePlayer(id) {
    const start = this.districts[id];
    if (!start) return;
    if (this.player) this.player.destroy();
    this.player = this.add
      .circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT)
      .setDepth(10)
      .setStrokeStyle(3, 0x000000);
    this.cameras.main.pan(start.center.x, start.center.y, 600, "Power2");
  }
  _syncDistricts(serverDistricts, serverPlayers) {
    Object.entries(serverDistricts).forEach(([districtId, ownerId]) => {
      const d = this.districts[Number(districtId)];
      if (!d) return;
      const actualTeam = serverPlayers[ownerId] ? serverPlayers[ownerId].team : "neutral";
      if (d.owner !== actualTeam) {
        d.owner = actualTeam;
        this._redrawDistrict(
          d,
          actualTeam === "red"
            ? COLOR.TEAM_RED
            : actualTeam === "blue"
              ? COLOR.TEAM_BLUE
              : COLOR.NEUTRAL,
        );
      }
    });
  }
  _syncPlayers(players) {
    Object.entries(players).forEach(([playerId, data]) => {
      if (playerId === socket.id) return;
      const district = this.districts[Number(data.districtId)];
      if (!district) return;
      if (!this.otherPlayers[playerId]) {
        this.otherPlayers[playerId] = {
          dot: this.add
            .circle(district.center.x, district.center.y, 10, COLOR.ENEMY_DOT)
            .setDepth(3),
        };
      } else {
        this.otherPlayers[playerId].dot.setPosition(district.center.x, district.center.y);
      }
    });
  }
  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (state) => {
      if (!state) return;
      const myData = state.players[socket.id];
      if (myData && myData.isReady) {
        this.isSelectionMode = false;
        this.currentDistrictId = Number(myData.districtId);
      }
      if (state.districts && state.players) {
        this._syncDistricts(state.districts, state.players);
        this._syncPlayers(state.players);
      }
    });
  }
  _calcCenter(p) {
    return {
      x: p.reduce((s, v) => s + v.x, 0) / p.length,
      y: p.reduce((s, v) => s + v.y, 0) / p.length,
    };
  }
  showLog(message) {
    window.dispatchEvent(new CustomEvent("NEW_LOG", { detail: message }));
  }
  updateStatusToReact() {
    const eventName = PHASER_TO_REACT?.STATS_UPDATED || "statsUpdated";
    window.dispatchEvent(new CustomEvent(eventName, { detail: this.playerStats }));
  }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(
      0,
      0,
      this.tiledMap.widthInPixels * MAP_SCALE,
      this.tiledMap.heightInPixels * MAP_SCALE,
    );

    this.input.on("pointerdown", () => {
      this._dragMoved = false;
    });

    this.input.on("pointermove", (p) => {
      if (p.isDown) {
        // ドラッグ中のカメラ移動処理
        if (p.getDistance() > 3) this._dragMoved = true;
        cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
        cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
      } else {
        // ドラッグしていない時＝ホバー時の処理
        const worldPoint = cam.getWorldPoint(p.x, p.y);
        const hoveredId = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);

        // 下記で追加する _updateHoverText メソッドを呼び出す
        this._updateHoverText(hoveredId);
      }
    });

    // マウスホイールでのズーム機能
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      // あきらさん調整済みの感度と限界値！
      const newZoom = cam.zoom - deltaY * 0.0009;
      cam.setZoom(Phaser.Math.Clamp(newZoom, 0.5, 8));
    });
    cam.setZoom(1);
    // ピンチ実装時に追加予定なら今から入れておく
    // cam.zoom = Phaser.Math.Clamp(newZoom, 0.3, 2.0);
    this._updateLabelVisibility();
  }

  _updateHoverText(hoveredId) {
    const zoom = this.cameras.main.zoom;

    Object.values(this.districts).forEach((d) => {
      if (!d.textLabel) return;

      // LODルール：ズームに応じて表示すべきtypeか判定
      let lodVisible = false;
      if (zoom < 1.5 && d.type === "islandName") lodVisible = true;
      else if (zoom >= 1.5 && zoom < 2.5 && d.type === "areaName") lodVisible = true;
      else if (zoom >= 2.5 && zoom < 3.5 && d.type === "districtName") lodVisible = true;
      else if (zoom >= 3.5 && d.type === "spotName") lodVisible = true;

      // ホバーしているものは常に表示（LODを無視して強制表示）
      const isHovered = d.id === hoveredId;
      d.textLabel.setVisible(lodVisible || isHovered);
      d.textLabel.setScale(isHovered ? 1.2 : 1.0);
    });
  }
}
