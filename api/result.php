<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

// JWT認証チェック (検問)
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
    $userData = validateJWT($jwt);
    
    if (!$userData) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => '無効なトークンです']);
        exit;
    }
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => '認証が必要です']);
    exit;
}

// 【重要】JWTから「確実な本人」のIDを確定
$userId = (int)$userData['user_id'];

try {
    // フロントまたはNode.jsからのJSONを受け取る
    $input = json_decode(file_get_contents("php://input"), true);

    // 2. バリデーション (keiへの回答書に合わせたキー名)
    $winnerId   = (int)($input['winner_id'] ?? 0);
    $loserId    = (int)($input['loser_id'] ?? 0);
    $winnerScore = (int)($input['winner_score'] ?? 0);
    $loserScore  = (int)($input['loser_score'] ?? 0);

    if (!$winnerId || !$loserId) {
        echo json_encode(['status' => 'error', 'message' => 'winner_id and loser_id are required']);
        exit();
    }

    $pdo->beginTransaction();

    // 2.match_results テーブルにデータを保存（INSERT）
    $sql = "INSERT INTO match_results (user_id, score, territories_count, created_at) VALUES (?, ?, ?, NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId, $score, $territoriesCount]);

    // 3. データベースに保存 (schema.sql の spots_count カラムに合わせる)
    // 勝者のレコード
    $sql = "INSERT INTO match_results (user_id, score, spots_count) VALUES (?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$winnerId, $winnerScore, $winnerScore]); // scoreを暫定的にspots_countとしても扱う

    // 敗者のレコード
    $stmt->execute([$loserId, $loserScore, $loserScore]);

    $pdo->commit();

    // 4. 勝者の名前を取得してレスポンスを作る
    $stmtUser = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmtUser->execute([$winnerId]);
    $winnerName = $stmtUser->fetchColumn() ?: "Unknown";


    // 5. フロントエンドへのレスポンス
    echo json_encode([
        'status'  => 'success',
        'message' => 'Match results have been saved!',
        'data'    => [
            'winner'      => $winnerName,
            'winner_id'   => $winnerId,
            'top_score'   => $winnerScore,
            'match_id'    => $pdo->lastInsertId()
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}