<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json; charset=UTF-8");

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/../config/database.php';

try {

    // GETパラメータから user_id を取得
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

    if ($userId === 0) {
      echo json_encode(['status' => 'error', 'message' => "No user ID has been specified"]); //ユーザーIDが指定されていません
      exit();
    }

    // カバン（user_items）と アイテム図鑑（items）を結合して、持っているアイテムの詳細を取得

    $sql = "SELECT
              ui.item_id,
              i.name AS item_name,
              i.description,
              i.buff_target,
              i.buff_value,
              ui.quantity,
              ui.acquired_at
            FROM user_items ui
            JOIN items i ON ui.item_id = i.id
            WHERE ui.user_id = ?
            ORDER BY ui.acquired_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$userId]);
    $inventory = $stmt->fetchAll();

    echo json_encode([
      'status'  => 'success',
      'data'    => $inventory
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}






    ?>