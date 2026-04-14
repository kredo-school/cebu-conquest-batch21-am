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
$authHeader = $headers['Authorization'] ?? '';

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
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // 1.バリデーション（必要なデータが送られてきているかチェック）
    if (!isset($data['user_id']) || !isset($data['score']) || !isset($data['territories_count'])){
      echo json_encode(['status' => 'error', 'message' => 'There is insufficient data']); //データが不十分です
      exit();
    }

    $score = (int)$data['score'];
    $territoriesCount = (int)$data['territories_count'];

    $pdo->beginTransaction();

    // 2.match_results テーブルにデータを保存（INSERT）
    $sql = "INSERT INTO match_results (user_id, score, territories_count, created_at) VALUES (?, ?, ?, NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId, $score, $territoriesCount]);

    // 3. 全プレイヤーの最終的なスコア状況を取得（判定用）
    // occupationsテーブルからリアルタイムの陣地数を集計する
    $stmtStats = $pdo->query("
         SELECT u.id, u.username, COUNT(o.territory_id) as final_score
         FROM users u
         LEFT JOIN occupations o ON u.id = o.user_id
         GROUP BY u.id
    ");
    $allStats = $stmtStats->fetchAll(PDO::FETCH_ASSOC);

    // 4. 勝者の判定ロジック
    $winnerName = "Draw";
    $highScore = -1;

    foreach ($allStats as $stat) {
      $currentScore = (int)$stat['final_score'];
      if ($currentScore > $highScore) {
        $highScore = $currentScore;
        $winnerName = $stat['username'];
      } elseif ($currentScore === $highScore && $highScore > 0) {
        $winnerName = "Draw";
      }
    }

    $pdo->commit();

    // 5. フロントエンドへのレスポンス
    echo json_encode([
      'status'       => 'success',
      'message'      => 'The match results have been saved!', //試合結果が保存されました
      'result'       =>[
        'winner'      => $winnerName,
        'top_score'   => $highScore,
        'my_id'       => $userId,
        'all_players' => $allStats // 全員のスコアが入っているのでランキング表示も可能！
      ]
    ], JSON_UNESCAPED_UNICODE);

}catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>