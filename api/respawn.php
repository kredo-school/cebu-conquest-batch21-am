<?php

// HPが0になって敗北した時、初期拠点での復活と「バフ（ATK, DEF）の全リセット」を行う処理です。
// （※「10秒間のペナルティ待機」は、フロントエンド側で10秒カウントダウンしてからこのAPIを叩く、という形にするのが一番綺麗です！）

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

require_once __DIR__ . '/../config/database.php';

try {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (empty($data['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'There is insufficient data']); //データが不足しています
        exit();
    }
    $userId = (int)$data['user_id'];

    $pdo->beginTransaction();

    // バフ全リセット ＆ HP・スタミナを全回復
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

            // 最新のステータスを取得して返す
            $stmtUser = $pdo->prepare("SELECT current_hp, stamina, atk, def FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $newUser = $stmtUser->fetch();

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