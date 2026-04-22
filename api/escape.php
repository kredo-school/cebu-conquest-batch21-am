<?php
// 全てのAPIで使い回せるガード（検問）の基本構造

// ヘッダー設定 (CORS)
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS"); // POSTに限定
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// HTTPメソッド制限（POST以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

// 依存ファイルの読み込み
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

// JWT認証チェック (検問開始)
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// トークンから取得した「確実な本人」のID
$userId = (int)$userData['user_id'];

try {
  // JSONの受け取り（今回は本人のIDを使うので、ボディに user_id が入っていなくてもOKな設計）
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $pdo->beginTransaction();

    // 1. ユーザーの現在のHPを取得
    $stmtUser = $pdo->prepare("SELECT current_hp FROM users WHERE id = ? FOR UPDATE");
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch();

    if(!$user) {
      $pdo->rollBack();
      echo json_encode(['status' => 'error', 'message' => "User not found" ]);
      exit();
    }

    // 2. 自分が占領している陣地の数をカウント（逃げ場があるかどうかの判定）
    $stmtOcc = $pdo->prepare("SELECT COUNT(*) AS count FROM occupations WHERE user_id = ?");
    $stmtOcc->execute([$userId]);
    $occ = $stmtOcc->fetch();
    $ownedCount = (int)$occ['count'];

    $message = "";
    $newHp = (int)$user['current_hp'];

    if ($ownedCount > 0) {
      //逃げ場あり！成功
      $message = "You successfully escaped to your territory!";
    } else {
      // 逃げ場なし！大ダメージペナルティ（例: HP -50）
      $penalty = 50;
      $newHp = max(0, $newHp - $penalty); //0未満にはしない

      $stmtUpdate = $pdo->prepare("UPDATE users SET current_hp = ? WHERE id = ?");
      $stmtUpdate->execute([$newHp, $userId]);

      $message = "No escape route! You took a massive penalty of {$penalty} HP!";
    }

    $pdo->commit();

    echo json_encode([
      'status'             => 'success',
      'message'            => $message,
      'new_hp'             => $newHp,
      'owned_territories'  => $ownedCount
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}