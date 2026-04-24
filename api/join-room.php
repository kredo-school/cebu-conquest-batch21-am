<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/jwt_helper.php';

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
}

$userData = validateJWT($matches[1]);
if (!$userData) {
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Invalid Token']));
}

$input = json_decode(file_get_contents("php://input"), true);
$room_key = $input['room_id'] ?? '';
$guest_id = $userData['user_id'];

if (!$room_key) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Room IDが必要です']));
}

try {
    $pdo->beginTransaction();

    // 部屋の存在確認
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE room_key = ? AND status = 'waiting' FOR UPDATE");
    $stmt->execute([$room_key]);
    $room = $stmt->fetch();

    if (!$room) {
        throw new Exception("部屋が見つからないか、既に参加されています");
    }

    if ($room['host_user_id'] == $guest_id) {
        throw new Exception("自分が作成した部屋には参加できません");
    }

    // 更新
    $update = $pdo->prepare("UPDATE rooms SET guest_user_id = ?, status = 'playing' WHERE id = ?");
    $update->execute([$guest_id, $room['id']]);

    $pdo->commit();

    echo json_encode([
        'status' => 'success',
        'message' => 'Joined!',
        'data' => ['room_id' => $room_key]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}