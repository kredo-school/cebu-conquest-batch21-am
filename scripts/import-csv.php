<?php

/**
 * Cebu Conquest "FULL_SYNC_V7" Import Script
 * 役割: ゲームに必要な全6テーブルの作成 + CSVデータのインポート
 */

header("Content-Type: text/plain; charset=UTF-8");
require_once __DIR__ . '/../config/database.php';

// --- 設定エリア: チームメンバーが変更しやすいように冒頭に集約 ---
$csv_dir = __DIR__ . '/../';
$spots_file = $csv_dir . 'GI-Project_ID管理シート - Spots.csv';
$items_file = $csv_dir . 'GI-Project_ID管理シート - Items.csv';

// 【重要】ユーザーデータを消したくない場合は false にする
$reset_user_data = false;

try {
    echo "=========================================\n";
    echo "🚀 DATABASE FULL SYNC: VERSION 7\n";
    echo "=========================================\n\n";

    // 1. 全リセット（古いテーブルやterritoriesも一掃）
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // 1. テーブル削除（ユーザー合意に基づき users, match_results を除外可能に）
    $tables = ['user_items', 'occupations', 'items', 'spots', 'territories'];
    if ($is_hard_reset) {
        $tables[] = 'match_results';
        $tables[] = 'users';
        echo "⚠️  FULL RESET mode: User data will be deleted.\n";
    }

    foreach ($tables_to_drop as $table) {
        $pdo->exec("DROP TABLE IF EXISTS $table");
        echo "🗑️  Deleted old table: $table\n";
    }

    // 2. 全テーブルの新規作成（設計図）

    // スポット
    $pdo->exec("CREATE TABLE spots (
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

    // アイテム
    $pdo->exec("CREATE TABLE items (
        id INT PRIMARY KEY,
        spot_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        buff_target VARCHAR(50),
        buff_type VARCHAR(50),
        buff_value INT,
        description TEXT,
        FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // ユーザー
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

    // ★追加: 占領状況（これが無いと占領できない）
    $pdo->exec("CREATE TABLE occupations (
        spot_id INT PRIMARY KEY,
        user_id INT,
        occupied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // ★追加: ユーザー所持アイテム
    $pdo->exec("CREATE TABLE user_items (
        user_id INT,
        item_id INT,
        quantity INT DEFAULT 1,
        PRIMARY KEY (user_id, item_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // ★追加: 対戦結果
    $pdo->exec("CREATE TABLE match_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        score INT DEFAULT 0,
        spots_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "✅ All 6 tables created successfully.\n\n";

    // 3. CSVデータのインポート
    importCsv($pdo, $spots_file, "INSERT INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 8);
    importCsv($pdo, $items_file, "INSERT INTO items (id, spot_id, name, buff_target, buff_type, buff_value, description) VALUES (?, ?, ?, ?, ?, ?, ?)", [7, 2, 3, 8, 9, 10, 11]);

    echo "\n🏆 ALL SYSTEMS READY. HAPPY CODING!\n";
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
}

// 共通インポート関数（メンテナンス性向上）
function importCsv($pdo, $file, $sql, $mapping)
{
    if (!file_exists($file)) {
        echo "❌ Skip: File not found -> " . basename($file) . "\n";
        return;
    }

    $content = mb_convert_encoding(file_get_contents($file), 'UTF-8', 'auto');
    $content = preg_replace('/^\xEF\xBB\xBF/', '', $content); // BOM削除
    $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
    array_shift($lines); // ヘッダー除去

    $stmt = $pdo->prepare($sql);
    $count = 0;
    foreach ($lines as $line) {
        $data = str_getcsv($line);
        if (count($data) < 5) continue;

        $params = [];
        if (is_array($mapping)) {
            foreach ($mapping as $idx) $params[] = trim($data[$idx] ?? '');
        } else {
            for ($i = 0; $i < $mapping; $i++) $params[] = trim($data[$i] ?? '');
        }

        $stmt->execute($params);
        $count++;
    }
    echo "✅ Imported " . basename($file) . ": $count records.\n";
}
