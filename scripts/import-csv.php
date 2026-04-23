<?php

/**
 * Cebu Conquest "FULL_SYNC_FINAL_REVENGE"
 * 役割: #1701エラーを DELETE 命令で完全に回避し、なおさんの設計通り同期する
 */

header("Content-Type: text/plain; charset=UTF-8");
require_once __DIR__ . '/../config/database.php';

$csv_dir = __DIR__ . '/../';
$spots_file = $csv_dir . 'GI-Project_ID管理シート - Spots.csv';
$items_file = $csv_dir . 'GI-Project_ID管理シート - Items.csv';

try {
    echo "=========================================\n";
    echo "🚀 DATABASE FULL SYNC: VERSION 13 (NO MORE 1701)\n";
    echo "=========================================\n\n";

    // --- 1. 制約の無効化 (まずはチェックを外す) ---
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // --- 2. 徹底掃除 (TRUNCATE は親テーブルに使えないので DELETE を使います) ---
    // これが今回のエラーを解決するための最大のポイントです
    $tables = ['user_items', 'occupations', 'items', 'spots', 'match_results', 'areas', 'islands', 'gods', 'users'];
    foreach ($tables as $table) {
        // DELETE FROM ならば親子関係があっても掃除可能です
        $pdo->exec("DELETE FROM $table");
        echo "🧹 Cleared data (DELETE): $table\n";
    }

    // --- 3. 全テーブルの作成 (なおさんの Gods 設計を 100% 復活) ---

    $pdo->exec("CREATE TABLE IF NOT EXISTS islands (id INT PRIMARY KEY, name VARCHAR(100)) ENGINE=InnoDB;");
    $pdo->exec("CREATE TABLE IF NOT EXISTS areas (id INT PRIMARY KEY, island_id INT, name VARCHAR(100)) ENGINE=InnoDB;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS spots (
        id INT PRIMARY KEY,
        island_id INT NOT NULL,
        area_id INT NOT NULL,
        district_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        map_x FLOAT NULL,
        map_y FLOAT NULL,
        capture_cost INT DEFAULT 10,
        drop_item_id INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS items (
        id INT PRIMARY KEY,
        spot_id INT NULL, 
        name VARCHAR(100) NOT NULL,
        buff_target VARCHAR(50),
        buff_type VARCHAR(50),
        buff_value INT,
        description TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 神様テーブル (atk_bonus, stamina_bonus, ap_regen_bonus, description 全て復活)
    $pdo->exec("CREATE TABLE IF NOT EXISTS gods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        atk_bonus INT DEFAULT 0,
        stamina_bonus INT DEFAULT 0,
        ap_regen_bonus INT DEFAULT 0,
        start_item_id INT,
        image_url VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) DEFAULT 'dummy_pass',
        player_color VARCHAR(20) DEFAULT '#3498db',
        max_hp INT DEFAULT 100,
        current_hp INT DEFAULT 100,
        stamina INT DEFAULT 100,
        atk INT DEFAULT 100,
        def INT DEFAULT 100,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS occupations (
        spot_id INT PRIMARY KEY,
        user_id INT,
        occupied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // --- 4. マスタデータ登録 (神様もフルステータスで投入) ---
    $pdo->exec("INSERT INTO islands (id, name) VALUES (1000, 'Cebu・Mactan')");
    $pdo->exec("INSERT INTO areas (id, island_id, name) VALUES (11,1000,'North'),(13,1000,'Core'),(14,1000,'South Heritage'),(15,1000,'South Adventure'),(16,1000,'Mactan')");
    
    $pdo->exec("INSERT INTO gods (name, atk_bonus, stamina_bonus, ap_regen_bonus, start_item_id, image_url, description) VALUES 
        ('Garry', 20, 0, 0, 1, 'assets/images/gods/Garry.jpg', '戦いの神。初期攻撃力+20'),
        ('Quisie', 0, 30, 0, 2, 'assets/images/gods/Quisie.jpg', '大地の女神。初期スタミナ+30'),
        ('Shem', 0, 0, 5, 3, 'assets/images/gods/Shem.jpg', '知識の神。AP回復量+5')");

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "✅ Tables and Gods structure are restored.\n\n";

    // --- 5. CSVインポート (新しい列番号に対応) ---

    // Spots: [isl(0), area(1), dist(2), spot_id(3), name(4), x(5), y(6), cost(7), item(8)]
    importCsv($pdo, $spots_file, "INSERT INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost, drop_item_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [0, 1, 2, 3, 4, 5, 6, 7, 8]);

    // Items: [id(7), spot_id(2), name(3), target(8), type(9), value(10), desc(11)]
    importCsv($pdo, $items_file, "INSERT INTO items (id, spot_id, name, buff_target, buff_type, buff_value, description) VALUES (?, ?, ?, ?, ?, ?, ?)", [7, 2, 3, 8, 9, 10, 11]);

    echo "\n🏆 ALL SYSTEMS READY. SYNC COMPLETED!";

} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
}

function importCsv($pdo, $file, $sql, $mapping) {
    if (!file_exists($file)) return;
    $content = mb_convert_encoding(file_get_contents($file), 'UTF-8', 'auto');
    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
    $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", trim($content)));
    array_shift($lines);

    $stmt = $pdo->prepare($sql);
    $count = 0;
    foreach ($lines as $line) {
        $data = str_getcsv($line);
        if (count($data) < 5) continue;
        $params = [];
        foreach ($mapping as $idx) {
            $val = trim($data[$idx] ?? '');
            $params[] = ($val === '') ? null : $val;
        }
        $stmt->execute($params);
        $count++;
    }
    echo "✅ Imported " . basename($file) . ": $count records.\n";
}