<?php

// CORS対策 (ReactからのPOSTリクエストを許可)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTION') {
  http_response_code(200);
  exit();
}

$host = '127.0.0.1';
$db   = 'cebu_conquest';
$user = 'root';
$pass = '';


try {
  $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  // Reactから送られてきたJSONデータを受け取る
  $json = file_get_contents('php://input');
  $data = json_decode($json, true);

  if (empty($data['username'])) {
    echo json_encode(['status' => 'error', 'message' => 'Username has not been entered.']);
    exit();
  }
  $username = $data['username'];

  // 1. ユーザーが存在するかチェック
  $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
  $stmt->execute([$username]);
  $player = $stmt->fetch();

  // 2. 存在しなければ新規作成 (MVPなのでパスワードは一旦ダミーハッシュで簡略化)
  if (!$player) {
    $dummyHash = password_hash('dummy_password', PASSWORD_DEFAULT);

    // ランダムなプレイヤーカラーを生成
    $color = sprintf('#%06X', mt_rand(0, 0xFFFFFF));

    $insertStmt = $pdo->prepare("INSERT INTO users users (Username, password_hash, player_color, funds, max_hp, current_hp, stamina) VALUES (?, ?, ?, ?, ?, ?, ?)");

    // 修正：SQLのカラム名を小文字の username に統一
    $sql = "INSERT INTO users (username, password_hash, player_color, funds,max_hp, current_hp, stamina) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $insertStmt = $pdo->prepare($sql);

    // 初期ステータスをセットして実行 初期値： 資金0G, HP100, スタミナ100
    $insertStmt->execute([$username, $dummyHash, $color, 0, 100, 100, 100]);

    // 作成したばかりのユーザーデータを再取得
    $stmt->execute([$username]);
    $player = $stmt->fetch();
  }

  //パスワードハッシュなど、フロントに返す必要のない情報は削除
  unset($player['password_hash']);

  echo json_encode([
    'status' => 'success',
    'message' => 'Login successful',
    'data' => $player
  ]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}
