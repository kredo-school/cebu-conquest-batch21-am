<?php
// public/db_connection.php

// configの材料を読み込む
require_once __DIR__ . '/../config/database.php';

try {
    // database.php で定義した $dsn, $user, $pass, $options を使う
    $pdo = new PDO($dsn, $user, $pass);
} catch (PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'データベース接続エラー: ' . $e->getMessage()
    ]);
    exit();
}