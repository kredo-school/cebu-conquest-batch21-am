<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['status' => 'error', 'message' => 'Method Not Allowed']));
}

// --- JWT認証チェック ---
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
}

$userId = (int)$userData['user_id'];

try {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // バリデーション: マルチプレイ識別のための room_key は必須
    if (empty($data['territory_id']) || empty($data['room_key'])) {
        throw new Exception('Missing territory_id or room_key');
    }

    $spotId = (int)$data['territory_id'];
    $roomKey = $data['room_key'];
    $staminaCost = 5; // GDD 2-1準拠: 1アクション 5消費

    $pdo->beginTransaction();

    // 1. ユーザーのスタミナ確認と行ロック (不正防止)
    $stmtUser = $pdo->prepare("SELECT stamina FROM users WHERE id = ? FOR UPDATE");
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch();
    if (!$user || (int)$user['stamina'] < $staminaCost) {
        throw new Exception('Not enough stamina');
    }

    // 2. ターゲット陣地の存在確認
    $stmtSpot = $pdo->prepare("SELECT name FROM spots WHERE id = ?");
    $stmtSpot->execute([$spotId]);
    $spot = $stmtSpot->fetch();
    if (!$spot) throw new Exception('Target spot not found');

    // 3. 同じルーム内での自陣チェック
    $stmtCheck = $pdo->prepare("SELECT user_id FROM occupations WHERE spot_id = ? AND room_key = ?");
    $stmtCheck->execute([$spotId, $roomKey]);
    $existing = $stmtCheck->fetch();
    if ($existing && (int)$existing['user_id'] === $userId) {
        throw new Exception('Already your territory in this room');
    }

    // 4. 占領実行 (マルチルーム対応: room_keyを保存)
    $sqlCapture = "INSERT INTO occupations (spot_id, user_id, room_key, occupied_at)
                   VALUES (?, ?, ?, NOW())
                   ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), occupied_at = NOW()";
    $pdo->prepare($sqlCapture)->execute([$spotId, $userId, $roomKey]);

    // 5. スタミナ減算
    $pdo->prepare("UPDATE users SET stamina = stamina - ? WHERE id = ?")->execute([$staminaCost, $userId]);
    $newStamina = (int)$user['stamina'] - $staminaCost;

    // 6. アイテムドロップ判定 (100%固定)
    $droppedItem = null;
    $stmtItem = $pdo->prepare("SELECT id, name FROM items WHERE spot_id = ? LIMIT 1");
    $stmtItem->execute([$spotId]);
    $item = $stmtItem->fetch();

    if ($item) {
        // user_itemsテーブルへ永続化
        $pdo->prepare("INSERT INTO user_items (user_id, item_id, quantity)
                       VALUES (?, ?, 1)
                       ON DUPLICATE KEY UPDATE quantity = quantity + 1")
            ->execute([$userId, $item['id']]);
        $droppedItem = ['id' => (int)$item['id'], 'name' => $item['name']];
    }

    $pdo->commit();

    echo json_encode([
        'status'      => 'success',
        'message'     => "“{$spot['name']}” captured!",
        'new_stamina' => $newStamina,
        'spot_id'     => $spotId,
        'dropped_item' => $droppedItem
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}