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
        echo json_encode(['status' => 'error', 'message' => 'There is insufficient data']); //データが不足しています
        exit();
    }

    $userId = (int)$data['user_id'];

    $pdo->beginTransaction();

    // 1. 現在のステータスを取得
    $stmtUser = $pdo->prepare("SELECT current_hp, max_hp, stamina FROM users WHERE id = ? FOR UPDATE");
    $stmtUser->execute([$userId]);
    $userRow = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$userRow) {
      $pdo->rollBack();
      echo json_encode(['status' => 'error', 'message' =>"User not found"]);
      exit();
    }

    // 回復量の設定
    $healHp            = 20;       // HPの回復量
    $recoverStamina    = 40;       // スタミナの回復量
    $maxStamina        = 100;      // スタミナの上限値（仮で100）

    // 2. 新しい値の計算（最大値を超えないように制御）
    // min()関数を使って、「回復後の値」と「最大値」の小さい方を採用
    $newHp = min($userRow['max_hp'], $userRow['current_hp'] + $healHp);
    $newStamina = min($maxStamina, $userRow['stamina'] + $recoverStamina);

    // 3. データベースを更新
    $updateSql  = "UPDATE users SET current_hp = ?, stamina = ? WHERE id = ?";
    $stmtUpdate = $pdo->prepare($updateSql);
    $stmtUpdate->execute([$newHp, $newStamina, $userId]);

    $pdo->commit();

    // 4. 結果を返す
    echo json_encode([
      'status'          => 'success',
      'message'         => "You chose to ”STAY”. Recovered {$healHp} HP and {$recoverStamina} Stamina!",
      'new_status'      => [
        'current_hp'    => $newHp,
        'stamina'       => $newStamina
        ]
    ], JSON_UNESCAPED_UNICODE);

}catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}