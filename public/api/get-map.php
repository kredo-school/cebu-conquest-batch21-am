<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

//HTTPメソッド制限（GET以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode([
    'status' => 'error',
    'message' => 'Method Not Allowed. This endpoint requires GET.'
  ]);
  exit;
}

// JWT認証チェック
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches) || !($userData = validateJWT($matches[1]))) {
  http_response_code(401);
  echo json_encode(['status' => 'error', 'message' => 'Unauthorized: Invalid or missing token']);
  exit;
}

// 本人認証チェックの厳格化 ---
$authenticatedUserId = (int)$userData['user_id'];

// パラメータにuser_idがある場合は取得、なければトークンのIDを使用
$requestedUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $authenticatedUserId;

// トークンの持ち主と、リクエストされたIDが一致しない場合は403エラーを返す
if ($authenticatedUserId !== $requestedUserId) {
  http_response_code(403);
  echo json_encode(['status' => 'error', 'message' => 'Forbidden: You can only access your own data']);
  exit;
}

$userId = $authenticatedUserId; // 最終的に使用するID

try {
  // 全エリアの占領状況をユーザーの色付きで取得する
  $sql = "SELECT s.id as spot_id, s.name as spot_name, o.user_id, u.player_color 
            FROM spots s
            LEFT JOIN occupations o ON s.id = o.spot_id
            LEFT JOIN users u ON o.user_id = u.id";

  $stmt = $pdo->query($sql);
  $mapData = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'status' => 'success',
    'data' => $mapData
  ]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
