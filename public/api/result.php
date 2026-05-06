<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';

// HTTPメソッド制限（POST以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed. This endpoint requires POST.']);
    exit;
}

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
    $roomKey     = $data['room_key'] ?? null;

    // 本人確認（ログイン中のユーザーが勝者か敗者のどちらかであること）
    if ($currentUserId !== $winnerId && $currentUserId !== $loserId) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Forbidden: Match data mismatch']);
        exit;
    }

    // --- 不正スコアの検証ロジック ---
    // セブ島の全スポット数は27なので、合計がそれ以上になるのは不正なデータ
    $maxSpots = 32;
    if (($winnerScore + $loserScore) > $maxSpots) {
        http_response_code(400);
        exit(json_encode(['status' => 'error', 'message' => "Invalid score: Total exceeds {$maxSpots}"]));
    }

    $pdo->beginTransaction();

    // 3. 試合結果を保存 (SQLのプレースホルダー不一致を修正)
    $sql = "INSERT INTO match_results (user_id, score, spots_count) VALUES (?, ?, ?)";
    $stmt = $pdo->prepare($sql);

    // 勝者の記録 (スコアは占領数に100を掛けた値を暫定スコアとする)
    $stmt->execute([$winnerId, $winnerScore * 100, $winnerScore]);

    // 敗者の記録 (スコアは占領数に10を掛けた値を暫定スコアとする)
    $stmt->execute([$loserId, $loserScore * 10, $loserScore]);

    // 4. プレイヤーの回復処理
    $updateUsers = $pdo->prepare("UPDATE users SET current_hp = max_hp, stamina = 100 WHERE id IN (?, ?)");
    $updateUsers->execute([$winnerId, $loserId]);

    // 5. 部屋のステータスを完了に変更
    if ($roomKey) {
        $updateRoom = $pdo->prepare("UPDATE rooms SET status = 'finished' WHERE room_key = ?");
        $updateRoom->execute([$roomKey]);
    }

    // 6. 占領状況のクリア（次ゲームのためのリセット）
    $pdo->exec("DELETE FROM occupations");

    $pdo->commit();

    // 7. 勝者の名前を取得してレスポンスを作る
    $stmtUser = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmtUser->execute([$winnerId]);
    $winnerName = $stmtUser->fetchColumn() ?: "Unknown";


    // 8. フロントエンドへのレスポンス
    echo json_encode([
        'status'  => 'success',
        'message' => 'Match results have been saved and players recovered!',
        'data'    => [
            'winner_id'   => $winnerId,
            'winner_name' => $winnerName,
            'total_spots_accounted' => ($winnerScore + $loserScore)
        ]
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
