<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

require_once __DIR__ . '/../config/database.php';

try {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (empty($data['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'データが不足しています']);
        exit();
    }

    $userId = (int)$data['user_id'];

    $pdo->beginTransaction();

    // 1. ユーザーの現在のHPを取得
    $stmtUser = $pdo->prepare("SELECT current_hp FROM users WHERE id = ? FOR UPDATE");
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch();

    if(!$user) {
      $pdo->rollBack();
      echo json_encode(['status' => 'error', 'message' => "User not found" ]);
      exit();
    }

    // 2. 自分が占領している陣地の数をカウント（逃げ場があるかどうかの判定）
    $stmtOcc = $pdo->prepare("SELECT COUNT(*) AS count FROM occupations WHERE user_id = ?");
    $stmtOcc->execute([$userId]);
    $occ = $stmtOcc->fetch();
    $ownedCount = (int)$occ['count'];

    $message = "";
    $newHp = (int)$user['current_hp'];

    if ($ownedCount > 0) {
      //逃げ場あり！成功
      $message = "You successfully escaped to your territory!";
    } else {
      // 逃げ場なし！大ダメージペナルティ（例: HP -50）
      $penalty = 50;
      $newHp = max(0, $newHp - $penalty); //0未満にはしない

      $stmtUpdate = $pdo->prepare("UPDATE users SET current_hp = ? WHERE id = ?");
      $stmtUpdate->execute([$newHp, $userId]);

      $message = "No escape route! You took a massive penalty of {$penalty} HP!";
    }

    $pdo->commit();

    echo json_encode([
      'status'             => 'success',
      'message'            => $message,
      'new_hp'             => $newHp,
      'owned_territories'  => $ownedCount
    ], JSON_UNESCAPED_UNICODE);

} catch (EXception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}