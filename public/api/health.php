<?php
// 通信許可設定の読み込み
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

try {
    // DB接続設定の読み込み
    require_once __DIR__ . '/../../config/database.php';

    // $pdo が定義されており、かつ実際にクエリが実行できるか確認
    if (isset($pdo)) {
        $pdo->query('SELECT 1'); // 軽いクエリを投げて生存確認
        
        echo json_encode([
            'status' => 'ok',
            'db_host' => $host, // database.phpで定義されている変数
            'db_connected' => true,
            'message' => 'Path is correct and DB connection is active!'
        ]);
    } else {
        throw new Exception('$pdo variable is not defined.');
    }

} catch (Exception $e) {
    // 接続に失敗した場合はエラー内容を返す
    http_response_code(500);
    echo json_encode([
        'status' => 'ng',
        'db_connected' => false,
        'error' => $e->getMessage()
    ]);
}