<?php
// ① まず CORS とセキュリティヘッダーを送信 (ここを一番上に持ってくる)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");

// ② OPTIONS プリフライトの即時終了
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // ヘッダーを送った後に終了するのがポイント！
    http_response_code(200);
    exit();
}

// ③ 必要なファイルをここで一気に読み込む
// (login.php からの相対パスではなく、api-cors.php から見たパスにする)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/jwt-helper.php'; // 必要なら有効化

// 全パターンの Authorization ヘッダーを網羅
$authHeader = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? getallheaders()['Authorization']
    ?? getallheaders()['authorization']
    ?? '';
$_SERVER['HTTP_AUTHORIZATION'] = $authHeader;
