<?php
// データベース接続設定
$host = '10.29.219.57';
$port = '3306';         // ポート番号
$db      = 'cebu_conquest';
$user    = 'cebu_user';
$pass    = 'Cebu2026!test';
$charset = 'utf8mb4';

// portをDSNに含める書き方
$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, 
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       
    PDO::ATTR_EMULATE_PREPARES   => false,                  
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'DB接続失敗: ' . $e->getMessage()
    ]);
    exit;
}