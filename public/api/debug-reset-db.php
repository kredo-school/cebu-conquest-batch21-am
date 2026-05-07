<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';
// このファイルは開発・テスト用です。本番公開時は削除するか、アクセス制限をかけてください。
//http://localhost/Cebu_Conquest/cebu-conquest-batch21-am/api/debug-reset-db.php

try {
    // 1. 外部キーチェックを一時無効化
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // 2. 関連するテーブルをすべて空にする
    // usersだけでなく、関連テーブルもまとめて指定しておくと楽です
    $tables = ['match_results', 'users' ];
    
    foreach ($tables as $table) {
        $pdo->exec("TRUNCATE TABLE $table;");
        echo "✅ Table '$table' has been reset.<br>";
    }

    // 3. 外部キーチェックを有効に戻す
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    echo "<br>🚀 **All test data cleared! ID has been reset to 1.**";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage();
}