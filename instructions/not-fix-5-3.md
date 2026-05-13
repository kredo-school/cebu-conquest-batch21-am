# 🎯 Antigravity コード監査指示書：フロントエンド（いっせい担当領域）Lobbyスキップバグ修正確認

## 1. 監査の目的
プロジェクト『Cebu Conquest』の本番環境テストにおいて発覚した、「神の選択（GodSelectionView）直後のWaitingView（Lobby）をスキップしてゲームが開始されてしまうバグ」の修正状況を監査する。
「神の選択完了」と「ゲームの準備完了（Ready）」のステートがフロントエンド上で完全に分離され、意図しない画面遷移やイベント送信が排除されているかを厳密にチェックする。

## 2. 監査対象ディレクトリ・ファイル
- `src/hooks/useGameEvents.ts` (Socket通信の状態同期リスナー)
- `src/components/GodSelectionView.tsx` (神選択コンポーネント)

## 3. 必須検証項目（チェックリスト）

コードを解析し、以下の項目について【Pass / Fail / Warning】で判定を出力してください。Fail/Warningが存在する場合は、必ず修正用のコードスニペットを提示してください。

### 【フェーズA：`useGameEvents.ts` のReady判定ロジック修正】
- [ ] **SYNC_STATE内のisReady判定**: `socket.on(SERVER_EVENTS.SYNC_STATE, ...)` 内で `setLobbyPlayers` を更新する際、`isReady` の判定に神のID（`p.selectedGodId` や `p.godId`）が使われていないか。純粋に `isReady: !!p.isReady` となっているか。
- [ ] **lobbyUpdated内のisReady判定**: `socket.on('lobbyUpdated', ...)` 内でロビー情報を更新する際も同様に、神のIDによる判定が完全に削除され、`isReady: !!p.isReady` となっているか。

### 【フェーズB：`GodSelectionView.tsx` の確定ボタン処理の修正】
- [ ] **READYイベントの誤送信防止**: 「Confirm Neural Link」等の神確定ボタンを押した際のハンドラー関数（例: `handleConfirm`）内で、誤ってサーバーへ `READY_TO_START` イベント（直接のSocket送信、またはPhaserBridge経由）を送信していないか。
- [ ] **ステートの直接変更防止**: 同ハンドラー内で、誤って Zustand ストアの `isGameStarted` を `true` に設定していないか。
- [ ] **正しい責務の分離**: 確定処理は、「Zustandへの `selectedGodId` 保存」と「`REACT_TO_PHASER.SET_AVATAR` (または `set_avatar`) を使ったアバター設定の通知」のみに留められ、画面遷移はApp層のルーティングに正しく委ねられているか。

## 4. 監査結果出力フォーマット
AIは以下の形式で監査結果を出力してください。
```text
# 🛡️ 監査結果レポート: いっせい担当領域 (Lobbyスキップバグ修正確認)

## 📊 総合評価: [完璧 (バグ修正完了) / 軽微な修正が必要 / 重大なエラーあり]

## ✅ 合格項目 (Pass)
- [項目名]: [簡潔な理由と確認箇所]

## ⚠️ 警告・要修正項目 (Fail / Warning)
- [ファイル名]: [行番号付近]
  - [問題の分類 (例: Ready判定の残存, イベントの誤送信)]
  - [具体的な問題点]
  - [修正案 (コードスニペット)]