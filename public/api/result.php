<?php
// src/api/result.php

require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

// JWT認証（確実な本人確認）
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$currentUserId = (int)$userData['user_id'];

try {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // バリデーション: room_key がないと部屋の特定ができない
    if (!isset($data['room_key'], $data['winner_id'], $data['loser_id'], $data['winner_score'], $data['loser_score'])) {
        throw new Exception('Missing required match data or room_key');
    }

    $roomKey     = $data['room_key'];
    $winnerId    = (int)$data['winner_id'];
    $loserId     = (int)$data['loser_id'];
    $winnerScore = (int)$data['winner_score'];
    $loserScore  = (int)$data['loser_score'];

    // 1. 重要：部屋とユーザーの紐付け検証 (不正防止)
    $checkPlayer = $pdo->prepare("
        SELECT COUNT(*) 
        FROM room_players rp
        JOIN rooms r ON rp.room_id = r.id
        WHERE r.room_key = ? AND rp.user_id = ?
    ");
    $checkPlayer->execute([$roomKey, $currentUserId]);
    if ($checkPlayer->fetchColumn() == 0) {
        http_response_code(403);
        exit(json_encode(['status' => 'error', 'message' => 'Forbidden: User not belong to this room']));
    }

    // 2. GDD v4.1準拠: 地区総数32のバリデーション
    $maxDistricts = 32;
    if (($winnerScore + $loserScore) > $maxDistricts) {
        throw new Exception("Invalid score: Total exceeds district limit ({$maxDistricts})");
    }

    $pdo->beginTransaction();

    // 3. 試合結果を永続化
    $sql = "INSERT INTO match_results (user_id, score, spots_count) VALUES (?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$winnerId, $winnerScore * 100, $winnerScore]);
    $stmt->execute([$loserId, $loserScore * 10, $loserScore]);

    // 4. プレイヤー回復処理 (GDD v4.1準拠: HP/AP上限100)
    $updateUsers = $pdo->prepare("UPDATE users SET current_hp = 100, stamina = 100 WHERE id IN (?, ?)");
    $updateUsers->execute([$winnerId, $loserId]);

    // 5. 部屋のステータス更新
    $updateRoom = $pdo->prepare("UPDATE rooms SET status = 'finished' WHERE room_key = ?");
    $updateRoom->execute([$roomKey]);

    // 6. 警告：全削除はNG。当該ルームの占領状況のみをクリア
    $clearOcc = $pdo->prepare("DELETE FROM occupations WHERE room_key = ?");
    $clearOcc->execute([$roomKey]);

    $pdo->commit();

    // 勝者の名前を取得
    $stmtUser = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmtUser->execute([$winnerId]);
    $winnerName = $stmtUser->fetchColumn() ?: "Unknown";

    echo json_encode([
        'status'  => 'success',
        'message' => 'Match results verified and saved!',
        'data'    => [
            'winner_name' => $winnerName,
            'total_districts' => ($winnerScore + $loserScore)
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}