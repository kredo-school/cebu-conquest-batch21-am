<?php
// CORS対策
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// HTTPメソッド制限（GET以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method Not Allowed. This endpoint requires GET.'
    ]);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/jwt-helper.php';

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
    $sqlCurrent = "SELECT 
                        u.username, 
                        u.player_color, 
                        COUNT(o.spot_id) AS score,
                        RANK() OVER (ORDER BY COUNT(o.spot_id) DESC) AS ranking
                   FROM users u
                   LEFT JOIN occupations o ON u.id = o.user_id
                   GROUP BY u.id
                   ORDER BY ranking ASC";

    $stmtC = $pdo->query($sqlCurrent);
    $currentRanking = $stmtC->fetchAll(PDO::FETCH_ASSOC);

    // 数値をキャスト
    foreach ($currentRanking as &$row) {
        $row['score'] = (int)$row['score'];
        $row['ranking'] = (int)$row['ranking'];
    }

    // 2. 累計スコアランキング（match_resultsテーブルから集計）
    $sqlTotal = "SELECT 
                    u.username, 
                    u.player_color,
                    SUM(m.score) AS total_score,
                    RANK() OVER (ORDER BY SUM(m.score) DESC) AS ranking
                 FROM users u
                 JOIN match_results m ON u.id = m.user_id
                 GROUP BY u.id
                 ORDER BY ranking ASC
                 LIMIT 10";

    $stmtT = $pdo->query($sqlTotal);
    $totalRanking = $stmtT->fetchAll(PDO::FETCH_ASSOC);

    foreach ($totalRanking as &$row) {
        $row['total_score'] = (int)$row['total_score'];
        $row['ranking'] = (int)$row['ranking'];
    }

    echo json_encode([
        'status' => 'success',
        'data'   => [
            'current_match' => $currentRanking,
            'all_time'      => $totalRanking
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
