// api/ranking.php
<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'GET method required']);
    exit;
}

// 1. ルーム特定のたの room_key を取得 (クエリパラメータから)
$roomKey = $_GET['room_key'] ?? null;

try {
    // --- ルーム内ランキング (現在の占領状況) ---
    // occupations テーブルに room_key が存在することを前提にします
    $currentRanking = [];
    if ($roomKey) {
        $sqlCurrent = "SELECT 
                        u.username, 
                        u.player_color, 
                        COUNT(o.spot_id) AS score,
                        RANK() OVER (ORDER BY COUNT(o.spot_id) DESC) AS ranking
                   FROM users u
                   JOIN room_players rp ON u.id = rp.user_id
                   JOIN rooms r ON rp.room_id = r.id
                   LEFT JOIN occupations o ON u.id = o.user_id AND o.room_key = r.room_key
                   WHERE r.room_key = ?
                   GROUP BY u.id
                   ORDER BY ranking ASC";

        $stmtC = $pdo->prepare($sqlCurrent);
        $stmtC->execute([$roomKey]);
        $currentRanking = $stmtC->fetchAll(PDO::FETCH_ASSOC);

        foreach ($currentRanking as &$row) {
            $row['score'] = (int)$row['score'];
            $row['ranking'] = (int)$row['ranking'];
        }
    }

    // --- 累計スコアランキング (全試合の統計) ---
    // ここは room_key に依存せず、ユーザー全員の歴史的実績を出します
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
            'room_key'      => $roomKey,
            'current_match' => $currentRanking, // 指定した部屋の今の順位
            'all_time'      => $totalRanking    // 全体ランキング
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}