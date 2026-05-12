<?php
/**
 * Cebu Conquest "ULTIMATE_DEMO_SYNC"
 * 特徴: 
 * 1. エラー1452を回避するため、CSVにあるエリアIDを自動的にデータベースに事前登録します。
 * 2. デモユーザー(issei/kei)を確実に作成します。
 */
//http://localhost/Cebu_Conquest/cebu-conquest-batch21-am/scripts/import-csv.php

header("Content-Type: text/plain; charset=UTF-8");
require_once __DIR__ . '/../config/database.php';

$csv_dir = __DIR__ . '/../';
$spots_file = $csv_dir . 'GI-Project_ID管理シート - Spots.csv';
$items_file = $csv_dir . 'GI-Project_ID管理シート - Items.csv';

try {
    echo "=========================================\n";
    echo "🚀 DATABASE ULTIMATE SYNC (DEMO READY)\n";
    echo "=========================================\n\n";

    // --- 1. 制約の無効化 ---
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // --- 2. 既存データの掃除 ---
    $tables = ['rooms', 'user_items', 'occupations', 'items', 'spots', 'match_results', 'areas', 'islands', 'gods', 'users'];
    foreach ($tables as $table) {
        $pdo->exec("DELETE FROM $table");
        echo "🧹 Cleared table: $table\n";
    }

    // --- 3. マスタデータ登録 ---
    echo "\n📦 Inserting master data...\n";
    $pdo->exec("INSERT INTO islands (id, name) VALUES (1000, 'Cebu・Mactan')");
    
    // 基本の5エリアを登録
    $pdo->exec("INSERT INTO areas (id, island_id, name) VALUES (11,1000,'North'),(13,1000,'Core'),(14,1000,'South Heritage'),(15,1000,'South Adventure'),(16,1000,'Mactan')");
    
    $pdo->exec("INSERT INTO gods (name, district_id, spot_id, special_effect, image_url, description) VALUES 
        ('Garry', 131, 13101, 'ATK +20', 'assets/images/gods/Garry.jpg', '戦いの神。初期攻撃力+20'),
        ('Quisie', 132, 13204, 'HP +30', 'assets/images/gods/Quisie.jpg', '大地の女神。初期スタミナ+30'),
        ('Shem', 131, 13101, 'AP REGEN +5', 'assets/images/gods/Shem.jpg', '知識の神。AP回復量+5')");

// --- 4. デモユーザー作成 ---
    $demoPassword = password_hash('password123', PASSWORD_DEFAULT);
    
    // 👤 いっせいさん用の設定
    $isseiQuestion = '最初の相棒は？';
    $isseiAnswerHash = password_hash('ピカチュウ', PASSWORD_DEFAULT);

    // 👤 けいさん用の設定
    $keiQuestion = '最初の相棒は？';
    $keiAnswerHash = password_hash('ピカチュウ', PASSWORD_DEFAULT);

    // SQL実行（それぞれの変数を対応する場所に流し込みます）
    $pdo->exec("INSERT INTO users (username, password, security_question, security_answer, player_color, max_hp, current_hp, stamina, atk, def) VALUES 
        ('issei', '{$demoPassword}', '{$isseiQuestion}', '{$isseiAnswerHash}', '#FF5733', 100, 100, 100, 100, 100),
        ('kei', '{$demoPassword}', '{$keiQuestion}', '{$keiAnswerHash}', '#33FF57', 100, 100, 100, 100, 100)");
        
    echo "👤 Created unique demo users: issei (相棒), kei (食べ物)\n";

    // --- 5. CSVインポート (エリア補完ロジック付き) ---
    echo "\n📥 Importing CSV files...\n";

    if (file_exists($spots_file)) {
        $content = mb_convert_encoding(file_get_contents($spots_file), 'UTF-8', 'auto');
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", trim($content)));
        array_shift($lines); // ヘッダー除去

        $stmtSpot = $pdo->prepare("INSERT INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost, drop_item_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmtAreaFix = $pdo->prepare("INSERT IGNORE INTO areas (id, island_id, name) VALUES (?, ?, ?)");

        $count = 0;
        foreach ($lines as $line) {
            $data = str_getcsv($line);
            if (count($data) < 5) continue;

            // データの整理
            $islandId = (int)$data[0];
            $areaId = (int)$data[1];
            
            // 【重要】エラー1452対策：areasテーブルに存在しないIDがあれば、その場で仮登録する
            $stmtAreaFix->execute([$areaId, $islandId, "Area-" . $areaId]);

            // Spot登録
            $params = [];
            foreach ([0, 1, 2, 3, 4, 5, 6, 7, 8] as $idx) {
                $val = trim($data[$idx] ?? '');
                $params[] = ($val === '') ? null : $val;
            }
            $stmtSpot->execute($params);
            $count++;
        }
        echo "✅ Imported Spots: $count records (Missing areas were auto-created).\n";
    }

    // Itemsのインポート
    importCsvBasic($pdo, $items_file, "INSERT INTO items (id, spot_id, name, buff_target, buff_type, buff_value, description) VALUES (?, ?, ?, ?, ?, ?, ?)", [7, 2, 3, 8, 9, 10, 11]);

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "\n🏆 ALL SYSTEMS READY. SYNC COMPLETED!";

} catch (Exception $e) {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "\n❌ Error: " . $e->getMessage() . "\n";
}

/**
 * 基本的なインポート関数
 */
function importCsvBasic($pdo, $file, $sql, $mapping) {
    if (!file_exists($file)) return;
    $content = mb_convert_encoding(file_get_contents($file), 'UTF-8', 'auto');
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