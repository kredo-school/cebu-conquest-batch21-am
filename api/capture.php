<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS'){
  exit();
}

$host = '127.0.0.1';
$db   = 'cebu_conquest';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // バリデーション
    if (empty($data['user_id']) || empty($data['territory_id'])){
      echo json_encode(['status' => 'error', 'message' => 'データが不足しています']);
      exit();
    }

    $userId = $data['user_id'];
    $territoryId = $data['territory_id'];

    // 占領処理（すでに誰かが占領していたら上書き、いなければ新規作成）
    $sql = "INSERT INTO occupations (territory_id, user_id) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$territoryId, $userId]);

    echo json_encode([
      "status"=> "success",
      "message"=> "Territory captured!",  //陣地を占領した！
      'captured_territory' => $territoryId
    ]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}