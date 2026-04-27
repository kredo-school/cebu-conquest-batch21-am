# TASK: spot選択・移動バグの修正

> **対象ブランチ:** `feature/phaser-*`（あきら担当）
> **修正ファイル:** 3ファイル
> - `src/game/scenes/MainScene.js`
> - `src/components/StartPosModal.tsx`（いっせいと要確認）
> **作業前に必ず `CLAUDE.md` を読むこと**

---

## 問題の概要

本番マップ（`cebu_map_本番用.tmj`）では **spotId（5桁）** が移動・占領の基本単位だが、
現在のコードは **3桁のdistrictId** で動作することを前提にしている。
さらに `ADJACENCY` が全コメントアウトされているため、どこをクリックしても
「隣接していません」と弾かれてゲームが進行しない。

### バグ一覧（3件）

| # | バグ | 場所 | 症状 |
|---|---|---|---|
| Bug1 | `ADJACENCY` が空 | `MainScene.js` L30付近 | 全クリックが隣接エラーになる |
| Bug2 | `_onMapClicked` で String/Number 型不一致 | `MainScene.js` `_onMapClicked()` | 比較が常に false になる |
| Bug3 | `StartPosModal` が3桁IDを使っている | `StartPosModal.tsx` | 本番マップの5桁spotIdと不一致 |

---

## 修正1：`ADJACENCY` の復元と spotId（5桁）への統一

**ファイル:** `src/game/scenes/MainScene.js`

コメントアウトされた `ADJACENCY` 定数をすべて削除し、以下で**完全に置き換える**。
**Number キー・Number 配列で統一すること（文字列キー禁止）。**

```js
// src/game/scenes/MainScene.js
// ─── 既存の ADJACENCY 定数（コメントアウト含む全体）を以下で置き換える ───

const ADJACENCY = {
  // ── セブ市街地エリア（エリアID: 11）──
  11101: [11102, 11104, 11105, 11120],
  11102: [11101, 11104, 11106, 11108],
  11103: [11101, 11105, 11201, 11301],
  11104: [11101, 11102, 11105, 11401],
  11105: [11101, 11103, 11104, 11301],
  11106: [11102, 11108],
  11108: [11102, 11106, 11109, 11112],
  11109: [11108, 11112, 11113],
  11112: [11108, 11109, 11113, 11116, 11119],
  11113: [11109, 11112, 11117, 11118, 11119],
  11115: [11118, 11119],
  11116: [11112, 11119, 11120],
  11117: [11113, 11118],
  11118: [11113, 11115, 11117, 11119],
  11119: [11112, 11113, 11115, 11118, 11120, 11121],
  11120: [11101, 11116, 11119, 11121],
  11121: [11119, 11120],
  // ── 北部エリア（エリアID: 13）──
  13101: [13102, 13103],
  13102: [13101, 13103, 13201],
  13103: [13101, 13102, 13201, 13204],
  13201: [13102, 13103, 13204],
  13204: [13103, 13201],
};
```

> **⚠️ 注意:** 上記は暫定の隣接定義。本番マップの実際のポリゴン配置に合わせて
> けいと相談しながら追加・修正すること。
> `socket-server/server.js` の `ADJACENT_DISTRICTS`（文字列キー）と
> **論理的に一致していること**を必ず確認する。

---

## 修正2：`_onMapClicked()` の型統一（String → Number）

**ファイル:** `src/game/scenes/MainScene.js`

`_onMapClicked` メソッド全体を以下で**置き換える**。

```js
// src/game/scenes/MainScene.js

_onMapClicked(x, y) {
  if (this._dragMoved) return;
  const worldPoint = this.cameras.main.getWorldPoint(x, y);

  // _getDistrictAtPoint は districts のキー（Number）をそのまま返す
  // 本番マップではズームが十分なら spotId（5桁 Number）が返る
  const spotId = this._getDistrictAtPoint(worldPoint.x, worldPoint.y);
  if (!spotId) return;

  if (this.isSelectionMode) {
    // ── 初期スポット選択フェーズ ──
    SoundManager.playSe('click');
    Object.values(this.districts).forEach((d) => this._redrawDistrict(d, COLOR.NEUTRAL));
    this._redrawDistrict(this.districts[spotId], COLOR.HIGHLIGHT, 0.8);

    emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
      districtId: spotId,                                       // Number のまま渡す
      districtName: this.districts[spotId]?.name ?? String(spotId),
    });

  } else {
    // ── プレイ中：移動・攻撃フェーズ ──

    // ✅ Number 同士で同一スポット判定
    if (spotId === this.currentDistrictId) return;

    // ✅ ADJACENCY は Number キー・Number 配列なので型一致
    const neighbors = ADJACENCY[this.currentDistrictId] ?? [];
    if (!neighbors.includes(spotId)) {
      this.showLog("⚠️ 隣接していないスポットには行動できません。");
      return;
    }

    SoundManager.playSe('click');
    this._pendingTargetId = spotId;                             // Number で保持

    const targetOwner = (this.districts[spotId]?.owner ?? "neutral").toLowerCase();
    const isMyTerritory = targetOwner === this._myTeam;
    const isNeutral     = targetOwner === "neutral";

    emitToReact(PHASER_TO_REACT.SELECT_DISTRICT, {
      districtId: spotId,                                       // Number
      districtName: this.districts[spotId]?.name ?? String(spotId),
      isMyTerritory,
      isNeutral,
    });

    if (isMyTerritory) {
      this.showLog(`🚚 移動先: ${this.districts[spotId]?.name}`);
    } else {
      this.showLog(`🎯 攻撃対象: ${this.districts[spotId]?.name}`);
    }
  }
}
```

---

## 修正3：`_loadDistrictsFromTMJ()` にデバッグログを追加

**ファイル:** `src/game/scenes/MainScene.js`

`_loadDistrictsFromTMJ` メソッドの**末尾**（`});` の直後、メソッド閉じ括弧の前）に以下を追加する。

```js
// src/game/scenes/MainScene.js
// _loadDistrictsFromTMJ() の末尾に追加

    // ✅ DEV確認：ロードされたIDとレイヤー種別を出力
    if (import.meta.env.DEV) {
      const summary = {};
      Object.values(this.districts).forEach((d) => {
        summary[d.type] = summary[d.type] ?? [];
        summary[d.type].push(d.id);
      });
      console.log("[TMJ] ロード結果:", summary);
      console.log("[TMJ] 合計:", Object.keys(this.districts).length, "オブジェクト");
    }
```

> **確認方法:** ブラウザのコンソールで `[TMJ] ロード結果:` を探す。
> `spotName: [11101, 13101, ...]` のような5桁IDが表示されれば正常。
> 表示されない場合は本番TMJに `spotName` レイヤーが存在しないことを意味する。

---

## 修正4：`StartPosModal.tsx` を本番spotIdに対応させる

**ファイル:** `src/components/StartPosModal.tsx`（いっせい担当ファイルだが今回は変更OK）

`START_CANDIDATES` 配列を以下で**完全に置き換える**。
IDは本番TMJの `spotName` レイヤーに存在する5桁IDと一致させること。

```tsx
// src/components/StartPosModal.tsx

// ✅ 本番マップの spotId（5桁）に対応
// ※ このIDリストはTMJの spotName レイヤーに実在するIDのみ記載すること
const START_CANDIDATES = [
  // ── セブ市街地エリア（エリアID: 11）──
  { id: 11101, name: "Maya Port（マヤ港）" },
  { id: 11102, name: "Sugarcane Field（サトウキビ畑）" },
  { id: 11108, name: "Farmer House（農家）" },
  { id: 11112, name: "Bogo Transit Terminal（ボゴバスターミナル）" },
  { id: 11113, name: "Bogo Hilltop Shrine（ボゴ丘の神社）" },
  // ── セブ市街地（エリアID: 13）──
  { id: 13101, name: "IT Park（ITパーク）" },
  { id: 13102, name: "Waterfront Hotel（ウォーターフロントホテル）" },
  { id: 13103, name: "Ayala Malls Center（アヤラモール）" },
  { id: 13204, name: "Basilica del Santo Nino（サント・ニーニョ大聖堂）" },
  // ── 必要に応じて本番TMJのspotNameレイヤーを確認して追加する ──
];
```

> **⚠️ 重要:** 上記のIDと名前は本番TMJから抽出した実データ。
> TMJに存在しないIDを追加しないこと（ポリゴンがなく選択できない）。
> 追加・削除は `cebu_map_本番用.tmj` の `spotName` レイヤーを必ず確認してから行うこと。

---

## 修正5：`_syncPlayers()` のフィールド優先順を修正

**ファイル:** `src/game/scenes/MainScene.js`

`_syncPlayers` メソッド内の `rawId` 取得部分を以下に置き換える。

```js
// src/game/scenes/MainScene.js  _syncPlayers() 内

// 変更前:
const rawId = data.districtId || data.currentDistrict || data.pos;

// 変更後（spotId を最優先に）:
const rawId = data.spotId          // ✅ サーバーが spotId を返す場合
           ?? data.districtId      // 後方互換（旧フィールド名）
           ?? data.currentDistrict // 後方互換
           ?? data.pos;            // 最終フォールバック
```

---

## 動作確認チェックリスト

修正後、以下をブラウザのコンソールとゲーム画面で確認する。

```
[ ] 1. コンソールに [TMJ] ロード結果: { spotName: [...] } が出力される
[ ] 2. spotName の配列に 11101, 13101 などの5桁IDが含まれる
[ ] 3. マップをズームインすると spotName レベルのラベルが表示される
[ ] 4. スポットをクリックするとハイライト（黄色）が表示される
[ ] 5. 初期配置フェーズでスポットを選択すると ActionPanel に ID が表示される
[ ] 6. プレイ中、隣接スポットをクリックするとログに「移動先:」または「攻撃対象:」が出る
[ ] 7. 隣接していないスポットは「⚠️ 隣接していません」と弾かれる
[ ] 8. コンソールに ADJACENCY 関連のエラーが出ていない
```

---

## よくある失敗と対処

### `[TMJ] ロード結果:` に spotName が出ない場合

本番TMJに `spotName` レイヤーが存在しない可能性がある。以下を確認：

```bash
# 本番TMJに spotName レイヤーがあるか確認
grep -o '"name":"spotName"' public/assets/maps/cebu_map_本番用.tmj
# → 何も出なければ spotName レイヤーが存在しない
```

存在しない場合は **Tiled で `spotName` レイヤーを追加**してポリゴンを描く必要がある。
その作業はあきら担当。

### クリックしてもスポットが選択されない場合

`_getDistrictAtPoint` がどの ID を返しているか確認する：

```js
// _onMapClicked の先頭に一時的に追加して確認
console.log('[click] spotId returned:', spotId, typeof spotId);
console.log('[click] currentDistrictId:', this.currentDistrictId, typeof this.currentDistrictId);
console.log('[click] neighbors:', ADJACENCY[this.currentDistrictId]);
```

確認後は必ず削除する。

### `ADJACENCY` のキーと一致しない場合

`this.currentDistrictId` が何の値かを確認する。
`normalizeId` を通していれば Number のはずだが、サーバーから文字列で来た場合は変換漏れの可能性がある。

---

## コミットメッセージ例

```bash
git add src/game/scenes/MainScene.js src/components/StartPosModal.tsx
git commit -m "fix: unify spotId to Number, restore ADJACENCY for production map"
```

---

*このタスク完了後、けいに ADJACENCY の内容が server.js の ADJACENT_DISTRICTS と一致しているか確認を依頼すること。*
