<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/../config/database.php';

try {

    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // 1.バリデーション（必要なデータが送られてきているかチェック）
    if (!isset($data['user_id']) || !isset($data['score']) || !isset($data['territories_count'])){
      echo json_encode(['status' => 'error', 'message' => 'There is insufficient data']); //データが不十分です
      exit();
    }

    $userId = (int)$data['user_id'];
    $score = (int)$data['score'];
    $territoriesCount = (int)$data['territories_count'];

    $pdo->beginTransaction();

    // 2.match_results テーブルにデータを保存（INSERT）
    $sql = "INSERT INTO match_results (user_id, score, territories_count) VALUES (?, ?, ?, NOW())";
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
      ],
      'save_data' => [
        'user_id'           => $userId,
        'score'             => $score,
        'territories_count' => $territoriesCount
      ]
    ], JSON_UNESCAPED_UNICODE);

}catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}










?>