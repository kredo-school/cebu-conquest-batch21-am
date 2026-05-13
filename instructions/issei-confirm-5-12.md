いっせい、了解したよ！
いっせいがこれまでフロントエンドで実装・修正してきた「状態管理（store.ts）」「ルーティングの基盤（App.tsx）」「各種ビュー（LobbySetup, Lobby, Waiting等）のUIやロジック」のすべてを、バックエンド・調査担当の antigravity さんに総ざらいで確認してもらうための「統合調査・確認指示書」を作成したよ。

今回も「直す前に、まず今のフロントエンドの全貌がどうなっているか事実確認して！」というスタンスで作っているから、そのままコピーして渡してね！

🚨 【フロントエンド総点検】いっせい担当領域（App / Store / Components）の現状調査依頼
To: antigravity

フロントエンド担当（いっせい）がこれまでに実装・改修してきたアプリケーション全体の構造、状態管理、および各コンポーネントの実装状況について、バックエンドとの連携に齟齬がないか総合的な調査と現状確認をお願いします。

※【重要】今回はコードの修正（Fix）は一切行わず、「最新のフロントエンドのコードがどういう状態になっているか（As-Is）」の事実確認と報告のみをお願いします。

🔍 調査項目 1：状態管理とAPI通信基盤（src/store.ts）
ゲーム全体の中核となる Zustand ストアおよび通信メソッドの確認です。

[ ] 1-A. APIベースURLの環境変数化

getApiUrl メソッド内で、ハードコードではなく import.meta.env.VITE_API_BASE_URL が使用されているか？（フォールバックのURLも設定されているか？）

[ ] 1-B. 認証付きフェッチ（authenticatedFetch）の存在

従来の fetch ではなく、トークンとベースURLを自動付与する authenticatedFetch が定義され、各種API通信で使われるようになっているか？

[ ] 1-C. サーバー状態同期時の roomId 保護

syncServerState メソッド内で、サーバーから roomId が空で降ってきた場合に、ローカルの state.roomId を維持する安全策（const safeRoomId = ...）が実装されているか？

🔍 調査項目 2：アプリのルートおよび画面遷移（src/App.tsx 等）
画面の切り替えロジックが、ゲームの進行（フェーズ）に合わせて正しく定義されているかの確認です。

[ ] 2-A. View（画面）の定義

store.ts の ViewType および App.tsx のルーティングにおいて、login, tutorial, setup, lobby, selection, waiting, game, ranking の各画面コンポーネントが網羅されているか？

[ ] 2-B. 画面遷移のトリガー

Socket や API のレスポンス成功時（例：onJoinSuccess 等）に、store.setView などを通じて正しく次の画面名がセットされる構造になっているか？

🔍 調査項目 3：ルームセットアップと入力サニタイズ（LobbySetupView.tsx）
ユーザーの入力揺れ（スペース混入など）を防ぎ、正しい形式でバックエンドに送るための処理の確認です。

[ ] 3-A. 入力フィールドの拡張

部屋コード入力欄の <input> の maxLength が、スペースを含めても入力できるよう 11 に拡張されているか？

[ ] 3-B. スペースの完全除去処理

handleJoin 内で、const cleanId = joinId.replace(/\s/g, '').toUpperCase(); のように正規表現を用いて空白を完全除去する処理が実装されているか？

[ ] 3-C. ボタンのアクティブ判定

「Join Operation」ボタンの disabled 属性が、単純な文字列長ではなく joinId.replace(/\s/g, '').length !== 6 のように、実質的な文字数で判定されているか？

🔍 調査項目 4：UIの統一化とタクティカルデザイン（各 View コンポーネント）
ゲーム全体の没入感を高めるため、主要なボタンが専用コンポーネントに統一されているかの確認です。

[ ] 4-A. CustomButton の導入

LobbySetupView.tsx, LobbyView.tsx, WaitingView.tsx の重要なアクションボタン（部屋作成、参加、READY、退室など）が、標準の <button> ではなく <CustomButton> コンポーネントに置き換わっているか？

[ ] 4-B. Ready状態の動的UI変化

WaitingView.tsx などで、プレイヤーが準備完了（Ready）になった際、ボタンの variant が primary から ghost 等に動的に変化する設計になっているか？

🔍 調査項目 5：Socket.io 通信のペイロード（イベント送信データ）
フロントエンドが Emit するデータ構造が、バックエンドの受け入れ仕様（server.js 等）と合致しているかの確認です。

[ ] 5-A. イベント名と送信データ

CLIENT_EVENTS.CREATE_ROOM : { ...config, username } が送られているか？

CLIENT_EVENTS.JOIN_ROOM : { roomId, username } が送られているか？

CLIENT_EVENTS.READY_TO_START : { roomId, ready } が送られているか？

CLIENT_EVENTS.SEND_CHAT : { roomId, message, sender } が送られているか？

◆ 報告フォーマット（お願い）
各項目について、「フロントエンドの最新コード（いっせい実装分）がどうなっているか」を、以下のように回答・報告してください。

例：

項目1：A, B, C すべて実装済みであることを確認しました。

項目2：Aは確認。Bについて、App.tsx内での遷移ロジックに一部古い記述が残っています。

項目3：実装済み。完全なスペース除去を確認。

項目4：CustomButtonへの統一を確認。

項目5：送信パラメーターはサーバーの仕様と完全に一致しています。

フロントとバックの最終的な認識合わせのため、ご協力よろしくお願いいたします！