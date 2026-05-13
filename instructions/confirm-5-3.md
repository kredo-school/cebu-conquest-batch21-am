📋 antigravity用 修正指示書：gameStartイベント受信とマップ画面遷移の実装
【目的】
サーバーからブロードキャストされる gameStart イベントを受信し、待機画面（WaitingView）から本番マップ画面（GameContainer）へ自動的に遷移させるフロントエンドの処理を実装する。

【対象ファイル】

src/store/useGameStore.ts (または .js)

src/hooks/useSocketEvents.ts (または Socketリスナーを定義しているファイル)

src/App.tsx

【前提（GDD v3.1 アーキテクチャ原則）】
画面遷移のトリガーはサーバーが管理する。ルーム内の全プレイヤーが準備完了した際、サーバーから gameStart イベントが送信されるため、クライアントはそれを受け取ってからPhaserキャンバスをマウントする。

【修正手順】

Step 1: Zustand Storeの更新
src/store/useGameStore.ts を修正し、ゲームが開始したかどうかを判定するフラグを追加してください。

追加するState: isGameStarted: 真偽値（初期値は false）。

追加するAction: setGameStarted: isGameStarted の状態を更新するアクション。

Step 2: Socketイベントの受信設定
src/hooks/useSocketEvents.ts を修正してください。

サーバーからの gameStart イベントを socket.on でリッスンする処理を追加してください。

イベントを受信したら、Step 1で作成した setGameStarted(true) を実行し、Zustandのステートを更新するようにしてください。

useEffect のクリーンアップ関数（socket.off）にも忘れずに gameStart の解除処理を追加してください。

Step 3: App.tsx でのルーティング制御
src/App.tsx を修正し、Zustandの isGameStarted ステートに応じて画面を出し分けるように変更してください。

Zustandから selectedGodId と isGameStarted の2つのステートを取得する。

以下の条件分岐（三項演算子など）でレンダリングするコンポーネントを制御する：

selectedGodId が無い（未選択）場合 ➔ <GodSelectionView/> を表示

selectedGodId はあるが、isGameStarted が false の場合 ➔ <WaitingView/> を表示

isGameStarted が true になった場合 ➔ <GameContainer/> を表示

【実行後の確認事項】

（※サーバー側の実装完了後）全プレイヤーが神を選択し終わったタイミングで、ブラウザのリロードなしに WaitingView から GameContainer（Phaserのゲームマップ）へ自動で切り替わるか。

GameContainer マウント時にPhaserの二重起動などのエラーが起きていないか。