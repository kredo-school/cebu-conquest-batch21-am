<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/jwt_helper.php';

// JWT認証チェック
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Invalid or missing token']);
    exit;
}

// 誰の情報を取得するか決定
// パラメータに user_id があればそれを優先、なければトークンの主（自分）
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : (int)$userData['user_id'];


try {
    // ユーザー情報の取得 (HP, ATK, DEFなど)
    $stmt = $pdo->prepare("SELECT id, username, player_color, max_hp, current_hp, stamina, atk, def FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found']);
        exit();
    }

    // レスポンスの返却
    echo json_encode([
        'status' => 'success',
        'data'   => [
            'user' => [
                'id'           => (int)$user['id'],
                'username'     => $user['username'],
                'player_color' => $user['player_color'],
                'current_hp'   => (int)$user['current_hp'],
                'max_hp'       => (int)$user['max_hp'],
                'stamina'      => (int)$user['stamina'],
                'atk'          => (int)$user['atk'],
                'def'          => (int)$user['def']
            ]
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
