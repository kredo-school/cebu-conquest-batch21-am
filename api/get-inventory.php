<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Authorizationを追加
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

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
              ui.quantity,
              ui.acquired_at
            FROM user_items ui
            JOIN items i ON ui.item_id = i.id
            WHERE ui.user_id = ?
            ORDER BY ui.acquired_at DESC";

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

    ?>