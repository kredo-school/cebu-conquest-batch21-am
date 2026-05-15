// api/master-data.php

<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

// --- JWT認証チェック ---
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

    // 1. 各階層のマスターデータ取得 (GDD v4.1 ID体系準拠)
    try {
    // 1. 存在するテーブルからデータを取得
    $islands = $pdo->query("SELECT * FROM islands")->fetchAll(PDO::FETCH_ASSOC);
    $areas   = $pdo->query("SELECT * FROM areas")->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. spotデータ（占領状態含む）を取得し、ここから district_id を扱う
    $sqlSpots = "SELECT s.*, o.user_id AS owner_id, u.username AS owner_name 
                 FROM spots s
                 LEFT JOIN occupations o ON s.id = o.spot_id
                 LEFT JOIN users u ON o.user_id = u.id";
    $spots = $pdo->query($sqlSpots)->fetchAll(PDO::FETCH_ASSOC);

    // 3. 特産品バフデータの取得
    $items = $pdo->query("SELECT * FROM items")->fetchAll(PDO::FETCH_ASSOC);

    // 4. 8神データの取得
    $gods = $pdo->query("SELECT * FROM gods ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

    // レスポンス構築
    echo json_encode([
        'status' => 'success',
        'data' => [
            'islands'   => $islands,
            'areas'     => $areas,
            'districts' => [], // テーブルが存在しないため一旦空配列で返し、フロント側のルックアップで補完させる
            'spots'     => array_map(function ($s) {
                return [
                    'id'           => (int)$s['id'],
                    'name'         => $s['name'],
                    'district_id'  => (int)$s['district_id'], // の値を使用
                    'map_x'        => $s['map_x'] !== null ? (float)$s['map_x'] : null,
                    'map_y'        => $s['map_y'] !== null ? (float)$s['map_y'] : null,
                    'capture_cost' => (int)$s['capture_cost'],
                    'owner_id'     => $s['owner_id'] ? (int)$s['owner_id'] : null
                ];
            }, $spots),
            'items' => array_map(function ($i) {
                return [
                    'id'          => (int)$i['id'],
                    'spot_id'     => (int)$i['spot_id'],
                    'name'        => $i['name'],
                    'buff_target' => $i['buff_target'], 
                    'buff_type'   => $i['buff_type'],   
                    'buff_value'  => (int)$i['buff_value'],
                    'description' => $i['description']
                ];
            }, $items),
            'gods' => array_map(function ($g) {
                return [
                    'id'             => (int)$g['id'],
                    'name'           => $g['name'],
                    'district_id'    => (int)$g['district_id'],
                    'spot_id'        => (int)$g['spot_id'],
                    'special_effect' => $g['special_effect'],
                    'description'    => $g['description'],
                    'image_url'      => $g['image_url']
                ];
            }, $gods)
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}