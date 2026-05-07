<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

// HTTPメソッド制限
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
  exit;
}

// JWT認証チェック (ここが「検問」です)
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
  http_response_code(401);
  echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
  exit;
}

// JWTから取得したIDを使用（ボディのuser_idはもう信じない）
$userId = (int)$userData['user_id'];

try {
  $json = file_get_contents('php://input');
  $data = json_decode($json, true);

  if (empty($data['spot_id'])) {
    echo json_encode(['status' => 'error', 'message' => "The spot_id is missing"]);
    exit();
  }

  $spotId = (int)$data['spot_id'];

  $pdo->beginTransaction();

  // チェック1：このプレイヤーはすでに陣地を持っているか？（持っていたら初期スポーンできない）

  $stmtCheckUser = $pdo->prepare("SELECT COUNT(*) AS count FROM occupations WHERE user_id = ?");
  $stmtCheckUser->execute([$userId]);
  $userOcc = $stmtCheckUser->fetch(PDO::FETCH_ASSOC);

  if ($userOcc['count'] > 0) {
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => "You already have a base. You can only choose your starting position once!"]); //すでに陣地を持っています。初期位置の選択は1回だけ
    exit();
  }

  // チェック2：選んだ陣地は、すでに誰かに奪われていないか？
  $stmtCheckSpot = $pdo->prepare("SELECT user_id FROM occupations WHERE spot_id = ? FOR UPDATE");
  $stmtCheckSpot->execute([$spotId]);
  $existingOcc = $stmtCheckSpot->fetch(PDO::FETCH_ASSOC);

  if ($existingOcc) {
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => "That location is already occupied by another player! Please choose a different one."]); //その陣地はすでに他のプレイヤーに占領されています！別の場所を選んでください。
    exit();
  }

  // チェック3：処理：スタミナ消費なしで陣地を獲得（初期スポーン）
  $stmtInsert = $pdo->prepare("INSERT INTO occupations (user_id, spot_id) VALUES (?, ?)");
  $stmtInsert->execute([$userId, $spotId]);

  $pdo->commit();

  echo json_encode([
    'status'      => 'success',
    'message'     => "The initial spawn locations have been determined! Let the game begin!", //初期スポーン位置が決定しました！ゲームスタート！
    'spawn_territory_id' => $spotId
  ], JSON_UNESCAPED_UNICODE);
  
} catch (Exception $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
