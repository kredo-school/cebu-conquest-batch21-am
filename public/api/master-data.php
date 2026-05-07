<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限（GET以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method Not Allowed. This endpoint requires GET.'
    ]);
    exit;
}

// --- JWT認証チェック ---
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

//"Bearer <token>" の形式で届くことを想定
if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
    $userData = validateJWT($jwt); // ここで検証！

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

try {

    //1.陣地データ取得
    // 新しいテーブル構造（map_x, map_y など）に対応した結合クエリ
    // territories（陣地）をベースに、occupations（占領状態）と users（プレイヤー情報）をくっつける！
    $sql = "SELECT 
                s.*,
                o.user_id AS owner_id, 
                u.username AS owner_name, 
                u.player_color AS owner_color
            FROM spots s
            LEFT JOIN occupations o ON s.id = o.spot_id
            LEFT JOIN users u ON o.user_id = u.id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $spots = $stmt->fetchAll(PDO::FETCH_ASSOC);

    //2.特産品データの取得
    $stmtI = $pdo->query("SELECT * FROM items");
    $items = $stmtI->fetchAll(PDO::FETCH_ASSOC);

    // 数値を正しく (int) にキャストしてフロントエンドが扱いやすくする
    $formattedTerritories = array_map(function ($s) {
        return [
            'id'           => (int)$s['id'],
            'name'         => $s['name'],
            'island_id'    => (int)$s['island_id'],
            'area_id'      => (int)$s['area_id'],
            'district_id'  => (int)$s['district_id'],
            'map_x'        => $s['map_x'] !== null ? (float)$s['map_x'] : null,
            'map_y'        => $s['map_y'] !== null ? (float)$s['map_y'] : null,
            'capture_cost' => (int)$s['capture_cost'],
            'owner_id'     => $s['owner_id'] !== null ? (int)$s['owner_id'] : null,
            'owner_name'   => $s['owner_name'],
            'owner_color'  => $s['owner_color']
        ];
    }, $spots);

    $formattedItems = array_map(function ($i) {
        return [
            'id'          => (int)$i['id'],
            'name'        => $i['name'],
            'spot_id'     => (int)$i['spot_id'],
            'buff_target' => $i['buff_target'],
            'buff_type'   => $i['buff_type'],
            'buff_value'  => (int)$i['buff_value'],
            'description' => $i['description']
        ];
    }, $items);

    // 3.4柱の神データの取得
    $stmtG = $pdo->query("SELECT * FROM gods ORDER BY id ASC");
    $gods = $stmtG->fetchAll(PDO::FETCH_ASSOC);

    $formattedGods = array_map(function ($g) {
        return [
            'id'             => (int)$g['id'],
            'name'           => $g['name'],
            'district_id'    => (int)$g['district_id'], // 追加：聖地ID
            'spot_id'        => (int)$g['spot_id'],     // 追加：スポーン地点ID
            'special_effect' => $g['special_effect'],   // 修正：v3.1のステータス文字列
            'image_url'      => $g['image_url'],
            'description'    => $g['description']
        ];
    }, $gods);

    //4.レスポンスの構築
    echo json_encode([
        'status' => 'success',
        'data'   => [ // dataキーで包む
            'territories' => $formattedTerritories,
            'items'       => $formattedItems,
            'gods'        => $formattedGods
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status'      => 'error',
        'message'     => $e->getMessage()
    ]);
}
