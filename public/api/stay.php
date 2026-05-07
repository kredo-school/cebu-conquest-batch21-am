<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限（POST以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method Not Allowed. This endpoint requires POST.'
    ]);
    exit;
}

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

// JWTから取得したIDを固定で使用。なりすましを完全に防ぎます。
$userId = (int)$userData['user_id'];

try {
  $json = file_get_contents('php://input');
  $data = json_decode($json, true);

  $pdo->beginTransaction();

  // 1. 現在のステータスを取得
  $stmtUser = $pdo->prepare("SELECT current_hp, max_hp, stamina FROM users WHERE id = ? FOR UPDATE");
  $stmtUser->execute([$userId]);
  $userRow = $stmtUser->fetch(PDO::FETCH_ASSOC);

  if (!$userRow) {
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => "User not found"]);
    exit();
  }

  // 回復量の設定
  $healHp            = 20;       // HPの回復量
  $recoverStamina    = 40;       // スタミナの回復量
  $maxStamina        = 100;      // スタミナの上限値（仮で100）

  // 2. 新しい値の計算（最大値を超えないように制御）
  // min()関数を使って、「回復後の値」と「最大値」の小さい方を採用
  $newHp = min((int)$userRow['max_hp'], (int)$userRow['current_hp'] + $healHp);
  $newStamina = min($maxStamina, (int)$userRow['stamina'] + $recoverStamina);


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
} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
