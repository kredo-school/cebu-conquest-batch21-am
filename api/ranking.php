<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json; charset=UTF-8");

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/../config/database.php';

try {
  // ランキングを集計するSQL
  // occupations（占領テーブル）からユーザーごとに数を数え、多い順（DESC）に並べる

  $sql = "SELECT
              u.id AS user_id,
              u.username,
              u.player_color,
              COUNT(o.territory_id) AS territory_count
          FROM users u
          JOIN occupations o ON u.id = o.user_id
          GROUP BY u.id
          ORDER BY territory_count DESC, u.id ASC";

  $stmt = $pdo->query($sql);
  $ranking = $stmt->fetchAll();

  // 何位か（ランク）を計算してデータに追加する
  $currentRank = 1;
  foreach ($ranking as $index => &$player) {
    $player['rank'] = $currentRank;
    $currentRank++;
  }

  echo json_encode([
    'status' => 'success',
    'data' => $ranking
  ], JSON_UNESCAPED_UNICODE);
  
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
