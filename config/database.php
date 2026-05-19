<?php

// データベース接続情報（ローカル環境に合わせて各自設定してください）
$host = '127.0.0.1';
$port = '3306';
$db   = 'cebu_conquest';
$user = 'DB_USER';     
$pass = 'DB_PASSWORD'; 

// JWT生成用の秘密鍵
$jwt_secret = 'YOUR_LOCAL_DEVELOPMENT_SECRET_KEY'; 

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'データベース接続エラー: ' . $e->getMessage()]);
    exit();
}