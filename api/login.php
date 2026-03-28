<?php

// CORS対策 (ReactからのPOSTリクエストを許可)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTION') exit();

require_once __DIR__ . '/../config/database.php';

// JWT作成用のヘルパー関数（Base64Urlエンコード）
function base64UrlEncode($data)
{
  return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

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
    if ($userCount >=2) {
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
  $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);

  $payload = json_encode([
    'user_id'    => $playerId,
    'username'   => $player['username'],
    'exp'        => time() + (60 * 60 * 24) // 有効期限：24時間
  ]);

  $base64UrlHeader  = base64UrlEncode($header);
  $base64UrlPayload = base64UrlEncode($payload);

  // 署名を作成（config/database.php で設定した $jwt_secret を使用）
  $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $jwt_secret, true);
  $base64UrlSignature = base64UrlEncode($signature);

  // 結合してJWT完成
  $jwt = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

  // 結果を返す

  echo json_encode([
    'status'         => 'success',
    'message'        => $message,
    'token'          => $jwt,
    'user'    => [
      'id'           => $player['id'],
      'username'     => $player['username'],
      'player_color' => $player['player_color'],
      'current_hp'   =>$player['current_hp'],
      'stamina'      => $player['stamina'],
      'atk'          => $player['atk'],
      'def'          => $player['def']
    ]
  ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();

    http_response_code(500);

  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
