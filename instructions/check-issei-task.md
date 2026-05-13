🚀 Antigravity Checklist: いっせい専用（フロントエンド・UI層）
1. アーキテクチャとイベントコントラクト（GDD v3.1準拠）
イベント名の定数化: shared/socketEvents.js や PhaserBridge.js で定義された定数（CLIENT_EVENTS.READY_TO_START や SERVER_EVENTS.gameStart など）を完全にインポートして使用しており、文字列の直書きは一切存在しないか。

Server Authority（サーバー正解）の徹底: LobbyView や WaitingView において、クライアント側の独自判断（例: 定員に達したから勝手に画面を遷移させる等）を廃止し、必ずサーバーからの gameStart 受信をトリガーにして onStart() を実行しているか。

チャットログのデータ型対応: サーバーから送られてくる username を、UIが期待する sender にマッピングして store.ts の addLog に渡せているか。また、addLog は文字列（システムログ）とオブジェクト（チャットログ）の両方をエラーなく処理できる型定義になっているか。

2. React コンポーネントとUIの安定性
警告・エラーのゼロ化: ESLintやTypeScriptの警告（useMemo や e などの未使用変数）をすべて解消し、VSCodeの「PROBLEMS」タブがクリーンな状態になっているか。

Keyプロパティの最適化: WaitingView などのリストレンダリング（.map）において、lp.playerId や chat-${i} のような一意の値を key に設定し、Reactの描画警告を完全に潰しているか。

React StrictMode の解除: main.tsx の <StrictMode> は外されているか（Phaserの二重初期化を防ぐため）。