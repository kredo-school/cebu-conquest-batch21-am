<?php

// CORS対策 (ReactからのPOSTリクエストを許可)
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff"); // 追加：ブラウザによるMIMEタイプ推測を禁止

// プリフライトリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204); // 「中身はないけどOKだよ」とブラウザに伝える
  exit();
}

// HTTPメソッド制限（POST以外は405を返す）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode([
    'status' => 'error',
    'message' => 'Method Not Allowed. This endpoint requires POST.'
  ]);
  exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/jwt-helper.php';

// フロント(issei)からの入力を受け取る
$input = json_decode(file_get_contents("php://input"), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

if (!$username || !$password) {
  http_response_code(400);
  echo json_encode(['status' => 'error', 'message' => 'ユーザー名とパスワードを入力してください']);
  exit;
}

// 2. ユーザー名の文字数制限 (3〜15文字)
if (mb_strlen($username) < 3 || mb_strlen($username) > 15) {
  http_response_code(400);
  echo json_encode(['status' => 'error', 'message' => 'ユーザー名は3文字以上15文字以内で入力してください']);
  exit;
}

// 3. パスワードの文字数制限 (8文字以上)
if (strlen($password) < 8) {
  http_response_code(400);
  echo json_encode(['status' => 'error', 'message' => 'パスワードは8文字以上で設定してください']);
  exit;
}

try {
  $pdo->beginTransaction();

  // 1. ユーザーが存在するかチェック
  $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
  $stmt->execute([$username]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  $message = "";

  if ($user) {
    // --- 既存ユーザーの場合：パスワード検証 ---
    // パスワードがハッシュ化されていない古いデータへの対策も含め検証
    if (!password_verify($password, $user['password'])) {
      $pdo->rollBack();
      http_response_code(401);
      echo json_encode(['status' => 'error', 'message' => 'パスワードが正しくありません']);
      exit;
    }
    $message = "You have successfully logged in!";
  } else {
    // --- 新規ユーザーの場合：登録処理 ---

    // 人数制限チェック（最大2名）
    $countStmt = $pdo->query("SELECT COUNT(*) FROM users");
    if ($countStmt->fetchColumn() >= 2) {
      $pdo->rollBack();
      http_response_code(403);
      echo json_encode(['status' => 'error', 'message' => '満員です（最大2名まで）']);
      exit;
    }

    // パスワードをハッシュ化して保存
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $playerColor = sprintf('#%06X', mt_rand(0, 0xFFFFFF));

    $insertSql = "INSERT INTO users (username, password, player_color, max_hp, current_hp, stamina, atk, def)
                      VALUES (?, ?, ?, 100, 100, 100, 100, 100)";
    $insertStmt = $pdo->prepare($insertSql);

    // ここで実行。失敗した場合はcatchに飛びます
    $insertStmt->execute([$username, $hashedPassword, $playerColor]);

    // 登録した情報を再取得
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    $message = "Your registration is complete!";
  }

  $pdo->commit();

  // JWTトークンの生成 (jwt-helper.php の関数名に合わせる)
  $token = createJWT($user['id'], $user['username']);

  // レスポンス（dataキーで包む形式を維持）
  echo json_encode([
    'status'  => 'success',
    'message' => $message,
    'data'    => [
      'token' => $token,
      'user'  => [
        'id'           => (int)$user['id'],
        'username'     => $user['username'],
        'player_color' => $user['player_color'],
        'current_hp'   => (int)$user['current_hp'],
        'max_hp'       => (int)$user['max_hp'],
        'stamina'      => (int)$user['stamina'],
        'atk'          => (int)$user['atk'],
        'def'          => (int)$user['def']
      ]
    ]
  ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) { // PDO特有のエラーをキャッチ
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    // 開発用：具体的なエラー理由を表示（本番では message を伏せるのが安全）
    echo json_encode(['status' => 'error', 'message' => 'DBエラー: ' . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'サーバーエラー: ' . $e->getMessage()]);
}