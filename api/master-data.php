<?php

// CORS対策 (ローカル開発環境用) React(Vite)からのアクセスを許可
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json; charset=UTF-8");

// DB接続設定 (環境に合わせて修正してください)
$host = '127.0.0.1';
$db   = 'cebu_conquest';
$user = 'root';
$pass = ''; // XAMPPやMAMP等のパスワード

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    //1.陣地データ取得
    // territories に occupations と users を合体（JOIN）させて、
    // 「誰が占領しているか」「その人の色は何色か」を一度に取ってくるSQL
    $sql = "SELECT
        t.*,
        o.user_id AS owner_id,
        u.username AS owner_name,
        u.player_color AS owner_color
        FROM territories t
        LEFT JOIN occupations o ON t.id = o.territory_id
        LEFT JOIN users u ON o.user_id = u.id";

    $stmtT = $pdo->query($sql);
    $territories = $stmtT->fetchAll();

    //2.特産品データの取得
    $stmtI = $pdo->query("SELECT * FROM items");
    $items = $stmtI->fetchAll();

    //3.レスポンスの構築
    echo json_encode([
        'status'  => 'success',
        'data'    => [
            'territories' => $territories,
            'items'       => $items
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'      => 'error',
        'message'     => $e->getMessage()
    ]);
}
