📋 antigravity用 修正指示書：HUD連携およびPhaser二重起動バグの修正
【目的】
Phaser側とReact（HUD）側のイベント名不一致による状態更新の不具合を修正し、また開発環境においてPhaserのキャンバスが2つ生成されてしまう（二重起動）問題を解決する。

【対象ファイル】

src/game/events/PhaserBridge.js

src/hook/useGameEvents.ts

src/main.tsx （または src/App.tsx）

【修正手順】

Step 1: イベント定数の定義とエクスポート
src/game/events/PhaserBridge.js を修正し、PhaserからReactへ送信するイベント名の定数オブジェクト PHASER_TO_REACT を追加してエクスポートしてください。

JavaScript
// 追加するコードのイメージ
export const PHASER_TO_REACT = {
  STATS_UPDATED: 'statsUpdated',
  GAME_LOG: 'gameLog',
  TURN_START: 'phaser:turnStart',
  // その他既存のイベントがあればここに追加
};
Step 2: カスタムフックでの定数の利用（ハードコードの排除）
src/hook/useGameEvents.ts を修正し、Step 1で定義した PHASER_TO_REACT をインポートしてください。
window.addEventListener および window.removeEventListener で使用している文字列の直接指定（'statsUpdated'、'gameLog'、'turnStart' など）を、すべて PHASER_TO_REACT のプロパティに置き換えてください。

TypeScript
// 修正イメージ
import { PHASER_TO_REACT } from '../game/events/PhaserBridge';

// ... (中略) ...
window.addEventListener(PHASER_TO_REACT.STATS_UPDATED, handleStatsUpdated);
// ...
Step 3: React.StrictMode の削除（Phaser二重起動の防止）
src/main.tsx （Reactのエントリポイント）を開き、コンポーネントツリーをラップしている <React.StrictMode> タグを削除（またはコメントアウト）してください。
※Vite環境では src/main.tsx に記述されていることが多いですが、もし src/App.tsx にある場合はそちらを修正してください。

TypeScript
// 修正前
<React.StrictMode>
  <App />
</React.StrictMode>

// 修正後
<App />
【実行後の確認事項】

HUD上のステータスやゲームログがPhaser側の変化に合わせて正しく更新されるか。

ブラウザをリロードした際、Phaserのゲーム画面（キャンバス）が1つだけ描画されているか（下に2つ目がはみ出していないか）。

修正が完了したら結果を報告してください。

