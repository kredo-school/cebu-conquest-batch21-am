<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// 共通のデータベース設定を読み込む
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

// JWT認証チェック (検問)
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// JWTから「確実な本人」のIDを確定（なりすまし防止）
$currentUserId = (int)$userData['user_id'];

try {
    // フロントまたはNode.jsからのJSONを受け取る
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

        // バリデーション: 必須データの確認
    if (!isset($data['winner_id'], $data['loser_id'], $data['winner_score'], $data['loser_score'])) {
        echo json_encode(['status' => 'error', 'message' => 'Missing match data (winner_id, loser_id, etc.)']);
        exit();
    }

    // 2. バリデーション (keiへの回答書に合わせたキー名)
    $winnerId    = (int)$data['winner_id'];
    $loserId     = (int)$data['loser_id'];
    $winnerScore = (int)$data['winner_score'];
    $loserScore  = (int)$data['loser_score'];

    // --- 不正スコアの検証ロジック ---
    // セブ島の全スポット数は27なので、合計がそれ以上になるのは不正なデータ
    $maxSpots = 27;
    if (($winnerScore + $loserScore) > $maxSpots) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error', 
            'message' => "Invalid score: Total spots ({$winnerScore} + {$loserScore}) cannot exceed {$maxSpots}."
        ]);
        exit();
    }

    $pdo->beginTransaction();

    // 3. 試合結果を保存 (SQLのプレースホルダー不一致を修正)
    $sql = "INSERT INTO match_results (user_id, score, spots_count, created_at) VALUES (?, ?, ?, NOW())";
    $stmt = $pdo->prepare($sql);

    // 勝者の記録 (スコアは占領数に100を掛けた値を暫定スコアとする)
    $stmt->execute([$winnerId, $winnerScore * 100, $winnerScore]);

    // 敗者の記録 (スコアは占領数に10を掛けた値を暫定スコアとする)
    $stmt->execute([$loserId, $loserScore * 10, $loserScore]);

    // 4. プレイヤーの回復処理
    $updateUsers = $pdo->prepare("UPDATE users SET current_hp = max_hp, stamina = 100 WHERE id IN (?, ?)");
    $updateUsers->execute([$winnerId, $loserId]);

    $pdo->commit();

    // 5. 勝者の名前を取得してレスポンスを作る
    $stmtUser = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmtUser->execute([$winnerId]);
    $winnerName = $stmtUser->fetchColumn() ?: "Unknown";


    // 6. フロントエンドへのレスポンス
    echo json_encode([
        'status'  => 'success',
        'message' => 'Match results have been saved and players recovered!',
        'data'    => [
            'winner_name' => $winnerName,
            'total_spots_accounted' => ($winnerScore + $loserScore)
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}