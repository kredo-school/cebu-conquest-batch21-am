# NPC表示バグ修正指示書

## 🎯 目的
「セブとり合戦」のロビーで `ADD_NPC` を実行してもマップ上にNPCが表示されないバグを修正する。

## 🔍 確認済みの原因
NPC作成時に `districtId` が `null` のまま放置され、Phaser側の描画条件
（`this.districts[dId]` が存在すること）を満たせず、ドットが描画されない。
さらに NPC は `PLAYER_READY` フローを通らないため、ゲーム開始時にも初期陣地が割り当てられない。

## 📝 修正タスク（3ファイル）

---

### ▼ Task 1: `socket-server/server.js` を修正

#### 1-1. `ADD_NPC` ハンドラでNPCに初期 districtId を割り当てる

**現状（該当箇所）:**
```javascript
socket.on('ADD_NPC', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const roomState = rooms.get(roomId);
    if (!roomState) return;

    const currentCount = Object.keys(roomState.players).length;
    if (currentCount >= roomState.maxPlayers) return;

    const npcId = `npc_${Date.now()}`;
    const teamInfo = TEAM_CONFIG[currentCount];

    roomState.players[npcId] = {
        id: npcId,
        username: `猛将ラプパプ(${teamInfo.name})`,
        // ...
        districtId: null,  // ← 修正対象
        isDefending: false,
    };
    // ...
});
```

**修正後:**
```javascript
socket.on('ADD_NPC', () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const roomState = rooms.get(roomId);
    if (!roomState) return;

    const currentCount = Object.keys(roomState.players).length;
    if (currentCount >= roomState.maxPlayers) return;

    const npcId = `npc_${Date.now()}`;
    const teamInfo = TEAM_CONFIG[currentCount];

    // 🚀 修正: 既に占領されていない地区からNPCの初期スポーンを抽選
    const allDistrictIds = Object.keys(DISTRICTS_MASTER);
    const occupiedIds = new Set(Object.keys(roomState.districts));
    const freeDistrictIds = allDistrictIds.filter(id => !occupiedIds.has(id));
    
    // 空き地区が無ければマスタからランダム選出（フォールバック）
    const startDistrictId = freeDistrictIds.length > 0
        ? freeDistrictIds[Math.floor(Math.random() * freeDistrictIds.length)]
        : allDistrictIds[Math.floor(Math.random() * allDistrictIds.length)];

    roomState.players[npcId] = {
        id: npcId,
        username: `猛将ラプパプ(${teamInfo.name})`,
        dbUserId: null, token: null, godName: "セブの精霊",
        hp: 120, maxHp: 120, ap: 100, maxAp: 100,
        atk: 75, def: 55,
        team: teamInfo.id,
        teamColor: teamInfo.color,
        isReady: true,
        isNpc: true,
        districtId: String(startDistrictId), // 🚀 修正: 文字列で確実に格納
        isDefending: false,
    };

    // 🚀 修正: NPCの初期陣地もdistricts状態に反映（占領済みとして）
    roomState.districts[String(startDistrictId)] = npcId;

    io.to(roomId).emit(SERVER_EVENTS.GAME_LOG,
        `🤖 ${roomState.players[npcId].username} が ${DISTRICTS_MASTER[startDistrictId]?.name || startDistrictId} に展開しました！`
    );
    io.to(roomId).emit(SERVER_EVENTS.SYNC_STATE, roomState);
});
```

#### 1-2. `PLAYER_READY` でゲーム開始する時、NPCの districtId が確実にあるかを再確認

`PLAYER_READY` ハンドラ内、`roomState.status = 'playing'` を設定する直前に以下を追加：

```javascript
// 🚀 追加: ゲーム開始時、districtIdが未設定のNPCに緊急スポーン
Object.values(roomState.players).forEach(p => {
    if (p.isNpc && !p.districtId) {
        const allDistrictIds = Object.keys(DISTRICTS_MASTER);
        const occupiedIds = new Set(Object.keys(roomState.districts));
        const freeIds = allDistrictIds.filter(id => !occupiedIds.has(id));
        const fallbackId = freeIds[0] || allDistrictIds[0];
        p.districtId = String(fallbackId);
        roomState.districts[String(fallbackId)] = p.id;
        console.log(`🤖 [Room ${roomId}] NPC ${p.username} に緊急スポーン: ${fallbackId}`);
    }
});
```

---

### ▼ Task 2: `src/store.ts` を修正

`syncServerState` で `MAP_REPAINT` イベントを発火する箇所、現状は `data.players` をそのまま渡しているが、
Phaser側がオブジェクト形式を期待しているか配列形式を期待しているかを統一する必要がある。

**現状:**
```typescript
window.dispatchEvent(new CustomEvent('MAP_REPAINT', { 
  detail: { districts: data.districts, players: data.players } 
}));
```

**修正後:**
```typescript
// 🚀 修正: Phaser側の_syncPlayersはObject.entries()で処理するためオブジェクト形式で渡す
const playersAsObject = Array.isArray(data.players)
  ? data.players.reduce((acc: any, p: any) => { acc[p.id] = p; return acc; }, {})
  : (data.players ?? {});

window.dispatchEvent(new CustomEvent('MAP_REPAINT', { 
  detail: { districts: data.districts, players: playersAsObject } 
}));
```

---

### ▼ Task 3: `src/game/scenes/MainScene.js` を修正

`_syncPlayers` でNPCを描画する際、現状は人間プレイヤーと同じ白いドット (`COLOR.ENEMY_DOT`) で描画されている。
NPCと人間を視覚的に区別するため、NPCには専用の見た目を与える。

**現状:**
```javascript
_syncPlayers(players) {
    Object.values(this.otherPlayers).forEach((p) => {
      if (p.dot) p.dot.destroy();
    });
    this.otherPlayers = {};

    Object.entries(players).forEach(([playerId, data]) => {
      const rawId = data.districtId || data.currentDistrict || data.pos;
      const dId = normalizeId(rawId);

      if (playerId === socket.id) {
        this._myTeam = data.team?.toLowerCase() ?? null;
        this.currentDistrictId = dId;
        this._placePlayer(dId);
        this.isSelectionMode = false;
        return;
      }

      const d = this.districts[dId];
      if (d && d.center) {
        this.otherPlayers[playerId] = {
          dot: this.add
            .circle(d.center.x, d.center.y, 16, COLOR.ENEMY_DOT)
            .setDepth(900)
            .setStrokeStyle(5, 0x000000),
        };
      }
    });
}
```

**修正後:**
```javascript
_syncPlayers(players) {
    Object.values(this.otherPlayers).forEach((p) => {
      if (p.dot)   p.dot.destroy();
      if (p.label) p.label.destroy(); // 🚀 ラベルも破棄
    });
    this.otherPlayers = {};

    Object.entries(players).forEach(([playerId, data]) => {
      const rawId = data.districtId || data.currentDistrict || data.pos;
      const dId = normalizeId(rawId);

      // 🚀 修正: districtId が無効な場合は警告ログを出してスキップ（デバッグ用）
      if (!dId) {
        if (import.meta.env.DEV) {
          console.warn(`[MainScene] Player ${playerId} (${data.username}) has no valid districtId:`, data);
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
        // 🚀 修正: NPCと人間で色を切り替え
        const isNpc = data.isNpc === true;
        const dotColor = isNpc 
          ? 0xff00ff   // NPC: マゼンタ（目立つ色）
          : COLOR.ENEMY_DOT; // 人間: 白

        const dot = this.add
          .circle(d.center.x, d.center.y, 16, dotColor)
          .setDepth(900)
          .setStrokeStyle(5, 0x000000);

        // 🚀 追加: NPCには「NPC」ラベルを付ける
        let label = null;
        if (isNpc) {
          label = this.add
            .text(d.center.x, d.center.y - 24, '🤖', {
              fontSize: '16px',
              stroke: '#000',
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
```

---

## ✅ 動作確認手順

1. `socket-server/` で `node server.js` を再起動
2. ブラウザを2画面開いてログイン → 同じルームに入室
3. 一方の画面で `ADD_NPC` を発火（もしDevToolsから手動なら `socket.emit('ADD_NPC')`）
4. **期待結果:**
   - サーバーログに `🤖 ... が <地区名> に展開しました！` が出る
   - マップ上にマゼンタ色のドット＋🤖アイコンが表示される
   - DevToolsコンソールに `[MainScene] Player ... has no valid districtId` の警告が**出ない**
5. READYボタンを押してゲーム開始 → NPCがターン制で動き出す

## 🚨 注意事項

- `DISTRICTS_MASTER` のIDと `MainScene.js` の TMJ ファイルから読み込む地区IDが一致していることが前提。
  もしIDが一致していない場合（例: サーバーは `"11101"` だが TMJ は `13201` など）、別途 ID マッピングの修正が必要。
- 修正後も NPC が表示されない場合は、ブラウザの DevTools で以下を実行してデータ構造を確認：
```javascript
  window.useGameStore.getState().players
```
  各プレイヤーオブジェクトの `districtId` と `isNpc` フィールドを目視確認すること。

## 📌 けい・なお への共有事項

- けい: `DISTRICTS_MASTER` のIDが TMJ ファイルの実際の地区IDと一致しているか確認をお願いします。
  特に `cebu_map_本番用.tmj` の `spotName` レイヤーの ID を見て、`server.js` の `DISTRICTS_MASTER` と
  `ADJACENT_DISTRICTS` を実IDに合わせて更新が必要です。
- いっせい: ロビーで NPC を表示する場合、`players` 配列内のオブジェクトに `isNpc: true` フラグがあるので、
  `WaitingView.tsx` と `LobbyView.tsx` で「🤖 NPC」バッジを表示するとUI/UX的に親切です。