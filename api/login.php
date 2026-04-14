<?php

// CORS対策 (ReactからのPOSTリクエストを許可)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

try {
  // Reactから送られてきたJSONデータを受け取る
  $json = file_get_contents('php://input');
  $data = json_decode($json, true);

  if (empty($data['username'])) {
    echo json_encode(['status' => 'error', 'message' => 'Username has not been entered.']);
    exit();
  }

  $username = trim($data['username']);

  $pdo->beginTransaction();

  // 1. ユーザーが存在するかチェック
  $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
  $stmt->execute([$username]);
  $player = $stmt->fetch();

  // 2. 存在しなければ新規作成 
  if (!$player) {
    // 新規登録の前に検問！現在のプレイヤー人数をカウント
    $countStmt = $pdo->query("SELECT COUNT(*) FROM users");
    $userCount = $countStmt->fetch();

    // 2人以上いたらエラーにして追い返す
    if ($userCount >= 2) {
      $pdo->rollBack();
      echo json_encode([
        'status'    => 'error',
        'message'   => "The game is already full (max 2 players)."
      ]);
      exit();
    }

    // ランダムなプレイヤーカラーを生成
    $playerColor = sprintf('#%06X', mt_rand(0, 0xFFFFFF));

    // 初期ステータスを100に設定
    $insertSql = "INSERT INTO users (username, player_color, max_hp, current_hp, stamina, atk, def)
                  VALUES (?, ?, 100, 100, 100, 100, 100)";
    $stmtInsert = $pdo->prepare($insertSql);
    $stmtInsert->execute([$username, $playerColor]);

    $playerId = $pdo->lastInsertId();

    // 登録したユーザー情報を再取得
    $stmt->execute([$username]);
    $player = $stmt->fetch();
    $message = "Your registration is complete!";  //新規登録が完了しました！
  } else {
    $playerId = $player['id'];
    $message = "You have successfully logged in!";  //ログインに成功しました！
  }

  $pdo->commit();

  // JWT（トークン）の生成処理

  $payload = [
    'user_id'    => $playerId,
    'username'   => $player['username'],
    'exp'        => time() + (60 * 60 * 24) // 24時間有効
  ];

  // 共通関数を呼び出してJWTを生成
  $jwt = generateJWT($payload);

  // フロントエンドが使いやすい形でレスポンスを返す
echo json_encode([
    'status'  => 'success',
    'message' => $message,
    'data'    => [ // ★dataキーで包む
        'token' => $jwt,
        'user'  => [
            'id'           => (int)$player['id'],
            'username'     => $player['username'],
            'player_color' => $player['player_color'],
            'current_hp'   => (int)$player['current_hp'],
            'stamina'      => (int)$player['stamina']
        ]
    ]
], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();

  http_response_code(500);

  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
