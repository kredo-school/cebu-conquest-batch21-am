import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../../../shared/socketEvents.js";
import { PHASER_TO_REACT, REACT_TO_PHASER, emitToReact } from "../events/PhaserBridge";
import { MAP_CONFIG } from "../config/mapConfig";
import { ADJACENCY } from "../../../shared/adjacency.js";
import {
  GOD_SACRED_LANDS,
  getSacredDistrict,
  getSpawnSpot,
  getGodName,
} from "../../../shared/godSacredLands.js";
import ZoomManager from "./ZoomManager";
import SoundManager from "../SoundManager";
import EffectManager from "../effects/EffectManager";
import CameraController from "../camera/CameraController.js";

const MAP_SCALE = 0.5;

const COLOR = {
  NEUTRAL: 0x95a5a6,
  HIGHLIGHT: 0xffff00,
  ENEMY_DOT: 0xffffff,
  TEAM_RED: 0xff4d4d,
  TEAM_BLUE: 0x00ffff,
};

const normalizeId = (id) => {
  if (id === null || id === undefined || id === "") return null;
  const n = Number(id);
  return isNaN(n) ? null : n;
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
    this.otherPlayers = {};
    this.playerStats = { hp: 100, stamina: 100, faith: 1.0, atk: 50, def: 40 };
    this.currentDistrictId = null;
    this._dragMoved = false;
    this.isSelectionMode = true;
    this._reactListeners = [];
    this._myTeam = null;
    this._pendingTargetId = null;
    this._avatarKey = "god-john";
  }

  preload() {
    const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];
    if (config.tilesets?.length > 0) {
      config.tilesets.forEach((ts) => this.load.image(ts.key, ts.path));
    }
    this.load.tilemapTiledJSON(config.key, config.path);
    this.load.audio("bgm_field", [
      "assets/audio/login-joinroom.ogg",
      "assets/audio/login-joinroom.mp3",
    ]);

    const GOD_IMAGES = [
      { key: "god-john", path: "/assets/images/gods/John.png" },
      { key: "god-garry", path: "/assets/images/gods/Garry.png" },
      { key: "god-quesie", path: "/assets/images/gods/Quesie.png" },
      { key: "god-neil", path: "/assets/images/gods/Neil.png" },
      { key: "god-edo", path: "/assets/images/gods/Edo.png" },
      { key: "god-shem", path: "/assets/images/gods/Shem.png" },
      { key: "god-kurt", path: "/assets/images/gods/Kurt.png" },
      { key: "god-secret", path: "/assets/images/gods/Secret_Rare.png" },
    ];
    GOD_IMAGES.forEach(({ key, path }) => this.load.image(key, path));

    // BGM（game view 中に使うもののみ）
    this.load.audio("bgm_map", "/assets/audio/bgm/bgm_map.mp3");
    this.load.audio("bgm_battle", "/assets/audio/bgm/bgm_battle.mp3");
    // SE
    this.load.audio("se_click", "/assets/audio/se/se_click.mp3");
    this.load.audio("se_move", "/assets/audio/se/se_move.mp3");
    this.load.audio("se_capture", "/assets/audio/se/se_capture.mp3");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x2471a3);
    this.zoomManager = new ZoomManager();
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._drawDistrictPolygons();
    this.bgmField = this.sound.add("bgm_field", {
      loop: true,
      volume: 0.4,
    });
    // ブラウザの自動再生ブロック対策：初回クリック後に再生
    this.input.once("pointerdown", () => {
      if (!this.bgmField.isPlaying) {
        this.bgmField.play();
      }
    });

    // A-2: CameraController に置き換え
    this.cameraController = new CameraController(this);
    this.cameraController.setup(this.tiledMap, MAP_SCALE);
    this.cameraController.onZoomChanged((zoom) => {
      this._updateLabelVisibility();
      emitToReact(PHASER_TO_REACT.ZOOM_UPDATED, { zoom });
    });
    this.cameraController.onHoverChanged((worldPoint) => {
      const hoveredId = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
      this._updateHoverText(hoveredId);
    });

    this._setupPointerInput();
    this._initSocket();
    this._setupReactListeners();
    this._setupKeyboard();
    this.updateStatusToReact();
    SoundManager.setScene(this);
    SoundManager.playBgm("map");
    this.effectManager = new EffectManager(this);
  }

  update() {
    this.zoomManager.tick(this.cameras.main.zoom, this.districts);
    // A-2: _handleCameraKeyboard を CameraController.update に置き換え
    this.cameraController?.update();
  }

  // 🚀 リスナー統合版（重複を削除してクリーンアップ）
  // ═══════════════════════════════════════════════
  // 神聖地占領処理
  // ═══════════════════════════════════════════════

  /**
   * 神選択時に聖地districtを自陣カラーで占領表示する
   * GDD v3.1 §3-1 に基づき、神ごとの聖地を自動占領
   * @param {number} godId - 1〜8（GOD_SACRED_LANDS のキー）
   */
  _claimSacredLand(godId) {
    const sacredDistrictId = getSacredDistrict(godId);
    if (sacredDistrictId == null) {
      console.warn(`[MainScene] godId=${godId} に対応する聖地が見つかりません`);
      return;
    }

    const district = this.districts[sacredDistrictId];
    if (!district) {
      console.warn(
        `[MainScene] district ${sacredDistrictId} が描画されていません。` +
          `TMJのdistrictNameレイヤーにIDが存在するか確認してください`,
      );
      return;
    }

    // チームカラー判定（_myTeamが未確定の場合は赤を暫定使用）
    const teamColor = this._myTeam === "blue" ? COLOR.TEAM_BLUE : COLOR.TEAM_RED;

    // 自陣カラーで塗りつぶす
    district.polygon.setFillStyle(teamColor, 0.6);
    district.owner = "me";
    this._sacredDistrictId = sacredDistrictId; // 後続処理用に保持

    this.showLog(`⛩️ ${getGodName(godId)} の聖地（地区${sacredDistrictId}）を獲得！`);

    // Reactへ占領通知（HUD・ミニマップ更新用）
    emitToReact(PHASER_TO_REACT.TERRITORY_CLAIMED, {
      districtId: sacredDistrictId,
      owner: "me",
      team: this._myTeam,
    });
  }

  _setupReactListeners() {
    const handlers = [
      {
        event: REACT_TO_PHASER.COMMAND_DEPLOY_CONFIRM,
        handler: (e) => {
          this.isSelectionMode = false;

          // 🚀 startDistrictId（GDD v3.1 仕様）または互換用 districtId の両対応
          const rawId = normalizeId(e.detail.startDistrictId ?? e.detail.districtId);
          if (rawId == null) {
            console.error("[MainScene] startDistrictId が不正です", e.detail);
            return;
          }

          // 5桁ならspot_id → district_idに変換（上3桁を取得）
          // 例: 14101（spot） → 141（district）
          const districtId = rawId >= 10000 ? Math.floor(rawId / 100) : rawId;

          // 聖地と一致するなら追加占領処理は不要（Step3で既に塗布済み）
          if (this._sacredDistrictId !== districtId) {
            console.warn(
              `[MainScene] deployment district(${districtId}) と聖地(${this._sacredDistrictId}) が不一致。` +
                `通常占領フローで処理します`,
            );
          }

          this.currentDistrictId = districtId;
          this._placePlayer(districtId);
          SoundManager.playSe("move");
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_STAY,
        handler: () => {
          this.showLog("🧘 休息中...");
          socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, { type: "stay" });
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_ATTACK,
        handler: (e) => {
          const targetId = e.detail?.targetId;
          if (!targetId) return;
          this._pendingTargetId = normalizeId(targetId);
          socket.emit(CLIENT_EVENTS.ACTION_SUBMIT, {
            type: "attack",
            targetId: this._pendingTargetId,
          });
          SoundManager.playBgm("battle");
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_ESCAPE,
        handler: () => {
          socket.emit(CLIENT_EVENTS.ACTION_ESCAPE);
          this.showLog("🏃 逃走中...");
        },
      },
      {
        event: REACT_TO_PHASER.COMMAND_DEFEND,
        handler: () => {
          socket.emit(CLIENT_EVENTS.ACTION_DEFEND);
          this.showLog("🛡️ 防御中...");
        },
      },
      {
        event: REACT_TO_PHASER.MAP_REPAINT,
        handler: (e) => {
          if (e.detail.districts && e.detail.players) {
            this._syncDistricts(e.detail.districts, e.detail.players);
          }
        },
      },
      {
        event: REACT_TO_PHASER.SET_AVATAR,
        handler: (e) => {
          const { godKey, godId } = e.detail || {};

          // アバター画像キーの更新
          if (godKey) {
            this._avatarKey = godKey;
            // プレイヤースプライトが既に存在すれば差し替え
            if (this.player && this.textures.exists(godKey)) {
              this.player.setTexture(godKey);
            }
          }

          // 🚀 神に対応する聖地を自陣カラーで先塗り
          if (godId != null) {
            this._claimSacredLand(godId);
          }
        },
      },
    ];

    handlers.forEach(({ event, handler }) => window.addEventListener(event, handler));
    this._reactListeners = handlers;
  }

  shutdown() {
    this._reactListeners?.forEach(({ event, handler }) =>
      window.removeEventListener(event, handler),
    );
    SoundManager.clearScene();
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (s) => {
      if (!s) return;
      this._syncDistricts(s.districts, s.players);
      this._syncPlayers(s.players);
    });
    socket.on(SERVER_EVENTS.GAME_START, (s) => {
      if (!s) return;
      if (s.districts && s.players) {
        this._syncDistricts(s.districts, s.players);
        this._syncPlayers(s.players);
      }
    });
    socket.on(SERVER_EVENTS.TURN_START, (data) => {
      emitToReact(PHASER_TO_REACT.TURN_START, data ?? {});
      const msg =
        data?.turnOwnerId === socket.id
          ? "🎯 あなたのターンです！"
          : `⏳ ${data?.turnOwnerName || "相手"}のターンです`;
      this.showLog(msg);
    });
    socket.on(SERVER_EVENTS.ACTION_RESULT, (data) => {
      if (!data) return;
      if (data.stats) {
        Object.assign(this.playerStats, data.stats);
        this.updateStatusToReact();
      }
      if (data.message) this.showLog(data.message);
      if (this._pendingTargetId !== null) {
        const attacker = this.districts[this.currentDistrictId];
        const target = this.districts[this._pendingTargetId];
        if (attacker) this.effectManager.playSlashEffect(attacker.center.x, attacker.center.y);
        if (target) this.effectManager.playExplosionEffect(target.center.x, target.center.y);
        this._pendingTargetId = null;
      }
      // バトル結果受信後、マップBGMへ戻す（2秒の余韻を持たせる）
      this.time.delayedCall(2000, () => SoundManager.playBgm("map"));
    });
  }

  _setupTilemap() {
    const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];
    const map = this.make.tilemap({ key: config.key });
    const tilesetList = config.tilesets ?? [{ name: config.tilesetName, key: config.tilesetKey }];
    const allTilesets = tilesetList.map((ts) => map.addTilesetImage(ts.name, ts.key));
    map.layers.forEach((layer) => {
      const l = map.createLayer(layer.name, allTilesets, 0, 0);
      if (l) l.setScale(MAP_SCALE);
    });
    this.tiledMap = map;
  }

  _loadDistrictsFromTMJ() {
    const targetLayers = ["islandName", "areaName", "districtName", "spotName"];
    targetLayers.forEach((layerName) => {
      const objectLayer = this.tiledMap.getObjectLayer(layerName);
      if (!objectLayer) return;
      objectLayer.objects.forEach((obj) => {
        const rawId = obj.properties?.[0]?.name ?? obj.id;
        const districtId = normalizeId(rawId);
        if (!districtId) return;

        const poly = (obj.polygon || []).map((p) => ({
          x: (obj.x + p.x) * MAP_SCALE,
          y: (obj.y + p.y) * MAP_SCALE,
        }));
        if (poly.length === 0) return;

        this.districts[districtId] = {
          id: districtId,
          name: obj.name,
          type: layerName,
          polygon: poly,
          center: {
            x: poly.reduce((s, v) => s + v.x, 0) / poly.length,
            y: poly.reduce((s, v) => s + v.y, 0) / poly.length,
          },
          owner: "neutral",
          graphics: this.add.graphics().setDepth(2),
        };
        this._redrawDistrict(this.districts[districtId], COLOR.NEUTRAL, 0);
      });
    });

    if (import.meta.env.DEV) {
      const summary = {};
      Object.values(this.districts).forEach((d) => {
        summary[d.type] = summary[d.type] ?? [];
        summary[d.type].push(d.id);
      });
      console.log("[TMJ] ロード結果:", summary);
      console.log("[TMJ] 合計:", Object.keys(this.districts).length, "オブジェクト");
    }
  }

  _drawDistrictPolygons() {
    const w = this.tiledMap.widthInPixels * MAP_SCALE;
    const h = this.tiledMap.heightInPixels * MAP_SCALE;
    // クリックは _setupPointerInput の scene.input.on('pointerup') で一元処理
    this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setDepth(1);

    const sizeByType = {
      islandName: "36px",
      areaName: "18px",
      districtName: "12px",
      spotName: "10px",
    };
    Object.values(this.districts).forEach((d) => {
      d.textLabel = this.add
        .text(d.center.x, d.center.y, d.name, {
          fontSize: sizeByType[d.type] ?? "16px",
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

  // ─── ポインター入力（優先順位: spot > district > area）──────────

  _setupPointerInput() {
    // pointerup で判定（pointerdown では _dragMoved がまだ確定していないため）
    this.input.on("pointerup", (pointer) => {
      if (this._dragMoved) return;

      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // 優先順位: spot > district > area > island
      const hitSpot = this._findObjectAt("spotName", worldX, worldY);
      if (hitSpot) {
        this._handleSpotClick(hitSpot);
        return;
      }

      const hitDistrict = this._findObjectAt("districtName", worldX, worldY);
      if (hitDistrict) {
        this._handleDistrictClick(hitDistrict);
        return;
      }

      // area / island は現状クリック対象外
      // 必要になったら以下を有効化：
      // const hitArea = this._findObjectAt('areaName', worldX, worldY);
      // if (hitArea) { this._handleAreaClick(hitArea); return; }
    });
  }

  _handleSpotClick(spotObj) {
    // TMJ properties[0].name がスポットID（文字列 → Number に正規化）
    const spotId = normalizeId(spotObj.properties?.[0]?.name ?? spotObj.id);
    if (spotId == null) return;

    const d = this.districts[spotId];
    if (import.meta.env.DEV) console.log("[hit] spot:", spotId, spotObj.name);

    if (this.isSelectionMode) {
      // ── 初期スポット選択フェーズ ──
      SoundManager.playSe("click");
      Object.values(this.districts).forEach((dist) => this._redrawDistrict(dist, COLOR.NEUTRAL));
      this._redrawDistrict(d, COLOR.HIGHLIGHT, 0.8);

      emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
        districtId: spotId,
        districtName: d?.name ?? String(spotId),
      });
    } else {
      // ── プレイ中：移動・攻撃フェーズ ──
      if (spotId === this.currentDistrictId) return;

      const neighbors = ADJACENCY[this.currentDistrictId] ?? [];
      if (!neighbors.includes(spotId)) {
        this.showLog("⚠️ 隣接していないスポットには行動できません。");
        return;
      }

      SoundManager.playSe("click");
      this._pendingTargetId = spotId;

      const targetOwner = (d?.owner ?? "neutral").toLowerCase();
      const isMyTerritory = targetOwner === this._myTeam;
      const isNeutral = targetOwner === "neutral";

      emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
        districtId: spotId,
        districtName: d?.name ?? String(spotId),
        isMyTerritory,
        isNeutral,
      });

      this.showLog(isMyTerritory ? `🚚 移動先: ${d?.name}` : `🎯 攻撃対象: ${d?.name}`);
    }
  }

  _handleDistrictClick(districtObj) {
    const districtId = normalizeId(districtObj.properties?.[0]?.name ?? districtObj.id);
    if (districtId == null) return;

    const d = this.districts[districtId];
    if (import.meta.env.DEV) console.log("[hit] district:", districtId, districtObj.name);

    const owner = (d?.owner ?? "neutral").toLowerCase();
    emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
      districtId,
      districtName: d?.name ?? String(districtId),
      isMyTerritory: owner === this._myTeam,
      isNeutral: owner === "neutral",
    });
  }

  _getDistrictAtPoint(x, y) {
    let hitId = null;
    let highestPriority = 0;
    const priority = { spotName: 4, districtName: 3, areaName: 2, islandName: 1 };
    for (const d of Object.values(this.districts)) {
      if (pointInPolygon({ x, y }, d.polygon)) {
        const p = priority[d.type] || 0;
        if (p > highestPriority) {
          hitId = d.id;
          highestPriority = p;
        }
      }
    }
    return hitId;
  }

  /**
   * 指定レイヤー上で worldX/worldY にヒットするオブジェクトを返す。
   * @param {string} layerName - TMJのobjectレイヤー名
   * @param {number} worldX
   * @param {number} worldY
   * @returns {Phaser.Types.Tilemaps.TiledObject | null}
   */
  _findObjectAt(layerName, worldX, worldY) {
    const layer = this.tiledMap.getObjectLayer(layerName);
    if (!layer) {
      if (import.meta.env.DEV) console.warn(`[MainScene] objectLayer not found: ${layerName}`);
      return null;
    }

    for (const obj of layer.objects) {
      if (obj.polygon) {
        // ポリゴン座標はTMJ上の値なのでMAP_SCALEを適用してワールド座標に合わせる
        const points = obj.polygon.map((p) => ({
          x: (obj.x + p.x) * MAP_SCALE,
          y: (obj.y + p.y) * MAP_SCALE,
        }));
        const polygon = new Phaser.Geom.Polygon(points);
        if (Phaser.Geom.Polygon.Contains(polygon, worldX, worldY)) {
          return obj;
        }
        continue;
      }

      if (obj.width && obj.height) {
        const rect = new Phaser.Geom.Rectangle(
          obj.x * MAP_SCALE,
          obj.y * MAP_SCALE,
          obj.width * MAP_SCALE,
          obj.height * MAP_SCALE,
        );
        if (Phaser.Geom.Rectangle.Contains(rect, worldX, worldY)) {
          return obj;
        }
      }
    }
    return null;
  }

  _redrawDistrict(d, color, alpha = 0) {
    if (!d || !d.graphics) return;
    d.graphics.clear();
    if (alpha > 0) d.graphics.fillStyle(color, alpha);
    d.graphics.beginPath();
    d.polygon.forEach((p, i) =>
      i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y),
    );
    d.graphics.closePath();
    if (alpha > 0) d.graphics.fillPath();
    d.graphics.lineStyle(2, 0xffffff, 0.4).strokePath();
  }

  _placePlayer(id) {
    const d = this.districts[normalizeId(id)];
    if (!d) return;
    if (this.player) this.player.destroy();

    // 画像ごとにサイズが異なる場合でも中央正方形をクロップして 48×48 に表示
    const src = this.textures.get(this._avatarKey).getSourceImage();
    const size = Math.min(src.width, src.height);
    const cropX = Math.floor((src.width - size) / 2);
    const cropY = Math.floor((src.height - size) / 2);

    this.player = this.add
      .image(d.center.x, d.center.y, this._avatarKey)
      .setCrop(cropX, cropY, size, size)
      .setDisplaySize(48, 48)
      .setDepth(1000);

    // A-2: pan の代わりに startFollow で滑らかに追従
    if (!this.isSelectionMode) {
      this.cameraController?.follow(this.player);
    } else {
      // 選択フェーズ中は追従せずに pan のみ（既存挙動維持）
      this.cameras.main.pan(d.center.x, d.center.y, 600, "Power2");
    }
  }

  _syncDistricts(serverDistricts, serverPlayers) {
    Object.entries(serverDistricts).forEach(([dId, ownerId]) => {
      const d = this.districts[normalizeId(dId)];
      if (!d) {
        if (import.meta.env.DEV) {
          console.warn(
            `[_syncDistricts] district ${dId} not found in Phaser. Available:`,
            Object.keys(this.districts).slice(0, 5),
          );
        }
        return;
      }
      const playerData = ownerId ? serverPlayers[ownerId] : null;
      const team = playerData?.team?.toLowerCase() ?? "neutral";
      if (
        !this.isSelectionMode &&
        this._myTeam &&
        team === this._myTeam &&
        d.owner !== this._myTeam
      ) {
        SoundManager.playSe("capture");
        this.effectManager?.playCapturePopup(d.center.x, d.center.y);
      }
      d.owner = team;
      const col =
        team === "red" ? COLOR.TEAM_RED : team === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL;
      this._redrawDistrict(d, col, team === "neutral" ? 0 : 0.7);
    });
  }

  _syncPlayers(players) {
    Object.values(this.otherPlayers).forEach((p) => {
      if (p.dot) p.dot.destroy();
      if (p.label) p.label.destroy();
    });
    this.otherPlayers = {};

    Object.entries(players).forEach(([playerId, data]) => {
      const rawId =
        data.spotId ?? // サーバーが spotId を返す場合
        data.districtId ?? // 後方互換（旧フィールド名）
        data.currentDistrict ?? // 後方互換
        data.pos; // 最終フォールバック
      const dId = normalizeId(rawId);

      if (!dId) {
        if (import.meta.env.DEV) {
          console.warn(
            `[MainScene] Player ${playerId} (${data.username}) has no valid districtId:`,
            data,
          );
        }
        return;
      }

      if (playerId === socket.id) {
        this._myTeam = data.team?.toLowerCase() ?? null;
        this.currentDistrictId = dId;
        this._placePlayer(dId);
        this.isSelectionMode = false;
        return;
      }

      const d = this.districts[dId];
      if (d && d.center) {
        const isNpc = data.isNpc === true;
        const dotColor = isNpc ? 0xff00ff : COLOR.ENEMY_DOT;

        const dot = this.add
          .circle(d.center.x, d.center.y, 16, dotColor)
          .setDepth(900)
          .setStrokeStyle(5, 0x000000);

        let label = null;
        if (isNpc) {
          label = this.add
            .text(d.center.x, d.center.y - 24, "🤖", {
              fontSize: "16px",
              stroke: "#000",
              strokeThickness: 2,
            })
            .setOrigin(0.5)
            .setDepth(901);
        }

        this.otherPlayers[playerId] = { dot, label };
      } else if (import.meta.env.DEV) {
        console.warn(`[MainScene] District ${dId} not found for player ${playerId}`);
      }
    });
  }

  _updateLabelVisibility() {
    // ZoomManager に LOD 判定を委譲（ロジック重複を排除）
    const zoom = this.cameras.main.zoom;
    const lod = this.zoomManager.getLodType(zoom);
    Object.values(this.districts).forEach((d) => {
      if (d.textLabel) d.textLabel.setVisible(d.type === lod);
    });
  }

  _updateHoverText(hoveredId) {
    // ラベル更新は ZoomManager に一本化（二重更新を排除）
    if (this.zoomManager) this.zoomManager.setHover(hoveredId, this.districts);
  }

  showLog(message) {
    if (!message) return;
    emitToReact(PHASER_TO_REACT.GAME_LOG, message);
  }

  updateStatusToReact() {
    emitToReact(PHASER_TO_REACT.STATS_UPDATED, this.playerStats);
  }

  // ─── キーボード操作 ───────────────────────────

  _setupKeyboard() {
    // 行動キー（プレイフェーズのみ有効）
    // カーソル・WASD・ズームキーは CameraController が担当
    this.input.keyboard.on("keydown-SPACE", () => this._handleKeyAction("stay"));
    this.input.keyboard.on("keydown-S", () => this._handleKeyAction("stay"));
    this.input.keyboard.on("keydown-A", () => this._handleKeyAction("attack"));
    this.input.keyboard.on("keydown-D", () => this._handleKeyAction("defend"));
    this.input.keyboard.on("keydown-E", () => this._handleKeyAction("escape"));

    if (import.meta.env.DEV) this._setupDevKeys();
  }

  // ─── 開発用テストキー（npm run dev 時のみ有効） ──────────────────
  // F1: 斬撃エフェクト  F2: 爆発エフェクト  F3: 占領ポップアップ
  // F4: プレイヤーをランダム地区にスポーン（単体起動テスト用）
  _setupDevKeys() {
    const _center = () => {
      const cam = this.cameras.main;
      return cam.getWorldPoint(cam.width / 2, cam.height / 2);
    };

    this.input.keyboard.on("keydown-F1", () => {
      const { x, y } = _center();
      this.effectManager.playSlashEffect(x, y);
      this.showLog("[DEV] 斬撃エフェクト (F1)");
    });

    this.input.keyboard.on("keydown-F2", () => {
      const { x, y } = _center();
      this.effectManager.playExplosionEffect(x, y);
      this.showLog("[DEV] 爆発エフェクト (F2)");
    });

    this.input.keyboard.on("keydown-F3", () => {
      const { x, y } = _center();
      this.effectManager.playCapturePopup(x, y);
      this.showLog("[DEV] 占領ポップアップ (F3)");
    });

    this.input.keyboard.on("keydown-F4", () => {
      const spotDistricts = Object.values(this.districts).filter((d) => d.type === "spotName");
      if (spotDistricts.length === 0) return;
      const d = spotDistricts[Math.floor(Math.random() * spotDistricts.length)];
      this.isSelectionMode = false;
      this._myTeam = "red";
      this.currentDistrictId = d.id;
      this._placePlayer(d.id);
      this.showLog(`[DEV] スポーン: ${d.name} (F4)`);
    });
  }

  _handleKeyAction(type) {
    const focused = document.activeElement;
    if (focused?.tagName === "INPUT" || focused?.tagName === "TEXTAREA") return;
    if (this.isSelectionMode) return;

    switch (type) {
      case "stay":
        window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_STAY));
        break;
      case "attack":
        if (this._pendingTargetId != null) {
          window.dispatchEvent(
            new CustomEvent(REACT_TO_PHASER.COMMAND_ATTACK, {
              detail: { targetId: this._pendingTargetId },
            }),
          );
        } else {
          this.showLog("⚠️ 攻撃対象を先にタップして選択してください");
        }
        break;
      case "defend":
        window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_DEFEND));
        break;
      case "escape":
        window.dispatchEvent(new CustomEvent(REACT_TO_PHASER.COMMAND_ESCAPE));
        break;
    }
  }
}
