📋 antigravity用 修正指示書：TypeScriptエラー ts(2345) の解消
【目的】
src/hook/useGameEvents.ts において、ESLintの any 警告を修正した結果発生した TypeScriptエラー ts(2345) （Type 'unknown' is not assignable to type 'Record<string, unknown>'）を解消する。

【対象ファイル】

src/hook/useGameEvents.ts

【修正手順】

Step 1: 受信データ用インターフェースの定義
useGameEvents.ts の上部（インポート群の下あたり）に、サーバーから受信するプレイヤー情報の型を定義するインターフェースを追加してください。

TypeScript
// サーバーから受信するプレイヤーデータの型定義
interface ServerPlayerPayload {
  playerId: string;
  username?: string;
  playerName?: string;
  godId: number | null;
  isReady?: boolean;
  [key: string]: unknown; // 将来的な拡張を許容
}

// syncStateなどの全体ペイロードの型定義
interface SyncStatePayload {
  players: ServerPlayerPayload[];
  [key: string]: unknown;
}
Step 2: イベントハンドラ内の型アサーションの修正
エラーが発生している62行目付近のイベントハンドラ（syncState や lobbyUpdated など）を修正し、引数 data を unknown として受け取った後、Step 1で定義した型にアサーションしてから map 処理を行うように変更してください。

TypeScript
// 修正イメージ（該当するイベントハンドラに合わせて適宜調整してください）
const handleLobbyUpdated = (data: unknown) => {
  // data を SyncStatePayload 型としてキャスト
  const payload = data as SyncStatePayload;

  if (payload && Array.isArray(payload.players)) {
    // p の型を ServerPlayerPayload として扱う
    const formattedPlayers = payload.players.map((p: ServerPlayerPayload) => ({
      playerId: p.playerId,
      username: p.username,
      playerName: p.playerName,
      godId: p.godId,
      isReady: p.isReady,
      // ...他のプロパティ
    }));
    
    // Storeを更新（ここは既存の処理のまま）
    setLobbyPlayers(formattedPlayers);
  }
};
【実行後の確認事項】

VS Code上で useGameEvents.ts の62行目付近に出ていた赤波線（ts(2345)）が消え、エラーが0になっていること。

TypeScriptのビルド（npm run build または Viteのコンソール）がエラーなく通ること。