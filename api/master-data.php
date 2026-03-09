<?php
// api/master-data.php

// CORS対策 (ローカル開発環境用) React(Vite)からのアクセスを許可
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json; charset=UTF-8");

// OPTIONSリクエスト（プリフライト）の早期リターン
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

try{
  $pdo = new PDO($dsn, $user, $pass, $options);

  //陣地データ取得
  $stmtT = $pdo->query("SELECT id, area, name, description, buff_name, buff_effect FROM territories");
  $territories = $stmtT->fetchAll();

  //特産品データの取得
  $stmtI = $pdo->query("SELECT id, territory_id, name, effect, drop_rate FROM items");
  $items = $stmtI->fetchAll();

  //フロントが扱いやすい形にJSONを整形
  echo json_encode ([
    'status'  => 'success',
    'data'    => [
        'territories' => $territories,
        'items'       => $items
    ]
  ], JSON_UNESCAPED_UNICODE);

} catch(\PDOException $e){
    http_response_code(500);
    echo json_encode([
        'status'      => 'error',
        'message'     => 'DB Connection Failed: ' . $e->getMessage()
    ]);
}