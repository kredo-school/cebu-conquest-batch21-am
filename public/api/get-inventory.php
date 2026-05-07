<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限（GET以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method Not Allowed. This endpoint requires GET.'
    ]);
    exit;
}

// JWT認証チェック (検問)
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
    $userData = validateJWT($jwt);
    
    if (!$userData) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => '無効なトークンです']);
        exit;
    }
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => '認証が必要です']);
    exit;
}

// GETパラメータからではなく、JWT（ログイン情報）からユーザーIDを確定させる
$userId = (int)$userData['user_id'];

try {

    // カバン（user_items）と アイテム図鑑（items）を結合して、持っているアイテムの詳細を取得

    $sql = "SELECT
              ui.item_id,
              i.name AS item_name,
              i.description,
              i.buff_target,
              i.buff_value,
              ui.quantity
            FROM user_items ui
            JOIN items i ON ui.item_id = i.id
            WHERE ui.user_id = ?
            ORDER BY ui.item_id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
      'status'  => 'success',
      'data'    => $inventory
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}