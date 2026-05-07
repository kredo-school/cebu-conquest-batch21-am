<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// 1. JWT認証（Authorizationヘッダーからホストを特定）
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
}

$userData = validateJWT($matches[1]);
if (!$userData) {
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Invalid Token']));
}

$user_id = $userData['user_id'];
$input = json_decode(file_get_contents("php://input"), true);
$room_id = $input['room_id'] ?? '';

if (!$room_id) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Room IDが必要です']));
}

try {
    $pdo->beginTransaction();

    // 2. 部屋の存在確認と権限チェック（ホスト本人のみ開始可能）
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE id = ? FOR UPDATE");
    $stmt->execute([$room_id]);
    $room = $stmt->fetch();

    if (!$room) {
        throw new Exception("部屋が見つかりません");
    }

    if ($room['host_user_id'] != $user_id) {
        throw new Exception("ホスト以外はゲームを開始できません");
    }

    if ($room['status'] !== 'waiting') {
        throw new Exception("既にゲームが開始されているか、終了しています");
    }

    // 3. 現在の参加人数をチェック（2〜4人であること）
    // プランB（ホストもroom_playersに含まれる設計）に基づきカウント
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM room_players WHERE room_id = ?");
    $countStmt->execute([$room_id]);
    $currentCount = $countStmt->fetchColumn();

    if ($currentCount < 2) {
        throw new Exception("プレイヤーが2名以上揃うまで開始できません（現在は {$currentCount}名）");
    }
    
    if ($currentCount > 4) {
        // 万が一のガード
        throw new Exception("プレイヤー人数が上限(4名)を超えています");
    }

    // 4. ステータスを 'playing' に更新
    // これにより join-room.php 側の SELECT WHERE status = 'waiting' に引っかからなくなり、募集が締切られます
    $updateStatus = $pdo->prepare("UPDATE rooms SET status = 'playing' WHERE id = ?");
    $updateStatus->execute([$room_id]);

    $pdo->commit();

    echo json_encode([
        'status' => 'success',
        'message' => 'Game started!',
        'data' => [
            'room_id' => $room_id,
            'player_count' => $currentCount
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}