<?php

// データベース接続情報
$host = 'localhost';
$port = '3306';
$db   = 'cebu_conquest';
$user = 'root';
$pass = ''; // XAMPPのデフォルトは空欄

// JWT生成用の秘密鍵（適当な複雑な文字列に変更してもOK）
$jwt_secret = 'CEBU_CONQUEST_TEAM_SECRET_2026';

try {
    // PDOインスタンスを作成して返す
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // 接続に失敗した場合
    http_response_code(500);
    header('Content-Type: application/json'); // JSONで返すことを明示
    echo json_encode(['status' => 'error', 'message' => 'データベース接続エラー: ' . $e->getMessage()]);
    exit();
}