<?php
// CORS対策: Reactからのアクセスを許可
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");


// プリフライトリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/jwt_helper.php';

// 1. JWT認証（Authorizationヘッダーからユーザーを特定）
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => '認証トークンが必要です']);
    exit;
}

$userData = validateJWT($matches[1]); 
if (!$userData) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => '無効なトークンです']);
    exit;
}

$host_id = $userData['user_id']; // 連想配列のキー名

try {
    $pdo->beginTransaction();

    // 2. ユニークなRoom ID（5桁）の生成と重複チェック
    $is_unique = false;
    $room_key = "";

 while (!$is_unique) {
        $room_key = str_pad(mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
        $check = $pdo->prepare("SELECT id FROM rooms WHERE room_key = ? AND status != 'finished'");
        $check->execute([$room_key]);
        if (!$check->fetch()) $is_unique = true;
    }

    // 3. データベースへ登録
    $stmt = $pdo->prepare("INSERT INTO rooms (room_key, host_user_id, status) VALUES (?, ?, 'waiting')");
    $stmt->execute([$room_key, $host_id]);

    $pdo->commit();

    // 4. 成功レスポンス（500ms以内の応答を維持）
    echo json_encode([
        'status' => 'success',
        'room_id' => $room_key,
        'message' => 'Room created successfully!'
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}