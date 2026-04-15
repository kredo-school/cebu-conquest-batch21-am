<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

// JWT認証チェック
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
    $userData = validateJWT($jwt);
    if (!$userData) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
        exit;
    }
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'No token provided']);
    exit;
}

// トークンから取得した本人のIDを使用
$userId = (int)$userData['user_id'];

try {
        // URLパラメータの user_id は無視し、JWTの userId で検索する（セキュリティ向上）
    $stmt = $pdo->prepare("SELECT id, username, player_color, max_hp, current_hp, stamina, atk, def FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
      echo json_encode(['status' => 'error', 'message' =>'User not found']);
      exit();
    }

// レスポンスの返却
    echo json_encode([
      'status'    => 'success',
      'data'      => $user
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

?>