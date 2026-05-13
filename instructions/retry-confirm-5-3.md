# 🎯 Antigravity コード監査指示書：フロントエンド（いっせい担当領域）完全性チェック

## 1. 監査の目的
プロジェクト『Cebu Conquest（セブ獲り合戦）』のフロントエンド（React + Vite + TypeScript）担当である「いっせい」の実装コードを評価・検証する。
本番マップ全機能テスト（Week 5）を通過し、コード凍結（Week 6）へ進むための基準（GDD v3.1準拠、型安全性、パフォーマンス最適化）を満たしているか、厳格にチェックすること。

## 2. 監査対象ディレクトリ・ファイル
- `src/hooks/useGameEvents.ts`
- `src/components/ErrorNotification.tsx`
- `src/components/TutorialView.tsx`
- `src/App.tsx`
- `src/store.ts` (または関連するZustandストアファイル)
- `src/game/events/PhaserBridge.js` (または `.ts`) の呼び出し箇所

## 3. 必須検証項目（チェックリスト）

以下の項目について、コードを解析し【Pass / Fail / Warning】で判定を出力してください。Failが存在する場合は、修正用のコードスニペットを提示してください。

### [ ] 3-1. TypeScriptの型安全性と `any` の完全排除（ESLint準拠）
- `useGameEvents.ts` 内の `socket.on` のコールバック引数において、暗黙的・明示的を問わず `any` が使用されていないか。
- `unknown` で受け取ったペイロードが、Zustandのストア関数や `emitToPhaser` に渡される前に、適切な型（例: `Record<string, Player>`, `SyncStatePayload` など）に安全にキャストされているか。

### [ ] 3-2. 定数によるイベント管理（GDD 5-1, 5-2 準拠）
- React ↔ Phaser 間の通信（`emitToPhaser`, `window.addEventListener`）において、文字列の直書きが排除され、`REACT_TO_PHASER` および `PHASER_TO_REACT` の定数が使用されているか。
- Socket.IO のイベント名に `SERVER_EVENTS` の定数が使用されているか。
- 領土更新通知のイベント名が `TERRITORY_UPDATED`（末尾の 'd' あり）として扱われているか。

### [ ] 3-3. Zustandによる状態管理と永続化
- `store.ts` に `hasSeenTutorial` (boolean), `errorMessage` (string | null), `view` (string) などの適切なステートと、それらを更新するアクション（`completeTutorial`, `setErrorMessage`, `hideError` など）が定義されているか。
- `hasSeenTutorial` が `persist` ミドルウェアによって `localStorage` (例: `cebu-conquest-storage`) に正しく保存されるようになっているか。

### [ ] 3-4. クリーンアップ処理の徹底（メモリリーク防止）
- `useGameEvents.ts` の `useEffect` の `return` 内で、すべての `socket.off` と `window.removeEventListener` が漏れなく記述されているか。
- `ErrorNotification.tsx` において、`setTimeout` 実行後にコンポーネントがアンマウント、または `errorMessage` が変化した際に、`clearTimeout` によるクリーンアップが行われているか。

### [ ] 3-5. UIコンポーネントの仕様準拠
- **TutorialView.tsx**: GDD v3.0/3.1 に準拠したテキスト（全5島制覇、8神体制、10ターン制限）が含まれているか。スキップまたは完了時に `completeTutorial()` と `onComplete()` が発火するか。
- **ErrorNotification.tsx**: z-indexがPhaserキャンバスを覆う十分な高さ（例: `z-[300000]`）に設定されているか。アニメーション（tailwindcss等）が適切に設定されているか。
- **App.tsx**: チュートリアル未読・既読の判定(`hasSeenTutorial`)によるルーティングが正しく実装されているか。`ErrorNotification` がグローバルにレンダリングされるよう配置されているか。
- **main.tsx (App.tsxの親)**: `React.StrictMode` が削除されているか（Phaserの二重初期化防止のため）。

### [ ] 3-6. パフォーマンス最適化（FPS安定化）
- Zustandのステート取得時、不要な再レンダリングを防ぐためにセレクタが細かく分割されているか（例: `const hp = useGameStore(state => state.status.hp)`）。
- 静的な、または純粋な表示用コンポーネントに `React.memo` が適切に適用されているか。

## 4. 監査結果出力フォーマット
AIは以下の形式で監査結果を出力してください。
```text
# 🛡️ 監査結果レポート: いっせい担当領域 (React/TS/Zustand)

## 📊 総合評価: [完璧 / 軽微な修正が必要 / 重大なエラーあり]

## ✅ 合格項目 (Pass)
- [項目名]: [簡潔な理由]

## ⚠️ 警告・要修正項目 (Fail / Warning)
- [ファイル名]: [行番号付近]
  - [問題点]
  - [GDDまたはルールとの乖離]
  - [修正案 (コードスニペット)]