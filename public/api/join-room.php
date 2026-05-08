<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// $headers = getallheaders();
// $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
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
$room_id = $input['room_id'] ?? '';
$guest_id = $userData['user_id'];

if (!$room_id) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Room IDが必要です']));
}

try {
    $pdo->beginTransaction();

    // 部屋の存在確認
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE id = ? AND status = 'waiting' FOR UPDATE");
    $stmt->execute([$room_id]);
    $room = $stmt->fetch();

    if (!$room) {
        throw new Exception("部屋が見つからないか、既に参加されています");
    }

    // 2. 現在の参加人数をチェック
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM room_players WHERE room_id = ?");
    $countStmt->execute([$room_id]);
    $currentCount = $countStmt->fetchColumn();

    if ($currentCount >= 4) {
        throw new Exception("この部屋は満員です（最大4名）");
    }

    // 3. 既に参加していないかチェック
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM room_players WHERE room_id = ? AND user_id = ?");
    $checkStmt->execute([$room_id, $guest_id]);
    if ($checkStmt->fetchColumn() > 0) {
        throw new Exception("既に参加済みです");
    }

    // 4. 中間テーブルに参加者を追加
    $insertStmt = $pdo->prepare("INSERT INTO room_players (room_id, user_id, joined_at) VALUES (?, ?, NOW())");
    $insertStmt->execute([$room_id, $guest_id]);

    // 5. 4人になったらステータスを更新する（任意）
    if ($currentCount + 1 >= 4) {
        $updateStatus = $pdo->prepare("UPDATE rooms SET status = 'playing' WHERE id = ?");
        $updateStatus->execute([$room_id]);
    }

    $pdo->commit();

    echo json_encode([
        'status' => 'success',
        'message' => 'Joined!',
        'data' => ['room_id' => $room_id]
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
