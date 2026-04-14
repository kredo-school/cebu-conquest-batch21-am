<?php
// CORS対策
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

// JWT検問
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
    if (!validateJWT($jwt)) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Invalid token']);
        exit;
    }
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Authorization required']);
    exit;
}

try {
    // 占領数順にランキングを取得
    $sql = "SELECT u.username, u.player_color, COUNT(o.spot_id) as score
            FROM users u
            LEFT JOIN occupations o ON u.id = o.user_id
            GROUP BY u.id
            ORDER BY score DESC";
            
    $stmt = $pdo->query($sql);
    $ranking = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 数値をキャスト
    foreach ($ranking as &$row) {
        $row['score'] = (int)$row['score'];
    }

    echo json_encode([
        'status' => 'success',
        'data'   => [
            'ranking' => $ranking
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}