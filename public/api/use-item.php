<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

// JWT認証チェック
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// ★最重要：JWTから取得した「本人のID」を固定で使用する
$userId = (int)$userData['user_id'];

try {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (empty($data['item_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'There is insufficient data']);
        exit();
    }

    // $userId = (int)$data['user_id'];
    $itemId = (int)$data['item_id'];

    $pdo->beginTransaction();

    // 1. カバンの中にそのアイテムがあるか（個数が1以上か）をチェック
    $stmtCheck = $pdo->prepare("
         SELECT ui.quantity, i.name, i.buff_target, i.buff_value
         FROM user_items ui
         JOIN items i ON ui.item_id = i.id
         WHERE ui.user_id = ? AND ui.item_id = ? FOR UPDATE
    ");

    $stmtCheck->execute([$userId, $itemId]);
    $itemData = $stmtCheck->fetch();

    if(!$itemData || $itemData['quantity'] < 1) {
      $pdo->rollBack();
      echo json_encode(['status' => 'error', 'message' => "You don't have that item!"]); //そのアイテムを持っていません！
        exit();
    }

    $itemName              = $itemData['name'];
    $buffTarget            = strtoupper($itemData['buff_target']); // HP, ATK, DEF, STAMINA など
    $buffValue             = (int)$itemData['buff_value'];

    // 2. ここが重要！カバンからアイテムを1つ減らす処理
    $stmtConsume = $pdo->prepare("UPDATE user_items SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?");
    $stmtConsume->execute([$userId, $itemId]);

    // 個数が0になったらカバンからデータを消す（整理整頓）
        $pdo->prepare("DELETE FROM user_items WHERE quantity <= 0 AND user_id = ? AND item_id = ?")->execute([$userId, $itemId]);

    // 3. アイテムの効果（バフ）をユーザーに適用する
    $updateSql = "";
    $messageSuffix = "";

    switch ($buffTarget) {
      case 'HP':
      // HPは最大HP（max_hp）を超えないように回復する
        $updateSql = "UPDATE users SET current_hp = LEAST(max_hp, current_hp + ?) WHERE id = ?";
        $messageSuffix = "Your HP has been restored by {$buffValue}!"; //HPが {$buffValue} 回復した！
        break;

      case 'STAMINA':
        $updateSql = "UPDATE users SET stamina = stamina + ? WHERE id = ?";
        $messageSuffix = "Your stamina has been restored by {$buffValue}!"; //スタミナが {$buffValue} 回復した！
        break;

      case 'ATK':
        $updateSql = "UPDATE users SET atk = atk + ? WHERE id = ?";
        $messageSuffix = "Your atk has been restored by {$buffValue}!"; //攻撃力が {$buffValue} 回復した！
        break;

      case 'DEF':
        $updateSql = "UPDATE users SET def = def + ? WHERE id = ?";
        $messageSuffix = "Your def has been restored by {$buffValue}!"; //防御力が {$buffValue} 回復した！
        break;

        default:
        $pdo->rollBack();
        echo json_encode(['status' => 'error', 'message' => "This item cannot be used"]); //このアイテムは使えません
            exit();
    }

    // ステータスを更新
    $stmtUpdateUser = $pdo->prepare($updateSql);
    $stmtUpdateUser->execute([$buffValue, $userId]);

    $pdo->commit();

    // 4. 最新のステータスを取得して返す（フロントですぐ表示できるように）
    $stmtUser = $pdo->prepare("SELECT current_hp, stamina, atk, def FROM users WHERE id = ?");
    $stmtUser->execute([$userId]);
    $newUser = $stmtUser->fetch();

    echo json_encode([
      'status'         => 'success',
      'message'        => "I used ”{$itemName}”! {$messageSuffix}",//「{$itemName}」を使った！\n{$messageSuffix}
      'new_status'     => $newUser
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}