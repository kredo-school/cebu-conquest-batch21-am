<?php
/**
 * Initial User Setup Script
 * 役割: 開発・テスト用のユーザー（issei, kei）を確実に作成する
 * 使い方: ブラウザで http://localhost/Cebu_Conquest/cebu-conquest-batch21-am/api/setup_users.php を開くだけ
 */

require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

header("Content-Type: text/plain; charset=UTF-8");

$testUsers = [
    [
        'username' => 'issei',
        'password' => 'password123',
        'color'    => '#FF5733' // オレンジ
    ],
    [
        'username' => 'kei',
        'password' => 'password123',
        'color'    => '#33FF57' // グリーン
    ]
];

try {
    $pdo->beginTransaction();

    // 既存のユーザーを一旦クリア（必要に応じて）
    // $pdo->exec("DELETE FROM users"); 
    // echo "Existing users cleared.\n";

    foreach ($testUsers as $u) {
        $username = $u['username'];
        $password = $u['password'];
        $color    = $u['color'];

        // 1. すでに存在するかチェック
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            echo "User '{$username}' already exists. Skipping...\n";
            continue;
        }

        // 2. 正しくハッシュ化して登録
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $sql = "INSERT INTO users (username, password, player_color, max_hp, current_hp, stamina, atk, def) 
                VALUES (?, ?, ?, 100, 100, 100, 100, 100)";
        
        $pdo->prepare($sql)->execute([$username, $hashed, $color]);
        echo "User '{$username}' created successfully (Password: {$password})\n";
    }

    $pdo->commit();
    echo "\n--- All Setup Complete! ---";

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "Error: " . $e->getMessage();
}