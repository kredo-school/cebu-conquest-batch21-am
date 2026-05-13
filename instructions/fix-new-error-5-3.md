📋 antigravity用 修正指示書：GodSelectionViewとWaitingViewの同期バグ修正
【目的】
ロビー（待機）画面において、「選択した神が表示されない」「他プレイヤーが選択済みの神を重複選択できてしまう」「参加人数が正しく反映されない」という不具合を修正する。Socket.IOによるServer Stateの同期をReact（Zustand）に正しく反映させる。

【対象ファイル（想定）】

src/store/useGameStore.ts (または .js)

src/hooks/useSocketEvents.ts (または Socketのリスナーを定義している箇所)

src/components/GodSelectionView.tsx

src/components/WaitingView.tsx

【前提（GDD v3.1 アーキテクチャ原則）】
ゲームロジック・状態はすべてサーバー（Node.js + Socket.IO）が保持する。クライアント（React）はサーバーから送られてくる状態（Server State）をZustandに格納し、それをもとに描画を行う。

【修正手順】

Step 1: Zustand Storeの拡張
src/store/useGameStore.ts を修正し、ロビーの参加者全体の状態を管理するステートを追加してください。

lobbyPlayers: 現在ルームに参加している全プレイヤーの配列（それぞれの playerId と選択した godKey または godId を含む）。

setLobbyPlayers: サーバーから受信したプレイヤーリストを更新するアクション。

Step 2: Socketイベントの受信とStoreの更新
Socket.IOのイベントリスナー（例：useSocketEvents.ts または適切な初期化処理内）を修正してください。
サーバーから送られてくるロビー状態の更新イベント（例：syncState や lobbyUpdated 等）を受信した際、e.detail またはペイロードに含まれる参加プレイヤー一覧のデータを、Step 1で作成した setLobbyPlayers を使ってZustandに保存するように実装してください。

Step 3: GodSelectionView の修正（重複選択の防止）
src/components/GodSelectionView.tsx を修正してください。

Zustandから lobbyPlayers を取得する。

各神の選択ボタン（またはカード）をレンダリングする際、その神のIDが既に lobbyPlayers の誰かに選択されているか（godKey が一致するか）をチェックする。

誰かが既に選択している場合は、その神の選択要素を disabled 状態にし、視覚的にも「選択不可」であることが分かるようにスタイルを調整する。

プレイヤー自身が神を選択した際は、ただローカルのStateを変えるだけでなく、必ずSocket.IO経由でサーバーへ選択イベント（例: ACTION_SUBMIT や専用イベント）を送信する処理が含まれているか確認・修正する。

Step 4: WaitingView の修正（神の表示と人数の反映）
src/components/WaitingView.tsx を修正してください。

自身のローカルステートだけでなく、Zustandの lobbyPlayers を監視する。

lobbyPlayers.length を使用して、現在の正しい参加人数を表示する。

lobbyPlayers の配列をmapで展開し、ルームにいる全プレイヤーが選択した神のアイコンや名前が画面に一覧表示されるようにUIを修正する。

【実行後の確認事項】

プレイヤーAが神を選択した直後、別ブラウザのプレイヤーBの画面でその神が即座に「選択不可（disabled）」になるか。

プレイヤーが参加/神を選択するたびに、WaitingViewの人数カウントと選択された神のUIがリアルタイムに更新されるか。

実装においてサーバー側（Node.js）のイベント発行処理が不足していると判断した場合は、不足しているペイロード構造を指摘してください。