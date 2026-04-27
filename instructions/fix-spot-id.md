# 修正指示書: spot選択・移動のID不一致バグ

## 🔍 原因
Phaser(MainScene.js)とSocket.IOサーバー(server.js)でdistrictのID体系が
完全に食い違っている。

- Phaser側: TMJから読んだ 101〜402（数値）
- サーバー側: DISTRICTS_MASTERで定義した "11101"〜"11120"（文字列）

この不一致のため _syncDistricts() と _syncPlayers() でマップが
一切更新されない。

## 修正方針
**サーバー側のIDをTMJの実IDに合わせる**（Phaser側TMJは変更しない）

TMJの簡易版から確認できる実際のdistrictId:
- districtName層: 101, 102, 103, 104, 105（セブ市街地）
- districtName層: 201, 202（マクタン島）
- districtName層: 301, 302（北部）
- districtName層: 401, 402（南部）

---

## Task 1: `socket-server/server.js` を修正

### 1-1. DISTRICTS_MASTER を TMJ の実IDに合わせて書き換える

**現状の問題箇所:**
```javascript
const DISTRICTS_MASTER = {
    "11101": { name: "チチャロン地区", priority: 3, buff: { atk: 10, def: 0 } },
    "11102": { name: "マンゴー地区", ...
    // ↑ これらのIDはTMJに存在しない
};
```

**修正後（TMJの実IDに合わせる）:**
```javascript
const DISTRICTS_MASTER = {
    "101": { name: "歴史保護地区（Heritage District）", priority: 5, buff: { atk: 0, def: 15 } },
    "102": { name: "港湾・商業地区（Port & Market）", priority: 6, buff: { atk: 10, def: 5 } },
    "103": { name: "新都心・ビジネス地区（IT Park）", priority: 7, buff: { atk: 5, def: 5 } },
    "104": { name: "沿岸交易地区（Coastal Trade）", priority: 4, buff: { atk: 8, def: 8 } },
    "105": { name: "中央公園地区（Central Park）", priority: 5, buff: { atk: 5, def: 10 } },
    "201": { name: "リゾート・バトルゾーン（Resort Battle）", priority: 8, buff: { atk: 20, def: 0 } },
    "202": { name: "ゲートウェイゾーン（Gateway）", priority: 6, buff: { atk: 10, def: 10 } },
    "301": { name: "アドベンチャーゾーン（Adventure）", priority: 7, buff: { atk: 15, def: 5 } },
    "302": { name: "コースタルトレードゾーン（Coastal Trade North）", priority: 5, buff: { atk: 5, def: 10 } },
    "401": { name: "ヘリテージグルメゾーン（Heritage Gourmet）", priority: 6, buff: { atk: 0, def: 20 } },
    "402": { name: "サザンジャングルゾーン（Southern Jungle）", priority: 4, buff: { atk: 12, def: 8 } },
};
```

### 1-2. ADJACENT_DISTRICTS も実IDに合わせて書き換える

```javascript
const ADJACENT_DISTRICTS = {
    "101": ["102", "103", "104", "105"],
    "102": ["101", "104", "105", "401"],
    "103": ["101", "105", "201", "301"],
    "104": ["101", "102", "105", "401"],
    "105": ["101", "103", "104", "301"],
    "201": ["202", "101", "103"],
    "202": ["201"],
    "301": ["302", "103", "105"],
    "302": ["301"],
    "401": ["402", "102", "104"],
    "402": ["401"],
};
```

### 1-3. ADD_NPC の初期districtIdも実IDで指定

ADD_NPCハンドラ内で、NPC初期位置として `"101"` 〜 `"402"` の
いずれかを使用するように修正する（前回の指示書の修正と合わせる）。

---

## Task 2: `src/game/scenes/MainScene.js` を修正

### 2-1. ADJACENCY 定数を実IDに合わせて書き換える

**現状（コメントアウトされていて実質空）:**
```javascript
const ADJACENCY = {
  // 11101: ["11102", "11104", "11105", "11120"],
  // ...全部コメントアウトされている
};
```

**修正後（コメントアウトを外して実IDに書き換え）:**
```javascript
const ADJACENCY = {
    101: [102, 103, 104, 105],
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
```

### 2-2. _onMapClicked の隣接チェックのID比較を修正

現状のコードは String と Number が混在していて比較が不安定。
以下のように数値で統一する:

```javascript
} else {
  const myPos = this.currentDistrictId; // 数値のまま
  const targetId = id;                  // 数値のまま
  if (targetId === myPos) return;

  const neighbors = ADJACENCY[myPos] || [];
  if (neighbors.length > 0 && !neighbors.includes(targetId)) {
    this.showLog("⚠️ 隣接していない地区には行動できません。");
    return;
  }
  // ...以下はそのまま
```

### 2-3. _syncDistricts のID変換を確認・修正

```javascript
_syncDistricts(serverDistricts, serverPlayers) {
    Object.entries(serverDistricts).forEach(([dId, ownerId]) => {
      // サーバーからは "101" (文字列) で来るので数値に変換
      const d = this.districts[normalizeId(dId)];
      if (!d) {
        // 開発中のみ警告を出す
        if (import.meta.env.DEV) {
          console.warn(`[_syncDistricts] district ${dId} not found in Phaser. Available:`, Object.keys(this.districts).slice(0, 5));
        }
        return;
      }
      // ownerIdがnullや未登録の場合は中立として扱う
      const playerData = ownerId ? serverPlayers[ownerId] : null;
      const team = playerData?.team?.toLowerCase() ?? "neutral";
      
      if (!this.isSelectionMode && this._myTeam && team === this._myTeam && d.owner !== this._myTeam) {
        SoundManager.playSe('capture');
        this.effectManager?.playCapturePopup(d.center.x, d.center.y);
      }
      d.owner = team;
      const col = team === "red" ? COLOR.TEAM_RED : team === "blue" ? COLOR.TEAM_BLUE : COLOR.NEUTRAL;
      this._redrawDistrict(d, col, team === "neutral" ? 0 : 0.7);
    });
}
```

---

## ✅ 動作確認手順

1. `socket-server/` で `node server.js` を再起動
2. ブラウザでゲームにログインしてマップ画面を開く
3. ブラウザのDevToolsコンソールで以下を確認:
   - `[_syncDistricts] district XXX not found` の警告が**出ない**こと
4. マップ上でspot（101〜402）をクリック → ハイライトされること
5. ゲーム開始後、隣接するspotのみ攻撃・移動のモーダルが開くこと
6. 隣接していないspotをクリック → 「隣接していない」ログが出ること

## ⚠️ 注意

- `cebu_map_本番用.tmj` を使用している場合は `spotName` レイヤーのIDも確認が必要
- `mapConfig.js` で `USE_MAP: 'PRODUCTION'` になっている場合、本番マップのIDに合わせた
  追加修正が必要になる可能性がある
- 本番マップのspotのIDは `spotName` レイヤーの `properties[0].name` を確認すること