import Phaser from "phaser";
import socket from "../../socket";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../../../shared/socketEvents.js";
import { PHASER_TO_REACT, REACT_TO_PHASER, emitToReact } from "../events/PhaserBridge";
import { MAP_CONFIG } from "../config/mapConfig";
import {
  ADJACENCY,
  getNeighbors,
  SPOT_ADJACENCY,
  getSpotNeighbors,
} from "../../../shared/adjacency.js";
import {
  GOD_SACRED_LANDS,
  getSacredDistrict,
  getSpawnSpot,
  getGodName,
  getGodColor,
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
  OUTLINE_NEUTRAL: 0xffffff,
  OUTLINE_MY_TEAM: 0x06b6d4,
  OUTLINE_ENEMY: 0xff4444,
  OUTLINE_SELECTED: 0xfa7000,
};

const normalizeId = (id) => {
  if (id === null || id === undefined || id === "") return null;
  const n = Number(id);
  return isNaN(n) ? null : n;
};
function extractSpotId(obj) {
  // 方式A: properties[0].name が 5桁以上の数値（例: "16201"）
  const byPropName = normalizeId(obj.properties?.[0]?.name);
  if (byPropName != null && byPropName >= 10000) return byPropName;

  // 方式A': properties[0].name の先頭5桁以上が数値（タイポ対応: "11304fsss" → 11304）
  const propName0 = obj.properties?.[0]?.name ?? "";
  const propLeadMatch = propName0.match(/^(\d{5,})/);
  if (propLeadMatch) {
    const v = normalizeId(propLeadMatch[1]);
    if (v != null && v >= 10000) return v;
  }

  // 方式B: "spot_id" または "id" という名前のプロパティの value
  const byNamedProp = obj.properties?.find((p) => p.name === "spot_id" || p.name === "id")?.value;
  if (byNamedProp != null) {
    const v = normalizeId(byNamedProp);
    if (v != null && v >= 10000) return v;
  }

  // 方式C: properties のいずれかの value が 5桁数値
  if (Array.isArray(obj.properties)) {
    for (const p of obj.properties) {
      const v = normalizeId(p.value);
      if (v != null && v >= 10000) return v;
    }
  }

  // 方式D: obj.name が 5桁数値文字列（例: "16201"）
  const byName = normalizeId(obj.name);
  if (byName != null && byName >= 10000) return byName;

  // 未対応パターン → DEVログで報告
  if (import.meta.env.DEV) {
    console.warn("[extractSpotId] IDを特定できませんでした:", {
      tiled_id: obj.id,
      name: obj.name,
      properties: obj.properties,
    });
  }
  return null;
}

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

// point オブジェクト用: 中心 (cx, cy) に半径 r の正 sides 角形を生成
function makePointPolygon(cx, cy, r = 20, sides = 8) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (2 * Math.PI * i) / sides;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });
    this.districts = {};
    this.spots = {}; // { [5桁spotId]: { x, y, name, districtId(3桁) } }
    this.otherPlayers = {};
    this.playerStats = { hp: 100, stamina: 100, faith: 1.0, atk: 50, def: 40 };
    this.currentSpotId = null; // ★ 5桁spot ID
    this.currentDistrictId = null;
    this._dragMoved = false;
    this.isSelectionMode = true;
    this._reactListeners = [];
    this._myTeam = null;
    this._pendingTargetId = null;
    this._prevSpotId = null; // FIX-C: ロールバック用
    this._prevDistrictId = null; // FIX-C: ロールバック用
    this._myGodId = null; // ★ 追加: 自分が選択した godId
    this._myGodColor = 0x95a5a6; // ★ 追加: 神カラー（暫定: 中立グレー）
    this._avatarKey = null; // SET_AVATARが来るまではnull（フォールバックで丸を表示）
  }

  preload() {
    const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];
    if (config.tilesets?.length > 0) {
      config.tilesets.forEach((ts) => this.load.image(ts.key, ts.path));
    }
    this.load.tilemapTiledJSON(config.key, config.path);
    this.load.audio("bgm_field", [
      "/assets/audio/bgm/login-joinroom.ogg",
      "/assets/audio/bgm/login-joinroom.mp3",
    ]);
    if (import.meta.env.DEV) {
      this.load.on("filecomplete-audio-bgm_field", () =>
        console.log("[BGM] ロード成功: bgm_field"),
      );
      this.load.on("filecomplete-audio-bgm_maingame", () =>
        console.log("[BGM] ロード成功: bgm_maingame"),
      );
      this.load.on("filecomplete-audio-bgm_battle", () =>
        console.log("[BGM] ロード成功: bgm_battle"),
      );
      this.load.on("loaderror", (file) => console.error("[BGM] ロード失敗:", file.key, file.src));
    }

    // GodSelectionView.tsx の GOD_SLOTS.textureKey と完全一致させる
    const GOD_IMAGES = [
      { key: "god-neil", path: "/assets/images/gods/Neil.png" },
      { key: "god-garry", path: "/assets/images/gods/Garry.png" },
      { key: "god-shem", path: "/assets/images/gods/Shem.png" },
      { key: "god-quisie", path: "/assets/images/gods/Quisie.png" },
      { key: "god-eduardo", path: "/assets/images/gods/Eduardo.png" },
      { key: "god-kurt", path: "/assets/images/gods/Kurt.png" },
      { key: "god-stephen", path: "/assets/images/gods/Stephen.png" },
      { key: "god-bernardine", path: "/assets/images/gods/Bernardine.png" },
    ];
    GOD_IMAGES.forEach(({ key, path }) => this.load.image(key, path));

    // BGM・SE ロード（インゲーム分）
    SoundManager.preloadAssets(this);
  }

  create() {
    this.cameras.main.setBackgroundColor(0x2471a3);
    this.zoomManager = new ZoomManager();
    this._setupTilemap();
    this._loadDistrictsFromTMJ();
    this._buildSpotLookup();
    this._drawDistrictPolygons();
    this._drawSpotOutlines();
    this.territoryOverlay = this.add.graphics();
    this.territoryOverlay.setDepth(5); // タイル(0) < オーバーレイ(5) < ラベル(10) < プレイヤー(20)
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
    // 初回ユーザー操作後に再生（自動再生ブロック対策）
    // once なので既存の pointerdown ハンドラ（当たり判定）とは並列動作する
    this.input.once("pointerdown", () => {
      if (import.meta.env.DEV)
        console.log("[BGM] 初回pointerdown, AudioContext:", this.sound.context?.state);
      SoundManager.playBGM("bgm_field");
    });
    this.effectManager = new EffectManager(this);
    window.__SCENE__ = this;
    this._setupBGMListeners();
    this._setupSEListeners();

    if (import.meta.env.DEV) {
      // コンソールから scene.debugSpotAdjacency(11101) のように呼べるようにする
      this.debugSpotAdjacency = (spotId) => {
        const neighbors = getSpotNeighbors(spotId);
        const spot = this.districts[spotId];
        console.group(`[SPOT_ADJACENCY DEBUG] spot ${spotId} (${spot?.name ?? "不明"})`);
        if (neighbors.length === 0) {
          console.warn("⚠️ SPOT_ADJACENCYに未定義 → shared/adjacency.js に追記が必要");
        } else {
          neighbors.forEach((nId) => {
            const n = this.districts[nId];
            console.log(`  → ${nId} (${n?.name ?? "不明"})`);
          });
        }
        console.groupEnd();
      };

      // 全spotのカバレッジチェック（起動時に一度だけ実行）
      const allSpotIds = Object.keys(this.districts)
        .map(Number)
        .filter((id) => id >= 10000); // 5桁 = spot

      const uncovered = allSpotIds.filter((id) => !SPOT_ADJACENCY[id]);
      if (uncovered.length > 0) {
        console.warn(`[SPOT_ADJACENCY] 未定義のspot ${uncovered.length}件:`, uncovered.join(", "));
        console.warn("→ shared/adjacency.js の SPOT_ADJACENCY に追記してください");
      } else {
        console.log(`[SPOT_ADJACENCY] ✅ 全${allSpotIds.length}spot定義済み`);
      }
    }
  }

  update() {
    const zoom = this.cameras.main.zoom;

    // ズームが変化した時だけ tick を呼ぶ（毎フレーム呼ばない）
    if (Math.abs(zoom - (this._lastZoom ?? 0)) > 0.01) {
      this._lastZoom = zoom;
      if (this.districts) this.zoomManager?.tick(zoom, this.districts);
    }

    this.cameraController?.update();
  }

  // ═══════════════════════════════════════════════
  // 神聖地占領処理
  // ═══════════════════════════════════════════════

  /**
   * 神選択時に聖地district内のspotを自陣カラーで占領表示する
   * @param {number} godId - 1〜8（GOD_SACRED_LANDS のキー）
   */
  _claimSacredLand(godId) {
    const sacredDistrictId = getSacredDistrict(godId);
    const spawnSpotId = getSpawnSpot(godId);

    if (sacredDistrictId == null) {
      console.warn(`[MainScene] godId=${godId} に対応する聖地が見つかりません`);
      return;
    }

    this._sacredDistrictId = sacredDistrictId;
    // ★ チームカラーではなく神カラーで塗る
    const godColor = getGodColor(godId);

    // ★ district配下の全spotを塗る（districtポリゴン自体は塗らない）
    const spots = this._getSpotsInDistrict(sacredDistrictId);
    spots.forEach((spot) => {
      spot.owner = "me";
      this._redrawDistrict(spot, godColor, 0.65);
    });

    // spotが1件も見つからない場合はspawnSpotのみ塗る
    if (spots.length === 0 && spawnSpotId != null) {
      const fallbackSpot = this.districts[spawnSpotId];
      if (fallbackSpot) {
        fallbackSpot.owner = "me";
        this._redrawDistrict(fallbackSpot, godColor, 0.65);
        console.warn(
          `[MainScene] districtId=${sacredDistrictId} 配下のspotが見つからないため` +
            ` spawnSpotId=${spawnSpotId} のみ塗りました`,
        );
      }
    }

    this.showLog(`⛩️ ${getGodName(godId)} の聖地（地区${sacredDistrictId}）を獲得！`);

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

          // ★ startSpotId (5桁) を優先。旧キー名 startDistrictId / districtId は互換用
          const rawId = normalizeId(
            e.detail.startSpotId ?? e.detail.startDistrictId ?? e.detail.districtId,
          );

          if (rawId == null) {
            console.error("[MainScene] startSpotId が不正です", e.detail);
            return;
          }
          const spotId = rawId;
          const districtId = rawId >= 10000 ? Math.floor(rawId / 100) : rawId;
          this.currentSpotId = spotId;
          this.currentDistrictId = districtId;

          // 聖地と一致するか確認（ログ用）
          if (this._sacredDistrictId !== districtId) {
            console.warn(
              `[MainScene] deployment district(${districtId}) と聖地(${this._sacredDistrictId}) が不一致。` +
                `通常占領フローで処理します`,
            );
          }

          // ★ spotの中心座標にプレイヤーを配置
          this._placePlayer(spotId);
          SoundManager.playSE("se_moving");

          console.log(`[Deploy] spotId=${spotId} districtId=${districtId}`);
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
          this.game.events.emit("battle:start");
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
        event: REACT_TO_PHASER.SYNC_MAP,
        handler: (e) => {
          const { players, districts } = e.detail ?? {};

          // players が配列（新形式）でもオブジェクト（旧形式）でも両対応
          const playersArray = Array.isArray(players)
            ? players
            : Object.entries(players ?? {}).map(([id, data]) => ({ id, ...data }));

          // ★ playerMap を構築: { [playerId]: { godId } }
          const playerMap = {};
          playersArray.forEach((p) => {
            playerMap[p.id] = { godId: p.godId ?? p.selectedGodId ?? null };
          });

          // districts が配列でもオブジェクトでも両対応してルックアップマップを構築
          const districtOwnerMap = {};
          if (Array.isArray(districts)) {
            // 配列形式: [{ district_id: 16201, owner_id: "socketId" }, ...]
            districts.forEach((dd) => {
              const id = dd.district_id ?? dd.id;
              if (id != null) districtOwnerMap[Number(id)] = dd.owner_id ?? dd.owner ?? "neutral";
            });
          } else {
            // オブジェクト形式: { "16201": "socketId", ... }（サーバーの実際の形式）
            Object.entries(districts ?? {}).forEach(([id, ownerId]) => {
              districtOwnerMap[Number(id)] = ownerId ?? "neutral";
            });
          }

          // ★ 全地区を神カラーで再描画
          Object.values(this.districts).forEach((d) => {
            const ownerId = districtOwnerMap[d.id] ?? "neutral";
            this._repaintDistrictByOwner(d, ownerId, playerMap);
          });

          if (players) this._syncPlayers(players);
        },
      },
      {
        event: REACT_TO_PHASER.SET_AVATAR,
        handler: (e) => {
          const { godKey, godId } = e.detail || {};

          // ① アバター画像キーの更新（既存処理）
          if (godKey) {
            this._avatarKey = godKey;
            // _placePlayer が直後に呼ばれるため setTexture は不要だが、
            // Image オブジェクトの場合のみ念のため更新する
            if (
              this.player &&
              this.textures.exists(godKey) &&
              typeof this.player.setTexture === "function"
            ) {
              this.player.setTexture(godKey);
            }
          }

          if (godId != null) {
            // ★ 神カラーを確定
            this._myGodId = Number(godId);
            this._myGodColor = getGodColor(this._myGodId);
            if (import.meta.env.DEV)
              console.log(
                `[MainScene] 神カラー確定: godId=${godId}, color=0x${this._myGodColor.toString(16)}`,
              );

            // ② 聖地を神カラーで先塗り（既存処理）
            this._claimSacredLand(godId);

            // ③ GDD v4.0 §3-1 準拠: spawnSpotId(5桁)でスポーン、currentDistrictIdは3桁を保持
            const sacredId = getSacredDistrict(godId); // 3桁: 移動判定用
            const spawnSpot = getSpawnSpot(godId); // 5桁: アバター座標用
            if (sacredId != null) {
              this.isSelectionMode = false;
              this.currentSpotId = spawnSpot ?? sacredId; // ★ 5桁を保持
              this.currentDistrictId = sacredId; // 3桁: ADJACENCY チェック用
              this._placePlayer(spawnSpot ?? sacredId); // 5桁優先、なければ3桁フォールバック
              SoundManager.playSE("se_moving");

              if (import.meta.env.DEV) {
                console.log(
                  `[SET_AVATAR] godId=${godId}(${getGodName(godId)})` +
                    ` → district=${sacredId}(3桁), spawnSpot=${spawnSpot}(5桁)`,
                );
              }
            }
          }
        },
      },
      {
        event: REACT_TO_PHASER.TERRITORY_EFFECT,
        handler: (e) => {
          const { districtId, owner, players } = e.detail ?? {};
          const d = this.districts[normalizeId(districtId)];
          if (!d) return;

          // ✅ 修正E-1: players は Object { socketId: playerData } の場合があるため Object.values() で配列化
          const playerMap = {};
          Object.values(players || {}).forEach((p) => {
            playerMap[p.id] = { godId: p.godId ?? p.selectedGodId ?? null };
          });

          this._repaintDistrictByOwner(d, owner ?? "neutral", playerMap);
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
    Object.values(this._spotMarkers ?? {}).forEach((m) => m.destroy());
    this._spotMarkers = {};
    SoundManager.clearScene();
    window.removeEventListener(REACT_TO_PHASER.START_GAME_BGM, this._onStartGameBgm);
    if (this._onBattleStart) this.game.events.off("battle:start", this._onBattleStart);
    if (this._onBattleEnd) this.game.events.off("battle:end", this._onBattleEnd);
    if (this._onMoving) this.game.events.off("se:moving", this._onMoving);
    if (this._onAirport) this.game.events.off("se:airport", this._onAirport);
    if (this._onHealing) this.game.events.off("se:healing", this._onHealing);
    if (this._onEmergency) this.game.events.off("se:emergency", this._onEmergency);
    if (this._onEscapeResult) this.game.events.off("se:escape_result", this._onEscapeResult);
    if (this._onDefenseResult) this.game.events.off("se:defense_result", this._onDefenseResult);
  }

  _setupBGMListeners() {
    // ① React → Phaser：マップ画面に入ったらインゲームBGM開始
    this._onStartGameBgm = () => {
      if (import.meta.env.DEV) console.log("[BGM] react:startGameBgm 受信 → maingame.ogg 再生");
      SoundManager.playBGM("bgm_maingame", { loop: true, volume: 0.5 });
    };
    window.addEventListener(REACT_TO_PHASER.START_GAME_BGM, this._onStartGameBgm);

    // ② バトル開始 → battle.ogg に切り替え
    this._onBattleStart = () => {
      if (import.meta.env.DEV) console.log("[BGM] battle:start → battle.ogg 再生");
      SoundManager.playBGM("bgm_battle_music", { loop: true, volume: 0.6 });
    };

    // ③ バトル終了 → maingame.ogg に戻す
    this._onBattleEnd = () => {
      if (import.meta.env.DEV) console.log("[BGM] battle:end → maingame.ogg 復帰");
      SoundManager.playBGM("bgm_maingame", { loop: true, volume: 0.5 });
    };

    this.game.events.on("battle:start", this._onBattleStart);
    this.game.events.on("battle:end", this._onBattleEnd);
  }

  _setupSEListeners() {
    this._onMoving = () => SoundManager.playSE("se_moving");
    this.game.events.on("se:moving", this._onMoving);

    this._onAirport = () => SoundManager.playSE("se_airport");
    this.game.events.on("se:airport", this._onAirport);

    this._onHealing = () => SoundManager.playSE("se_healing");
    this.game.events.on("se:healing", this._onHealing);

    this._onEmergency = () => {
      SoundManager.playSE("se_emergency");
      this.game.events.emit("battle:start");
    };
    this.game.events.on("se:emergency", this._onEmergency);

    this._onEscapeResult = () => {
      SoundManager.playSEChain(["se_escape", "se_territory_control"], 2000);
      this.time.delayedCall(4000, () => this.game.events.emit("battle:end"));
    };
    this.game.events.on("se:escape_result", this._onEscapeResult);

    this._onDefenseResult = () => {
      SoundManager.playSEChain(["se_battle", "se_territory_control"], 2000);
      this.time.delayedCall(4000, () => this.game.events.emit("battle:end"));
    };
    this.game.events.on("se:defense_result", this._onDefenseResult);
  }

  _initSocket() {
    socket.connect();
    socket.on(SERVER_EVENTS.SYNC_STATE, (s) => {
      if (!s) return;
      // FIX-B: _myTeam を syncState から設定（未設定のときのみ上書き）
      if (!this._myTeam && s?.players) {
        const playersArr = Array.isArray(s.players)
          ? s.players
          : Object.entries(s.players).map(([id, p]) => ({ id, ...p }));
        const me = playersArr.find((p) => p.id === socket.id);
        if (me?.team) {
          this._myTeam = me.team;
        }
      }
      const playerMap = {};
      Object.entries(s.players ?? {}).forEach(([id, p]) => {
        playerMap[id] = { godId: p.godId ?? p.selectedGodId ?? null };
      });
      this._playerMap = playerMap; // ★ _syncDistricts から参照できるよう保存
      this._syncDistricts(s.districts, s.players);
      this._syncPlayers(s.players);
    });
    socket.on(SERVER_EVENTS.GAME_START, (s) => {
      if (!s) return;
      if (s.districts && s.players) {
        const playerMap = {};
        Object.entries(s.players ?? {}).forEach(([id, p]) => {
          playerMap[id] = { godId: p.godId ?? p.selectedGodId ?? null };
        });
        this._playerMap = playerMap; // ★ 追加
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

      // FIX-C: move / attack（空き地）成功時にプレイヤー位置を即時更新する
      const isMoveAction = data.action === "move" || data.action === "move_airport";
      const isCapture = data.action === "attack" && data.success === true && !data.battleOccurred;

      if ((isMoveAction || isCapture) && data.success !== false) {
        const newSpotId =
          data.spotId ?? data.newSpotId ?? data.targetId ?? this._pendingTargetId ?? null;

        if (newSpotId != null) {
          this._prevSpotId = this.currentSpotId;
          this._prevDistrictId = this.currentDistrictId;
          this.currentSpotId = Number(newSpotId);
          this.currentDistrictId = Math.floor(Number(newSpotId) / 100);
          this._placePlayer(newSpotId);
        }

        if (isMoveAction) {
          this.game.events.emit("se:moving");
        } else if (data.action === "move_airport") {
          this.game.events.emit("se:airport");
        }
      } else if (data.action === "stay") {
        this.game.events.emit("se:healing");
        this.game.events.emit("battle:end");
      }

      // エフェクト
      if (this._pendingTargetId !== null) {
        const attacker = this.districts[this.currentDistrictId];
        const target = this.districts[this._pendingTargetId];
        if (attacker) this.effectManager.playSlashEffect(attacker.center.x, attacker.center.y);
        if (target) this.effectManager.playExplosionEffect(target.center.x, target.center.y);
        this._pendingTargetId = null;
      }

      if ((data.hpDelta > 0 || data.apDelta > 0) && data.action !== "stay") {
        this.game.events.emit("se:healing");
      }
    });
    socket.on(SERVER_EVENTS.ACTION_REJECTED, (data) => {
      if (!data) return;
      this.showLog(`⚠️ ${data.reason ?? "Action rejected."}`);
      // FIX-C: ローカル先行移動をロールバック
      if (this._prevSpotId != null) {
        this.currentSpotId = this._prevSpotId;
        this.currentDistrictId = this._prevDistrictId;
        this._placePlayer(this._prevSpotId);
        this._prevSpotId = null;
        this._prevDistrictId = null;
      }
      emitToReact(PHASER_TO_REACT.GAME_LOG, data.reason ?? "Action rejected.");
    });
    socket.on(SERVER_EVENTS.BATTLE_RESULT, (data) => {
      // 防御側もバトルBGMを受け取れるよう emit（攻撃側は COMMAND_ATTACK で既に開始済みのため無視される）
      this.game.events.emit("battle:start");
      if (data?.defenderAction === "escape") {
        this.game.events.emit("se:escape_result");
      } else if (data?.defenderAction === "defense") {
        this.game.events.emit("se:defense_result");
      } else {
        this.time.delayedCall(3000, () => this.game.events.emit("battle:end"));
      }
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
        const districtId =
          layerName === "spotName"
            ? extractSpotId(obj) // spot専用の抽出関数
            : normalizeId(obj.properties?.[0]?.name ?? obj.id); // island/area/districtは従来通り
        if (!districtId) return;

        // polygon あり → そのまま変換
        // polygon なし（point オブジェクト）→ 仮想ポリゴンを合成
        let poly;
        let isPoint = false;
        if (obj.polygon && obj.polygon.length > 0) {
          // ─── ポリゴンオブジェクト（既存処理・変更なし）───
          poly = obj.polygon.map((p) => ({
            x: (obj.x + p.x) * MAP_SCALE,
            y: (obj.y + p.y) * MAP_SCALE,
          }));
        } else if (obj.width > 0 && obj.height > 0) {
          // ─── 四角オブジェクト → 4頂点ポリゴンに変換 ───
          // Tiled の rectangle は x,y が左上角、width/height で大きさを表す
          // TMJ に "polygon" フィールドが存在しないため別分岐で処理する
          poly = [
            { x: obj.x * MAP_SCALE, y: obj.y * MAP_SCALE },
            { x: (obj.x + obj.width) * MAP_SCALE, y: obj.y * MAP_SCALE },
            { x: (obj.x + obj.width) * MAP_SCALE, y: (obj.y + obj.height) * MAP_SCALE },
            { x: obj.x * MAP_SCALE, y: (obj.y + obj.height) * MAP_SCALE },
          ];
          // isPoint は false のまま（正しい形状のポリゴンとして扱う）
        } else {
          // ─── ポイントオブジェクト（幅・高さなし）: 仮想正8角形 ───
          poly = makePointPolygon(obj.x * MAP_SCALE, obj.y * MAP_SCALE, 20);
          isPoint = true;
        }
        if (poly.length === 0) return; // 安全装置（通常は通らない）

        this.districts[districtId] = {
          id: districtId,
          name: obj.name,
          type: layerName,
          polygon: poly,
          isPoint, // ← true なら point オブジェクト由来の仮想ポリゴン
          center: {
            x: poly.reduce((s, v) => s + v.x, 0) / poly.length,
            y: poly.reduce((s, v) => s + v.y, 0) / poly.length,
          },
          owner: "neutral",
          graphics: this.add.graphics().setDepth(layerName === "spotName" ? 3 : 2),
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

  _buildSpotLookup() {
    this.spots = {};
    const spotLayer = this.tiledMap.getObjectLayer("spotName");
    if (!spotLayer) {
      if (import.meta.env.DEV) console.warn("[MainScene] spotName レイヤーが見つかりません");
      return;
    }

    let skipped = 0;
    spotLayer.objects.forEach((obj) => {
      // extractSpotId に統一（_loadDistrictsFromTMJ と同じロジック）
      const spotId = extractSpotId(obj);
      if (spotId == null || isNaN(spotId)) {
        skipped++;
        return;
      }

      let cx, cy;
      if (obj.polygon) {
        const xs = obj.polygon.map((v) => v.x);
        const ys = obj.polygon.map((v) => v.y);
        cx = (obj.x + (Math.min(...xs) + Math.max(...xs)) / 2) * MAP_SCALE;
        cy = (obj.y + (Math.min(...ys) + Math.max(...ys)) / 2) * MAP_SCALE;
      } else {
        cx = (obj.x + (obj.width ?? 0) / 2) * MAP_SCALE;
        cy = (obj.y + (obj.height ?? 0) / 2) * MAP_SCALE;
      }

      const districtId = Math.floor(spotId / 100);
      this.spots[spotId] = { x: cx, y: cy, name: obj.name, districtId };
    });

    if (import.meta.env.DEV) {
      console.log(
        `[_buildSpotLookup] ロード完了: ${Object.keys(this.spots).length}件 / スキップ: ${skipped}件`,
      );
      if (skipped > 0)
        console.warn("[_buildSpotLookup] スキップされたspotはTMJのプロパティ構造を確認すること");
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
      // spotNameのみ領土塗り用Graphicsを生成（他のtypeには不要）
      if (d.type === "spotName") {
        d.graphics = this.add.graphics();
        d.graphics.setDepth(2); // タイル上・テキストラベル(10)の下
      }
      d.textLabel = this.add
        .text(d.center.x, d.center.y, d.name, {
          fontSize: sizeByType[d.type] ?? "16px",
          color: "#ffffff",
          stroke: "#000",
          strokeThickness: 4,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(10)
        .setVisible(false);
    });
  }

  _drawSpotOutlines() {
    Object.values(this.districts).forEach((d) => {
      if (d.type !== "spotName") return;
      const g = this.add.graphics().setDepth(3);
      d.outlineGraphics = g;
      this._updateSpotOutline(d);
    });

    if (import.meta.env.DEV) {
      const count = Object.values(this.districts).filter((d) => d.type === "spotName").length;
      console.log(`[SpotOutline] ${count}件のspotアウトラインを描画しました`);
    }
  }

  _updateSpotOutline(d, isSelected = false) {
    if (!d || !d.outlineGraphics || d.type !== "spotName") return;

    const g = d.outlineGraphics;
    g.clear();

    let color, lineWidth, alpha;

    if (isSelected) {
      color = COLOR.OUTLINE_SELECTED;
      lineWidth = 2.5;
      alpha = 1.0;
    } else {
      const owner = d.owner ?? "neutral";
      if (owner === socket.id) {
        color = COLOR.OUTLINE_MY_TEAM;
        lineWidth = 2;
        alpha = 0.7;
      } else if (owner !== "neutral") {
        // Kurt など暗色神のアウトラインは白固定で視認性確保（選択肢B）
        color = d._darkOwner ? 0xffffff : COLOR.OUTLINE_ENEMY;
        lineWidth = 2;
        alpha = 0.7;
      } else {
        color = COLOR.OUTLINE_NEUTRAL;
        lineWidth = 1.5;
        alpha = 0.35;
      }
    }

    g.lineStyle(lineWidth, color, alpha);
    g.beginPath();
    d.polygon.forEach((p, i) => {
      i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y);
    });
    g.closePath();
    g.strokePath();
  }

  // ─── ポインター入力（優先順位: spot > district > area）──────────

  _setupPointerInput() {
    // pointerup で判定（pointerdown では _dragMoved がまだ確定していないため）
    this.input.on("pointerup", (pointer) => {
      if (this._dragMoved) return;

      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // spot レイヤーでヒット判定（point 仮想ポリゴン対応済み）
      const hitSpot = this._findObjectAt("spotName", worldX, worldY);
      if (hitSpot) {
        this._handleSpotClick(hitSpot);
        return;
      }
      // spot 以外のクリックは無視（ゲームは spot 単位で完結）
      // districtName フォールバック削除: 3桁IDの誤送信を防ぐ
    });
  }

  _handleSpotClick(spotObj) {
    // TMJ properties[0].name がスポットID（文字列 → Number に正規化）
    // ※ spotObj.id は Tiled の内部オブジェクトID（連番）であり spot_id ではない
    const spotId = extractSpotId(spotObj); // ← ヘルパー関数に統一
    if (spotId == null) {
      if (import.meta.env.DEV) {
        console.error(
          "[_handleSpotClick] spotId を特定できませんでした (Tiledオブジェクト内部id=" +
            spotObj.id +
            ")。TMJ properties を確認:",
          spotObj.properties,
        );
      }
      return;
    }
    if (import.meta.env.DEV) {
      console.log(`[_handleSpotClick] spotId=${spotId} name="${spotObj.name}"`);
    }

    const d = this.districts[spotId];
    if (import.meta.env.DEV) console.log("[hit] spot:", spotId, spotObj.name);

    if (this.isSelectionMode) {
      // ── 初期スポット選択フェーズ ──
      SoundManager.playSE("se_click_non_button");
      Object.values(this.districts)
        .filter((dist) => dist.type === "spotName")
        .forEach((dist) => {
          this._redrawDistrict(dist, COLOR.NEUTRAL);
          this._updateSpotOutline(dist, false);
        });
      this._redrawDistrict(d, COLOR.HIGHLIGHT, 0.8);
      this._updateSpotOutline(d, true);

      if (import.meta.env.DEV) {
        console.log("[emitToReact 直前] SELECT_DISTRICT payload:", {
          districtId: spotId,
          districtName: d?.name ?? String(spotId),
          isMyTerritory: undefined,
          isNeutral: undefined,
        });
      }
      emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
        districtId: spotId,
        districtName: d?.name ?? String(spotId),
      });
    } else {
      // ── プレイ中：移動・攻撃フェーズ ──
      if (spotId === this.currentSpotId) return; // ★ currentSpotId (5桁) と比較

      // FIX-A: currentSpotId が null のときは district レベルのフォールバックへ確実に進む
      const effectiveSpotId = this.currentSpotId;
      const effectiveDistrictId = this.currentDistrictId;

      // ★ SPOT_ADJACENCY (5桁キー) を優先して隣接チェック
      const spotNeighbors =
        typeof SPOT_ADJACENCY !== "undefined" && SPOT_ADJACENCY !== null && effectiveSpotId != null
          ? (SPOT_ADJACENCY[effectiveSpotId] ?? null)
          : null;

      let canMove = false;
      if (Array.isArray(spotNeighbors)) {
        // SPOT_ADJACENCY が存在する場合: 5桁 vs 5桁 で比較
        canMove = spotNeighbors.includes(spotId);
      } else {
        // フォールバック: district ADJACENCY (3桁 vs 3桁) で判定
        const currentDistrict = effectiveDistrictId; // FIX-A: effectiveDistrictId を使う
        const targetDistrict = spotId >= 10000 ? Math.floor(spotId / 100) : spotId;

        if (currentDistrict == null) {
          // FIX-A: 現在地が不明なら同一island内はすべて許可（デプロイ直後の安全弁）
          canMove = true;
        } else if (targetDistrict === currentDistrict) {
          // 同一district内のspot間移動はSPOT_ADJACENCY未定義時も許可する
          canMove = true;
          if (import.meta.env.DEV) {
            console.log(
              `[MainScene] 同一district内移動を許可: spot ${this.currentSpotId} → ${spotId}` +
                ` (district ${currentDistrict})`,
            );
          }
        } else {
          // 異なるdistrictへの移動: ADJACENCY グラフで判定
          const distNeighbors = ADJACENCY?.[currentDistrict] ?? [];
          canMove = Array.isArray(distNeighbors) && distNeighbors.includes(targetDistrict);

          if (import.meta.env.DEV) {
            console.warn(
              `[MainScene] SPOT_ADJACENCY[${this.currentSpotId}] 未定義のため` +
                ` district ADJACENCY で代替判定 (${currentDistrict} → ${targetDistrict})` +
                ` | canMove: ${canMove}`,
            );
          }
        }
      }

      if (!canMove) {
        this.showLog("⚠️ You cannot move to non-adjacent spots.");
        if (import.meta.env.DEV) {
          console.log(
            `[移動拒否] from=${this.currentSpotId} → to=${spotId}` +
              ` | 隣接spots: [${(spotNeighbors ?? []).join(", ")}]`,
          );
        }
        return;
      }

      SoundManager.playSE("se_click_non_button");
      this._pendingTargetId = spotId;

      const targetOwner = (d?.owner ?? "neutral").toLowerCase();
      const isMyTerritory = targetOwner === this._myTeam;
      const isNeutral = targetOwner === "neutral";

      // 5桁のspotIdから3桁のdistrictIdを算出（算術変換、文字列スライス禁止）
      const districtId = Math.floor(spotId / 100);
      // 3桁キーから地区データを取得（spotName レイヤーではなくdistrictNameレイヤーのエントリ）
      const districtEntry = this.districts[districtId];
      const districtName = districtEntry?.name ?? String(districtId);

      if (import.meta.env.DEV) {
        console.log("[emitToReact 直前] SELECT_DISTRICT payload:", {
          spotId, // ← 元の5桁IDも参照用に残す
          districtId, // ← 変換後の3桁ID
          districtName,
          isMyTerritory,
          isNeutral,
        });
      }
      emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
        districtId, // 3桁（表示・区別用）
        spotId, // FIX-D: 5桁のspot IDも追加で送る
        districtName,
        isMyTerritory,
        isNeutral,
      });

      this.showLog(isMyTerritory ? `🚚 移動先: ${districtName}` : `🎯 攻撃対象: ${districtName}`);

      // BUG-B: 自陣spot → Phaserローカル移動を即座に実行（サーバー承認後に_syncDistrictsで正式反映）
      if (isMyTerritory) {
        if (import.meta.env.DEV) {
          console.log(`[自陣移動] ${this.currentSpotId} → ${spotId} (district ${districtId})`);
        }
        this.currentSpotId = spotId;
        this.currentDistrictId = districtId;
        this._placePlayer(spotId);
      }
    }
  }

  _getSpotsInDistrict(districtId) {
    return Object.values(this.districts).filter(
      (d) => d.type === "spotName" && Math.floor(d.id / 100) === districtId,
    );
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
    if (d.graphics.depth !== 2) d.graphics.setDepth(2); // 初回のみ設定

    // spotName 以外（district / area / island）は塗りもアウトラインも描画しない
    if (d.type !== "spotName") return;

    if (alpha > 0) d.graphics.fillStyle(color, alpha);
    d.graphics.beginPath();
    d.polygon.forEach((p, i) =>
      i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y),
    );

    d.graphics.closePath();
    if (alpha > 0) d.graphics.fillPath();

    d.graphics.lineStyle(2, 0xffffff, 0.7).strokePath();
  }

  /**
   * ownerId → godId → godColor の順で解決してポリゴンを塗り直す。
   * @param {object} d         - this.districts[districtId]
   * @param {string} ownerId   - "neutral" | playerId
   * @param {object} playerMap - { [playerId]: { godId: number | null } }
   */
  _repaintDistrictByOwner(d, ownerId, playerMap = {}) {
    if (!d) return;

    let color, alpha;

    if (!ownerId || ownerId === "neutral") {
      color = COLOR.NEUTRAL;
      alpha = 0;
    } else {
      const godId = playerMap[ownerId]?.godId ?? null;
      color = godId ? getGodColor(godId) : 0xaaaaaa;
      alpha = 0.65;
    }

    this._redrawDistrict(d, color, alpha);
    d.owner = ownerId;
  }

  _placePlayer(spotId) {
    // ── 座標解決 ───────────────────────────────────────────────
    let x, y;
    const spotData = this.spots?.[Number(spotId)];

    if (spotData) {
      x = spotData.x;
      y = spotData.y;
    } else {
      // フォールバック: 3桁 districtId で地区中心を使う
      const districtId =
        Number(spotId) >= 10000 ? Math.floor(Number(spotId) / 100) : Number(spotId);
      const d = this.districts[normalizeId(districtId)];
      if (!d) {
        if (import.meta.env.DEV) {
          console.warn(
            `[_placePlayer] spotId=${spotId} / districtId=${districtId} が見つかりません`,
          );
        }
        return;
      }
      x = d.center.x;
      y = d.center.y;
    }

    // ── 既存アバターを破棄 ─────────────────────────────────────
    if (this.player) this.player.destroy();
    if (this._playerLabel) this._playerLabel.destroy();
    if (this._playerFrame) this._playerFrame.destroy();

    // ── テクスチャ存在チェック ────────────────────────────────
    // _avatarKey が null（未選択）or textures に未登録の場合はオレンジ丸にフォールバック
    const hasTexture = this._avatarKey != null && this.textures.exists(this._avatarKey);

    if (hasTexture) {
      // ── 神アバター画像で表示 ──────────────────────────────
      const AVATAR_SIZE = 48;
      const src = this.textures.get(this._avatarKey).getSourceImage();
      const size = Math.min(src.width, src.height);
      const cropX = Math.floor((src.width - size) / 2);
      const cropY = Math.floor((src.height - size) / 2);

      this.player = this.add
        .image(x, y, this._avatarKey)
        .setCrop(cropX, cropY, size, size)
        .setDisplaySize(AVATAR_SIZE, AVATAR_SIZE)
        .setDepth(1000);

      // 白い枠線（Graphicsで描画）
      this._playerFrame = this.add.graphics().setDepth(1001);
      this._playerFrame.lineStyle(2, 0xffffff, 0.9);
      this._playerFrame.strokeRect(
        x - AVATAR_SIZE / 2,
        y - AVATAR_SIZE / 2,
        AVATAR_SIZE,
        AVATAR_SIZE,
      );
    } else {
      // ── フォールバック: オレンジの丸 ─────────────────────
      if (import.meta.env.DEV) {
        // _avatarKey が null なら SET_AVATAR 未受信（神未選択）、文字列なら画像ロード失敗
        console.warn(
          `[_placePlayer] avatar key=${this._avatarKey ?? "(not set)"} → circle fallback`,
        );
      }
      const PLAYER_RADIUS = 14;
      this.player = this.add
        .circle(x, y, PLAYER_RADIUS, 0xff6600)
        .setDepth(20)
        .setAlpha(0.85)
        .setStrokeStyle(2, 0xffffff);
      this._playerFrame = null;
    }

    // ── プレイヤー名ラベル ────────────────────────────────────
    const displayName = this.registry.get("playerName") || "YOU";
    this._playerLabel = this.add
      .text(x, y - 20, displayName, {
        fontSize: "10px",
        fontFamily: "Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(21);

    // ── カメラ追従 ────────────────────────────────────────────
    if (!this.isSelectionMode) {
      this.cameraController?.follow(this.player);
    } else {
      this.cameras.main.pan(x, y, 600, "Power2");
    }
  }

  /**
   * アバター・フレーム・ラベルをまとめて指定座標へ移動する。
   * Tween の onUpdate コールバック内でも呼ぶこと。
   */
  _movePlayerTo(x, y) {
    if (this.player) {
      if (typeof this.player.setPosition === "function") {
        this.player.setPosition(x, y);
      }
    }

    if (this._playerFrame) {
      const AVATAR_SIZE = 48;
      this._playerFrame.clear();
      this._playerFrame.lineStyle(2, 0xffffff, 0.9);
      this._playerFrame.strokeRect(
        x - AVATAR_SIZE / 2,
        y - AVATAR_SIZE / 2,
        AVATAR_SIZE,
        AVATAR_SIZE,
      );
    }

    if (this._playerLabel) {
      this._playerLabel.setPosition(x, y - 36);
    }
  }

  _syncDistricts(serverDistricts, serverPlayers) {
    if (!serverDistricts) return;

    // ownerIdMap: Number(spotId) → ownerId (socket.id | "neutral")
    const ownerIdMap = {};
    Object.entries(serverDistricts).forEach(([id, ownerId]) => {
      ownerIdMap[Number(id)] = ownerId || "neutral";
    });

    // playerMap: { [ownerId]: { godId } } — this._playerMap がなければ今回分で構築
    const playerMap =
      this._playerMap ??
      (() => {
        const m = {};
        Object.entries(serverPlayers ?? {}).forEach(([id, p]) => {
          m[id] = { godId: p.godId ?? p.selectedGodId ?? null };
        });
        return m;
      })();

    // ★ 変化のあった spot のみ再描画（全件無条件更新を防ぐ）
    let repaintCount = 0;

    Object.values(this.districts).forEach((d) => {
      if (d.type !== "spotName") return;

      const spotId = d.id;
      const districtId = Math.floor(spotId / 100);

      // spot単位でマッチ → なければdistrict単位で判定
      const ownerId = ownerIdMap[spotId] ?? ownerIdMap[districtId] ?? "neutral";

      // ★ 前回と owner が同じなら再描画をスキップ（FPS最適化）
      if (d.owner === ownerId) return;

      if (!this.isSelectionMode && ownerId === socket.id && d.owner !== socket.id) {
        SoundManager.playSE("se_territory_control");
        this.effectManager?.playCapturePopup(d.center.x, d.center.y);
      }

      d.owner = ownerId;
      repaintCount++;

      if (ownerId === "neutral") {
        this._redrawDistrict(d, COLOR.NEUTRAL, 0);
      } else {
        // ★ 所有者の godId → godColor で塗り分け
        const godId = playerMap[ownerId]?.godId ?? null;
        const color = godId ? getGodColor(godId) : 0xaaaaaa;
        // Kurt など暗色神はアウトラインを白固定で視認性確保
        const DARK_THRESHOLD = 0x404040;
        if (d.outlineGraphics && color < DARK_THRESHOLD) {
          d._darkOwner = true;
        } else {
          d._darkOwner = false;
        }
        const alpha = ownerId === socket.id ? 0.65 : 0.5;
        this._redrawDistrict(d, color, alpha);
      }

      // アウトラインも更新
      this._updateSpotOutline(d, false);
    });

    if (import.meta.env.DEV && repaintCount > 0) {
      console.log(`[_syncDistricts] 再描画: ${repaintCount} spots`);
    }

    if (serverPlayers && typeof this._syncPlayerDots === "function") {
      this._syncPlayerDots(serverPlayers);
    }
  }

  _markSpot(spotId, color, alpha = 0.5) {
    if (!this._spotMarkers) this._spotMarkers = {};
    if (this._spotMarkers[spotId]) {
      this._spotMarkers[spotId].destroy();
      delete this._spotMarkers[spotId];
    }
    if (alpha === 0 || color === COLOR.NEUTRAL) return;

    const s = this.spots[spotId];
    if (!s) return;

    this._spotMarkers[spotId] = this.add.circle(s.x, s.y, 8, color, alpha).setDepth(50); // district ポリゴンより上、player より下
  }

  _syncPlayers(players) {
    Object.values(this.otherPlayers).forEach((p) => {
      if (p.dot) p.dot.destroy();
      if (p.label) p.label.destroy();
    });
    this.otherPlayers = {};

    Object.entries(players).forEach(([playerId, data]) => {
      if (playerId === socket.id) {
        // ── 自プレイヤー ──
        this._myTeam = data.team?.toLowerCase() ?? null;

        const spawnId = data.spotId ?? data.districtId ?? data.currentDistrict;
        if (spawnId == null) return;

        const serverSpotId = Number(spawnId) >= 10000 ? Number(spawnId) : null;
        const serverDistrict =
          Number(spawnId) >= 10000 ? Math.floor(Number(spawnId) / 100) : normalizeId(spawnId);

        // ★ SET_AVATAR で既にスポーン済みの場合はサーバーの古いデータで位置を上書きしない
        // （サーバーが5桁spotIdを返してきた場合のみ位置を更新する）
        if (this.currentSpotId != null && serverSpotId == null) {
          // SET_AVATAR 済み + サーバーが spotId を持っていない → 現在位置を維持
          this.currentDistrictId = serverDistrict ?? this.currentDistrictId;
          this.isSelectionMode = false;
          return;
        }

        // ★ currentSpotId を必ず設定する（from=null 防止）
        if (serverSpotId != null) {
          this.currentSpotId = serverSpotId;
          this.currentDistrictId = serverDistrict;
        } else {
          // サーバーが3桁IDしか持っていない場合は district 情報だけ更新
          this.currentDistrictId = serverDistrict;
          // currentSpotId は変更しない（SET_AVATAR の値を維持）
        }

        this._placePlayer(spawnId);
        this.isSelectionMode = false;
        return;
      }

      // ── 他プレイヤー / NPC ── (ドット表示は districtId レベル)
      let rawDistrictId = data.districtId ?? data.currentDistrict ?? data.pos;
      if (rawDistrictId == null && data.spotId != null) {
        rawDistrictId = Math.floor(Number(data.spotId) / 100);
      }
      const dId = normalizeId(rawDistrictId);
      if (!dId) {
        if (import.meta.env.DEV) {
          console.warn(`[_syncPlayers] Player ${playerId} (${data.username}) no valid id:`, data);
        }
        return;
      }

      const d = this.districts[dId];
      if (!d?.center) {
        if (import.meta.env.DEV) {
          console.warn(`[_syncPlayers] district ${dId} not in Phaser for ${playerId}`);
        }
        return;
      }

      const isNpc = data.isNpc === true;
      const ENEMY_SIZE = 40;

      // 実装C: godId → textureKey 変換テーブル（GodSelectionView.tsxのGOD_SLOTSと一致）
      const GOD_KEY_MAP = {
        1: "god-neil",
        2: "god-garry",
        3: "god-shem",
        4: "god-quisie",
        5: "god-eduardo",
        6: "god-kurt",
        7: "god-stephen",
        8: "god-bernardine",
      };
      const enemyGodKey = data.godKey ?? GOD_KEY_MAP[data.selectedGodId ?? data.godId] ?? null;
      const hasEnemyTexture = !isNpc && enemyGodKey && this.textures.exists(enemyGodKey);

      let dot;
      if (isNpc) {
        dot = this.add
          .circle(d.center.x, d.center.y, 16, 0xff00ff)
          .setDepth(900)
          .setStrokeStyle(3, 0x000000);
      } else if (hasEnemyTexture) {
        const src = this.textures.get(enemyGodKey).getSourceImage();
        const size = Math.min(src.width, src.height);
        const cropX = Math.floor((src.width - size) / 2);
        const cropY = Math.floor((src.height - size) / 2);

        dot = this.add
          .image(d.center.x, d.center.y, enemyGodKey)
          .setCrop(cropX, cropY, size, size)
          .setDisplaySize(ENEMY_SIZE, ENEMY_SIZE)
          .setDepth(900);
      } else {
        dot = this.add
          .circle(d.center.x, d.center.y, 16, COLOR.ENEMY_DOT)
          .setDepth(900)
          .setStrokeStyle(3, 0x000000);
      }

      const enemyName = data.username || data.playerName || (isNpc ? "NPC" : "???");
      const label = this.add
        .text(d.center.x, d.center.y - (isNpc ? 24 : 30), isNpc ? "NPC" : enemyName, {
          fontSize: "10px",
          fontFamily: "monospace",
          fill: isNpc ? "#ff00ff" : "#cccccc",
          stroke: "#000",
          strokeThickness: 3,
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(901);

      this.otherPlayers[playerId] = { dot, label };
    });
  }

  _updateLabelVisibility() {
    const zoom = this.cameras.main.zoom;
    const lod = this.zoomManager.getLodType(zoom);
    const hoveredId = this.zoomManager._hoveredId;

    Object.values(this.districts).forEach((d) => {
      // ── テキストラベル ──────────────────────────────
      if (d.textLabel) {
        const isHovered = d.id === hoveredId;
        // spot以外のラベルは非表示（LOD・ホバー問わず）
        if (d.type !== "spotName") {
          d.textLabel.setVisible(false);
        } else {
          // spot: LODがspotNameのとき、またはホバー時に表示
          d.textLabel.setVisible(d.type === lod || isHovered);
          d.textLabel.setScale(isHovered ? 1.2 : 1.0);
        }
      }

      // ── アウトライングラフィックス ──────────────────
      if (d.outlineGraphics) {
        // spotName のみ表示。LOD が districtName 以上（ズーム十分）であれば表示
        const showOutline = d.type === "spotName" && (lod === "districtName" || lod === "spotName");
        d.outlineGraphics.setVisible(showOutline);
      }
    });
  }

  _updateHoverText(hoveredId) {
    // hoveredId が district/area/island の場合は spot への書き換えを試みる
    let spotHoveredId = hoveredId;
    if (hoveredId != null) {
      const d = this.districts[hoveredId];
      // spot 以外が来た場合は null にして表示しない
      if (d && d.type !== "spotName") spotHoveredId = null;
    }
    if (this.zoomManager) this.zoomManager.setHover(spotHoveredId, this.districts);
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
