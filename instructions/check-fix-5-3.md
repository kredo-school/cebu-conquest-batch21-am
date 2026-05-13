# 🎯 Antigravity コード監査指示書：フロントエンド（いっせい担当領域）修正確認＆UIコンポーネント完全監査

## 1. 監査の目的
プロジェクト『Cebu Conquest（セブ獲り合戦）』のフロントエンド担当「いっせい」の実装コードに対し、前回指摘された問題点の修正確認、および `src/components/` フォルダ内のUIコンポーネントの徹底的な品質監査を実施する。
Week 5のテストフェーズを確実にクリアし、パフォーマンス劣化や予期せぬバグを防ぐための最終チェックとする。

## 2. 監査対象ディレクトリ・ファイル
- `src/store.ts` (Zustandストアの実装)
- `src/App.tsx` (ルートコンポーネント)
- `src/components/*.tsx` (配下の全UIコンポーネント：`TutorialView.tsx`, `ErrorNotification.tsx`, `GodSelectionView.tsx`, `WaitingView.tsx`, HUD関連など)

## 3. 必須検証項目（チェックリスト）

コードを解析し、以下の項目について【Pass / Fail / Warning】で判定を出力してください。Fail/Warningが存在する場合は、必ず修正用のコードスニペットを提示してください。

### 【フェーズA：前回指摘の修正確認】

#### [ ] 3-1. Zustandの永続化（`persist`ミドルウェア）の適用
- `src/store.ts` において、`zustand/middleware` から `persist` がインポートされ、ストアの生成に正しく適用されているか。
- `hasSeenTutorial` や `token` などの永続化すべきステートが `partialize` オプション等で適切に指定されているか。
- `localStorage.setItem` や `localStorage.getItem` といった手動のWeb Storage API呼び出しが**完全に削除**されているか。

#### [ ] 3-2. App.tsxのレンダリング最適化（`useShallow`の適用）
- `src/App.tsx` において、`zustand/react/shallow` から `useShallow` がインポートされているか。
- `useGameStore` から複数のステートや関数を取り出す際、`useShallow` を用いたオブジェクト比較、もしくはステートごとの個別セレクタ（分割代入の回避）が徹底されており、不要な再レンダリングを防ぐ構造になっているか。

### 【フェーズB：Componentsディレクトリ完全監査】

#### [ ] 3-3. Propsの型定義と `any` の完全排除
- `src/components/` 配下のすべての `.tsx` ファイルにおいて、コンポーネントが受け取る Props に厳密な `interface` または `type` が定義されているか。
- 暗黙的・明示的を問わず `any` が使用されていないか。

#### [ ] 3-4. レンダリング最適化（`React.memo` の適用）
- HUDパーツ（HPバー、APバーなど）や、状態を直接持たない静的なUIコンポーネント（`ErrorNotification` や `TutorialView` の外枠など）に対して、適切に `React.memo` が適用されているか。
- Propsに関数を渡す際、不必要な再生成を防ぐため `useCallback` が併用されているか（必要な場合）。

#### [ ] 3-5. UIレイヤー設計（Z-indexとスタイリング）
- Tailwind CSSのクラスが適切に使用されているか。
- モーダルやエラーUI（`ErrorNotification`, `TutorialView`）の `z-index` が、Phaserキャンバス（通常 `z-0`〜`z-10`）や他のHUD要素を確実にオーバーレイする設計（例: `z-[50000]`, `z-[300000]` など）になっているか。

#### [ ] 3-6. GDD v3.1 世界観・仕様の準拠
- テキストやUIに、GDD v3.0/3.1 で定義された「全5島制覇」「8神体制」「10ターン制限」などの仕様が正しく反映されているか。
- 「ミリタリー×サイバーパンク」な世界観に沿ったアニメーションやスタイリングが適用されているか。

## 4. 監査結果出力フォーマット
AIは以下の形式で監査結果を出力してください。
```text
# 🛡️ 監査結果レポート: いっせい担当領域（修正確認＆コンポーネント監査）

## 📊 総合評価: [完璧 / 軽微な修正が必要 / 重大なエラーあり]

## ✅ 合格項目 (Pass)
- [項目名]: [簡潔な理由と確認箇所]

## ⚠️ 警告・要修正項目 (Fail / Warning)
- [ファイル名]: [行番号付近]
  - [問題の分類 (例: レンダリング最適化, 型定義)]
  - [具体的な問題点とGDD・ルールとの乖離]
  - [修正案 (コードスニペット)]