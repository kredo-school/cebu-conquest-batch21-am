
<?php
// ① まず CORS とセキュリティヘッダーを送信
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");

// ② OPTIONS プリフライトの即時終了
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ③ 必要なファイルをここで一気に読み込む
require_once __DIR__ . '/../../config/database.php'; // DB接続 ($pdo)
require_once __DIR__ . '/jwt-helper.php';           // JWT関連関数