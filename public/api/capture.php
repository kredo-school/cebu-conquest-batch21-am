<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

header("Content-Type: application/json; charset=UTF-8");

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

    // [重要] けいサーバー/フロント双方の命名(spot_id, room_key)に対応
    $spotId = isset($data['spot_id']) ? (int)$data['spot_id'] : (isset($data['territory_id']) ? (int)$data['territory_id'] : null);
    $roomKey = $data['room_key'] ?? null;

    if (!$spotId || !$roomKey) {
        throw new Exception('Missing spot_id or room_key');
    }

    $apCost = 5; // GDD 2-1 準拠 [cite: 32, 34]

    $pdo->beginTransaction();

    // 1. ユーザーのスタミナ確認 (DBカラム名 'stamina' に準拠)
    $stmtUser = $pdo->prepare("SELECT stamina FROM users WHERE id = ? FOR UPDATE");
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch();

    if (!$user || (int)$user['stamina'] < $apCost) {
        throw new Exception('Not enough stamina');
    }

    // 2. ターゲットスポットの存在確認
    $stmtSpot = $pdo->prepare("SELECT name FROM spots WHERE id = ?");
    $stmtSpot->execute([$spotId]);
    $spot = $stmtSpot->fetch();
    if (!$spot) throw new Exception('Target spot not found');

    // 3. 占領実行 (occupationsテーブルの room_key カラム を使用)
    $sqlCapture = "INSERT INTO occupations (spot_id, user_id, room_key, occupied_at)
                   VALUES (?, ?, ?, NOW())
                   ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), occupied_at = NOW()";
    $pdo->prepare($sqlCapture)->execute([$spotId, $userId, $roomKey]);

    // 4. スタミナ減算 [cite: 34]
    $pdo->prepare("UPDATE users SET stamina = stamina - ? WHERE id = ?")->execute([$apCost, $userId]);
    $newStamina = (int)$user['stamina'] - $apCost;

    // 5. アイテムドロップ判定 (GDD準拠: 占領時に特産品付与 [cite: 50])
    $droppedItem = null;
    $stmtItem = $pdo->prepare("SELECT id, name FROM items WHERE spot_id = ? LIMIT 1");
    $stmtItem->execute([$spotId]);
    $item = $stmtItem->fetch();

    if ($item) {
        $pdo->prepare("INSERT INTO user_items (user_id, item_id, quantity)
                       VALUES (?, ?, 1)
                       ON DUPLICATE KEY UPDATE quantity = quantity + 1")
            ->execute([$userId, $item['id']]);
        $droppedItem = ['id' => (int)$item['id'], 'name' => $item['name']];
    }

    $pdo->commit();

    echo json_encode([
        'status'       => 'success',
        'message'      => "“{$spot['name']}” captured!",
        'new_stamina'  => $newStamina,
        'spot_id'      => $spotId,
        'dropped_item' => $droppedItem
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}