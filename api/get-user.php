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
      echo json_encode(['status' => 'error', 'message' =>'No user ID has been specified']);
      exit();
    }

    // ユーザー情報を取得
    $stmt = $pdo->prepare("SELECT id, username, player_color, current_hp, max_hp, stamina, funds, score FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userData = $stmt->fetch();

    if (!$userData) {
      echo json_encode(['status' => 'error', 'message' =>'User not found']);
      exit();
    }

    echo json_encode([
      'status'    => 'success',
      'data'      => $userData
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}



?>