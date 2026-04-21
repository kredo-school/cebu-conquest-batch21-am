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
            config.tilesets.forEach(ts => {
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
            { event: 'ACTION_STAY', handler: () => this.showLog("🧘 休息中...") },
            {
                event: 'MAP_REPAINT', 
                handler: (e) => {
                    if (e.detail.districts && e.detail.players) {
                        this._syncDistricts(e.detail.districts, e.detail.players);
                    }
                }
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

            console.log(`📍 [以前の定義を使用] 現在地: ${myPos}, クリック: ${targetId}, 隣接: ${neighbors}`);

            // 🚀 隣接チェック または 隣接リストがまだ設定されていない場合（17, 18番など）
            if (neighbors.includes(targetId) || (myPos < 100 && targetId < 100)) {
                this.showLog(`🎯 ターゲット確認：${this.districts[targetId].name}`);
                
                // 🚀 React側へ「勝率予測モーダルを開け」と命令
                store.openPrediction(targetId, this.districts[targetId].name);

                // UIのハイライト更新
                Object.values(this.districts).forEach((d) => {
                    let baseCol = d.owner === "red" ? COLOR.TEAM_RED : (d.owner === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL);
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
    }

    _loadDistrictsFromTMJ() {
        const objectLayer = this.tiledMap.getObjectLayer("districtName");
        if (!objectLayer) return;

        objectLayer.objects.forEach((obj) => {
            let districtId = obj.id; 
            
            // 🚀 【強化版】Tiledのプロパティ読み込み
            if (obj.properties) {
                if (Array.isArray(obj.properties)) {
                    // 配列形式の場合
                    const idProp = obj.properties.find(p => p.name.toLowerCase() === 'id' || p.name.toLowerCase() === 'districtid');
                    if (idProp) districtId = parseInt(idProp.value, 10);
                } else {
                    // オブジェクト形式の場合
                    districtId = obj.properties.id || obj.properties.districtId || districtId;
                }
            }

            const poly = (obj.polygon || []).map((p) => ({ x: (obj.x + p.x) * MAP_SCALE, y: (obj.y + p.y) * MAP_SCALE }));
            this.districts[districtId] = { 
                id: districtId, 
                name: obj.name, 
                polygon: poly, 
                center: this._calcCenter(poly), 
                owner: "neutral", 
                graphics: this.add.graphics().setDepth(2) 
            };
            this._redrawDistrict(this.districts[districtId], COLOR.NEUTRAL);
        });
    }

    _setupTilemap() {
        const config = MAP_CONFIG.MAPS[MAP_CONFIG.USE_MAP];
        const map = this.make.tilemap({ key: config.key });
        
        // 全てのタイルセット画像をマップに追加し、配列に格納する
        const allTilesets = config.tilesets.map(ts => {
            return map.addTilesetImage(ts.name, ts.key);
        });

        // Tiledのデータ内にある「全てのレイヤー」を自動でループして生成・描画する
        this.tileLayers = []; // 今後レイヤーを操作できるように配列に入れておく
        map.layers.forEach(layerData => {
            const layer = map.createLayer(layerData.name, allTilesets, 0, 0);
            if (layer) {
                layer.setScale(MAP_SCALE);
                this.tileLayers.push(layer);
            }
        });
        
        this.tiledMap = map;
    }
    _drawDistrictPolygons() {
        const overlay = this.add.rectangle(0, 0, 4000, 4000, 0, 0).setOrigin(0).setInteractive();
        overlay.setDepth(1).on("pointerdown", (p) => this._onMapClicked(p.x, p.y));
        Object.values(this.districts).forEach((d) => {
            d.textLabel = this.add.text(d.center.x, d.center.y, d.name, { fontSize: "10px", color: "#ffffff", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5).setDepth(3);
        });
    }
    _getDistrictAtPoint(x, y) {
        for (const d of Object.values(this.districts)) {
            if (pointInPolygon({ x, y }, d.polygon)) return d.id;
        }
        return null;
    }
    _redrawDistrict(d, color, alpha = 0.8) {
        if (!d || !d.graphics) return;
        d.graphics.clear().fillStyle(color, alpha).beginPath();
        d.polygon.forEach((p, i) => i === 0 ? d.graphics.moveTo(p.x, p.y) : d.graphics.lineTo(p.x, p.y));
        d.graphics.closePath().fillPath().lineStyle(3, 0xffffff, 1.0).strokePath();
    }
    _placePlayer(id) {
        const start = this.districts[id];
        if (!start) return;
        if (this.player) this.player.destroy();
        this.player = this.add.circle(start.center.x, start.center.y, 12, COLOR.PLAYER_DOT).setDepth(10).setStrokeStyle(3, 0x000000);
        this.cameras.main.pan(start.center.x, start.center.y, 600, "Power2");
    }
    _syncDistricts(serverDistricts, serverPlayers) {
        Object.entries(serverDistricts).forEach(([districtId, ownerId]) => {
            const d = this.districts[Number(districtId)];
            if (!d) return;
            const actualTeam = serverPlayers[ownerId] ? serverPlayers[ownerId].team : "neutral";
            if (d.owner !== actualTeam) {
                d.owner = actualTeam;
                this._redrawDistrict(d, actualTeam === "red" ? COLOR.TEAM_RED : (actualTeam === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL));
            }
        });
    }
    _syncPlayers(players) {
        Object.entries(players).forEach(([playerId, data]) => {
            if (playerId === socket.id) return;
            const district = this.districts[Number(data.districtId)];
            if (!district) return;
            if (!this.otherPlayers[playerId]) {
                this.otherPlayers[playerId] = { dot: this.add.circle(district.center.x, district.center.y, 10, COLOR.ENEMY_DOT).setDepth(3) };
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
    _calcCenter(p) { return { x: p.reduce((s, v) => s + v.x, 0) / p.length, y: p.reduce((s, v) => s + v.y, 0) / p.length }; }
    showLog(message) { window.dispatchEvent(new CustomEvent("NEW_LOG", { detail: message })); }
    updateStatusToReact() { window.dispatchEvent(new CustomEvent("UPDATE_STATUS", { detail: this.playerStats })); }
    _setupCamera() {
        const cam = this.cameras.main;
        cam.setBounds(0, 0, this.tiledMap.widthInPixels * MAP_SCALE, this.tiledMap.heightInPixels * MAP_SCALE);
        this.input.on("pointerdown", () => { this._dragMoved = false; });
        this.input.on("pointermove", (p) => {
            if (!p.isDown) return;
            if (p.getDistance() > 3) this._dragMoved = true;
            cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
            cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
        });
    }
}