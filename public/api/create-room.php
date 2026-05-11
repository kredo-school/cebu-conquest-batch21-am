<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// 1. フロントから届くJSONを解析
$input = json_decode(file_get_contents("php://input"), true);

// 🚀 重要：変数を try の外で定義し、フロントのID（例: MI3L94）を確実に保持する
$room_key = isset($input['roomId']) ? strtoupper(trim($input['roomId'])) : null;

if (!$room_key) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Front-end Room ID is missing']));
}

// 2. ユーザーIDの特定
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$host_id = 1; 
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches) && $matches[1] !== 'null') {
    $userData = validateJWT($matches[1]);
    if ($userData) $host_id = $userData['user_id'];
}

try {
    $pdo->beginTransaction();

    // 🚀 3. フロントが生成した英数字（$room_key）をそのままINSERT
    $stmt = $pdo->prepare("INSERT INTO rooms (room_key, host_user_id, status) VALUES (?, ?, 'waiting')");
    $stmt->execute([$room_key, $host_id]);

    $new_room_id = $pdo->lastInsertId();

    // 4. room_playersにも紐付け
    $insertHost = $pdo->prepare("INSERT INTO room_players (room_id, user_id, joined_at) VALUES (?, ?, NOW())");
    $insertHost->execute([$new_room_id, $host_id]);

    $pdo->commit();

    // 5. 成功レスポンス
    echo json_encode([
        'status' => 'success',
        'room_id' => $new_room_id,
        'room_key' => $room_key, // フロントへそのまま返す
        'message' => 'Room created with Front-end ID!'
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();

    // 重複エラー(1062)が起きた場合でも、定義済みの $room_key を安全に使用できる
    if (strpos($e->getMessage(), '1062') !== false) {
        $stmtCheck = $pdo->prepare("SELECT id FROM rooms WHERE room_key = ?");
        $stmtCheck->execute([$room_key]);
        $existing = $stmtCheck->fetch();
        
        exit(json_encode([
            'status' => 'success',
            'room_id' => $existing['id'],
            'room_key' => $room_key,
            'message' => 'Room already exists, proceeding...'
        ]));
    }

    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}