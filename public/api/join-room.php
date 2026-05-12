<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

$input = json_decode(file_get_contents("php://input"), true);
// 🚀 フロントが入力した英数字（8FSDY6等）
$room_key = strtoupper(trim($input['roomId'] ?? '')); 

if (!$room_key) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Room ID is missing']));
}

// ユーザーID取得
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$current_user_id = 1; 
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches) && $matches[1] !== 'null') {
    $userData = validateJWT($matches[1]);
    if ($userData) $current_user_id = $userData['user_id'];
}

try {
    $pdo->beginTransaction();

    // 🚀 フロントが作った英数字(room_key)でレコードを特定する
    $stmt = $pdo->prepare("SELECT id FROM rooms WHERE room_key = ? LIMIT 1");
    $stmt->execute([$room_key]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$room) {
        throw new Exception("指定されたコード [{$room_key}] は登録されていません。");
    }

    $internal_id = $room['id'];

    // 🚀 roomsテーブルにゲストとして登録
    $update = $pdo->prepare("UPDATE rooms SET guest_user_id = ?, status = 'active' WHERE id = ?");
    $update->execute([$current_user_id, $internal_id]);

    // 🚀 room_playersに参加者を追加
    $insert = $pdo->prepare("INSERT IGNORE INTO room_players (room_id, user_id, joined_at) VALUES (?, ?, NOW())");
    $insert->execute([$internal_id, $current_user_id]);

    $pdo->commit();

    echo json_encode([
        'status' => 'success',
        'message' => 'Joined!',
        'room_id' => $room_key // 🚀 フロント側はこの英数字で画面遷移する
    ]);

} catch (Exception $e) {
    if (isset($pdo)) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}