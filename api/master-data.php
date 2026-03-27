<?php

// CORS対策 (ローカル開発環境用) React(Vite)からのアクセスを許可
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/../config/database.php';

try {

    //1.陣地データ取得
    // 新しいテーブル構造（map_x, map_y など）に対応した結合クエリ
    // territories（陣地）をベースに、occupations（占領状態）と users（プレイヤー情報）をくっつける！
    $sql = "SELECT 
                t.*,
                o.user_id AS owner_id, 
                u.username AS owner_name, 
                u.player_color AS owner_color
            FROM territories t
            LEFT JOIN occupations o ON t.id = o.territory_id
            LEFT JOIN users u ON o.user_id = u.id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $territories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    //2.特産品データの取得
    $stmtI = $pdo->query("SELECT * FROM items");
    $items = $stmtI->fetchAll(PDO::FETCH_ASSOC);

    //3.レスポンスの構築
    echo json_encode([
        'status'  => 'success',
        'data'    => [
            'territories' => $territories,
            'items'       => $items
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status'      => 'error',
        'message'     => $e->getMessage()
    ]);
}
