<?php

// HPが0になって敗北した時、初期拠点での復活と「バフ（ATK, DEF）の全リセット」を行う処理です。
// （※「10秒間のペナルティ待機」は、フロントエンド側で10秒カウントダウンしてからこのAPIを叩く、という形にするのが一番綺麗です！）

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// HTTPメソッド制限（POST以外を405で弾く）
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Method Not Allowed. This endpoint requires POST.'
    ]);
    exit;
}

// 外部ファイルの読み込み
require_once __DIR__ . '/jwt_helper.php';
require_once __DIR__ . '/../config/database.php';

// JWT認証チェック (検問)
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $jwt = $matches[1];
    $userData = validateJWT($jwt);
    
    if (!$userData) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => '無効なトークンです']);
        exit;
    }
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => '認証が必要です']);
    exit;
}

// JWTから取得したIDを固定で使用。フロントからの user_id 送信に頼らない。
$userId = (int)$userData['user_id'];

try {
    // JSONの受け取り（今回は本人のIDを使うので、ボディの中身は空でも動く設計)
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    $pdo->beginTransaction();

    // 1.バフ全リセット ＆ HP・スタミナを全回復
    // 初期値 (ATK: 100, DEF: 100, HP: 最大値, スタミナ: 100) に戻す
    $sql = "UPDATE users
            SET current_hp = max_hp,
                stamina = 100,
                atk = 100,
                def = 100
            WHERE id = ?";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId]);

            $pdo->commit();

            // 2.最新のステータスを取得して返す
            $stmtUser = $pdo->prepare("SELECT current_hp, stamina, atk, def FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $newUser = $stmtUser->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'status'      => 'success',
                'message'     => "Respawned! All buffs have been reset.", //復活しました！すべてのバフがリセットされました。
                'new_status'  => $newUser
            ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}