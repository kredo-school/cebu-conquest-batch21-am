<?php
// api/master-data.php

// CORS対策 (ローカル開発環境用)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// OPTIONSリクエスト（プリフライト）の早期リターン
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// DB接続設定 (環境に合わせて修正してください)
$host = '127.0.0.1';
$db   = 'cebutori_db';
$user = 'root';
$pass = ''; // XAMPPやMAMP等のパスワード

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try{
  $pdo = new PDO($dsn, $user, $pass, $options);

  //陣地データ取得
  $stmtTerritories = $pdo->query("SELECT * FROM territories");
  $territories = $stmtTerritories->fetchAll();

  //特産品データの取得
}