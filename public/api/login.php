<?php
require_once 'api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限（POST以外は405を返す）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode([
    'status' => 'error',
    'message' => 'Method Not Allowed. This endpoint requires POST.'
  ]);
  exit;
}

// フロント(issei)からの入力を受け取る
$input = json_decode(file_get_contents("php://input"), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';
$security_question = trim($input['security_question'] ?? '');
$security_answer = trim($input['security_answer'] ?? '');

// ✨ $security_question と $security_answer もチェック対象に入れる
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
    // --- 【A. 既存ユーザー：ログイン処理】 ---
    if (!password_verify($password, $user['password'])) {
      throw new Exception("パスワードが正しくありません", 401);
    }
    $message = "You have successfully logged in!";
  } else {
    // --- 新規ユーザーの場合：登録処理 ---

    // 登録の時だけ、質問と答えがあるかチェックする
    if (!$security_question || !$security_answer) {
      throw new Exception("新規登録には秘密の質問と答えが必要です", 400);
    }

    // 文字数制限
    if (mb_strlen($username) < 3 || mb_strlen($username) > 15) {
      throw new Exception("ユーザー名は3〜15文字で入力してください", 400);
    }
    if (strlen($password) < 8) {
      throw new Exception("パスワードは8文字以上で設定してください", 400);
    }

    // 人数制限チェック（最大4名）
    $countStmt = $pdo->query("SELECT COUNT(*) FROM users");
    if ($countStmt->fetchColumn() >= 100) {
      throw new Exception("満員です（最大4名まで）", 403);
    }

    // パスワードをハッシュ化して保存
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $hashedAnswer = password_hash($security_answer, PASSWORD_DEFAULT);
    $playerColor = sprintf('#%06X', mt_rand(0, 0xFFFFFF));

    $insertSql = "INSERT INTO users (username, password, security_question, security_answer, player_color, max_hp, current_hp, stamina, atk, def)
                      VALUES (?, ?, ?, ?, ?, 100, 100, 100, 100, 100)";
    $insertStmt = $pdo->prepare($insertSql);

    // ここで実行。失敗した場合はcatchに飛びます
    $insertStmt->execute([
      $username,
      $hashedPassword,
      $security_question,
      $hashedAnswer,
      $playerColor
    ]);

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
  
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    // HTTPステータスコードをセット（例外にコードがあればそれ、なければ500）
    $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
    http_response_code($code);
    
    echo json_encode([
        'status' => 'error', 
        'message' => $e->getMessage()
    ]);
}