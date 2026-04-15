<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Authorizationを追加
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

// --- JWT認証チェック (検問) ---
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$userData - validateJWT($jwt);

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

// JWTからユーザーIDを取得（なりすまし防止のため、こちらを優先）
$userId = (int)$userData['user_id'];

try {
  $json = file_get_contents('php://input');
  $data = json_decode($json, true);

  // バリデーション
  if (empty($data['territory_id'])) {
    echo json_encode(['status' => 'error', 'message' => '陣地IDが不足しています']);
    exit();
  }

  $territoryId = (int)$data['territory_id'];

  // ここで消費スタミナを一括管理！後からすぐ変更できる
  $staminaCost = 5;

  // トランザクション開始（スタミナ減少と占領をセットで確実に行う）
  $pdo->beginTransaction();

  // 1. 狙った陣地の「名前」と「占領コスト」を取得する
  $stmtTerritory = $pdo->prepare("SELECT capture_cost, name FROM territories WHERE id = ?");
  $stmtTerritory->execute([$territoryId]);
  $territory = $stmtTerritory->fetch(PDO::FETCH_ASSOC);

  if (!$territory) {
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => '存在しない陣地です']);
    exit();
  }
  // $cost = (int)$territory['capture_cost'];//陣地ごとにコストを変えたくなった時に必要になるコード
  $spotName = $territory['name'];

  // 2. ユーザーの現在のスタミナを取得
  $stmtUser = $pdo->prepare("SELECT stamina FROM users WHERE id = ? FOR UPDATE");
  $stmtUser->execute([$userId]);
  $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => "User not found"]);
    exit();
  }

  // 3. スタミナが足りるかチェック！
  if ($user['stamina'] < $staminaCost) {
    $pdo->rollBack();
    echo json_encode([
      'status'  => 'error',
      'message' => 'Not enough stamina! (Required: ' . $staminaCost . ' / Current: ' . $user['stamina'] . ')'
    ]);
    exit();
  }

  // 4. 陣地の状態をチェックして奪う
  $stmtCheck = $pdo->prepare("SELECT user_id FROM occupations WHERE territory_id = ? FOR UPDATE");
  $stmtCheck->execute([$territoryId]);
  $existingOcc = $stmtCheck->fetch(PDO::FETCH_ASSOC);

  if ($existingOcc && $existingOcc['user_id'] == $userId) {
    // 自分の陣地なら、スタミナを減らさずに弾く！
    $pdo->rollBack();
    echo json_encode([
      'status'  => 'error',
      'message' => "This is already your territory!"
    ]);
    exit();
  }
  // メッセージの出し分けだけしておく
  if ($existingOcc) {
    // 敵の陣地を奪った
    $message = "You captured \"{$spotName}\" from the enemy! (Stamina -{$staminaCost})";
  } else {
    // 新しく占領した
    $message = "You have newly occupied \"{$spotName}\"! (Stamina -{$staminaCost})";
  }

  // 5. 占領実行
  $sqlCapture = "INSERT INTO occupations (territory_id, user_id)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)";
  $stmtCap = $pdo->prepare($sqlCapture);
  $stmtCap->execute([$territoryId, $userId]);

  // 6. スタミナを消費して保存
  $stmtUpdateUser = $pdo->prepare("UPDATE users SET stamina = stamina - ? WHERE id = ?");
  $stmtUpdateUser->execute([$staminaCost, $userId]);
  $newStamina = $user['stamina'] - $staminaCost;

  // 7. アイテムドロップ判定（新機能！）
  $droppedItemName = null;

  // その陣地に設定されているアイテムを探す
  $stmtItem = $pdo->prepare("SELECT id, name FROM items WHERE territory_id = ?");
  $stmtItem->execute([$territoryId]);
  $item = $stmtItem->fetch(PDO::FETCH_ASSOC);

  if ($item) {
    // ドロップ確率の計算（現在はテスト用で 100% ドロップ）
    // ※ 本番では rand(1, 100) <= 30 のようにして30%などに調整
    $dropChance = 100;

    if (rand(1, 100) <= $dropChance) {
      $itemId = $item['id'];
      $droppedItemName = $item['name'];

      // カバン（user_items）に入れる。すでに持っていたら個数(quantity)を+1する
      $sqlDrop = "INSERT INTO user_items (user_id, item_id, quantity)
                  VALUES (?, ?, 1)
                  ON DUPLICATE KEY UPDATE quantity = quantity + 1";
      $stmtDrop = $pdo->prepare($sqlDrop);
      $stmtDrop->execute([$userId, $itemId]);
    }
  }

  $pdo->commit();

  // 結果の返却
  $response = [
    'status'        => 'success',
    'message'       => "“{$spotName}” has been captured! (Consumed {$staminaCost} Stamina)", // "「{$spotName}」を占領しました！（スタミナを {$cost} 消費）"
    'new_stamina'   => $newStamina,
  ];

  // アイテムがドロップしていたら結果に追加する
  if ($droppedItemName) {
    $response['dropped_item'] = $droppedItemName;
    $response['message'] .= "You've also obtained  “{$droppedItemName}”!"; //"\nさらに「{$droppedItemName}」をゲットしました！";
  }

  echo json_encode($response, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
