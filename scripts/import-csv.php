<?php
/**
 * Cebu Conquest "ULTIMATE_DEMO_SYNC" - カラム数自動修復版
 * 作成者: なお (DB/API担当)
 */
// http://localhost/Cebu_Conquest/cebu-conquest-batch21-am/scripts/import-csv.php

header("Content-Type: text/plain; charset=UTF-8");
require_once __DIR__ . '/../config/database.php';

$csv_dir = __DIR__ . '/../';
$spots_file = $csv_dir . 'GI-Project_ID管理シート - Spots.csv';
$items_file = $csv_dir . 'GI-Project_ID管理シート - Items.csv';

try {
    echo "=========================================\n";
    echo "🛡️ DATABASE NAO'S CRUSH-PROOF SYNC\n";
    echo "=========================================\n\n";

    // --- 1. 制約の一時無効化 ---
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

    // --- 2. 既存データの掃除 (ユーザーデータや他の重要なテーブルは消さずに残す仕様) ---
    $tables = ['items', 'spots', 'areas', 'islands', 'gods'];
    foreach ($tables as $table) {
        $pdo->exec("TRUNCATE TABLE $table");
        echo "🧹 Cleaned target table: $table\n";
    }

    // --- 3. 補完マスタ用ステートメントの準備 ---
    $stmtIslandFix = $pdo->prepare("INSERT IGNORE INTO islands (id, name) VALUES (?, ?)");
    $stmtAreaFix = $pdo->prepare("INSERT IGNORE INTO areas (id, island_id, name) VALUES (?, ?, ?)");

    $islandNames = [1000 => 'Cebu・Mactan', 2000 => 'Negros', 3000 => 'Bohol'];
    $areaNames = [
        11 => 'North: Azure Coast', 12 => 'Central-North: Industrial Ridge', 
        13 => 'Core: Metro Cebu Dominance', 14 => 'Central-South: Heritage Corridor', 
        15 => 'South: Adventure Peak', 16 => 'Mactan: Gateway & Resort',
        21 => 'North: Sugar Coast', 22 => 'West: Metro Bacolod Hub', 
        23 => 'East: Canlaon Frontier', 24 => 'South: Mystic Dumaguete',
        31 => 'North: Marine Frontier', 32 => 'Center: Chocolate Hills Sanctuary', 33 => 'South: Panglao Gateway'
    ];

    // --- 4. Spots CSV インポート (カンマ省略・行不足を完全自動修復) ---
    echo "\n📥 Processing Spots CSV...\n";
    if (file_exists($spots_file)) {
        $content = mb_convert_encoding(file_get_contents($spots_file), 'UTF-8', 'auto');
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", trim($content)));
        array_shift($lines); // ヘッダー除去

        $stmtSpot = $pdo->prepare("REPLACE INTO spots (island_id, area_id, district_id, id, name, map_x, map_y, capture_cost, drop_item_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

        $count = 0;
        foreach ($lines as $line) {
            $data = str_getcsv($line);
            
            // 【絶対門番】要素が極端に足りない、またはスポットID(インデックス3)が不鮮明なゴミ行は即座に除外
            if (count($data) < 4 || !isset($data[3]) || !is_numeric(trim($data[3])) || (int)$data[3] <= 0) {
                continue; 
            }

            $islandId = (int)($data[0] ?? 0);
            $areaId = (int)($data[1] ?? 0);
            
            // エラーを吐かせないための絶対安全防壁
            if ($islandId <= 0 || $areaId <= 0) continue;

            // マスタ自動補完
            $iName = $islandNames[$islandId] ?? "Island-" . $islandId;
            $stmtIslandFix->execute([$islandId, $iName]);

            $aName = $areaNames[$areaId] ?? "Area-" . $areaId;
            $stmtAreaFix->execute([$areaId, $islandId, $aName]);

            // 【完全修復ロジック】カンマが途中で切れていても、配列の要素数を強制的に9個に拡張してnull埋めする
            $params = [];
            foreach ([0, 1, 2, 3, 4, 5, 6, 7, 8] as $idx) {
                if (isset($data[$idx]) && trim($data[$idx]) !== '') {
                    $params[] = trim($data[$idx]);
                } else {
                    $params[] = null; // カラムが省略されていたら安全にNULLを代入
                }
            }
            
            $stmtSpot->execute($params);
            $count++;
        }
        echo "✅ Spots Table Synced: $count records loaded.\n";
    }

    // --- 5. Items CSV インポート (Undefined offset 11 を完全狙撃) ---
    echo "\n📥 Processing Items CSV...\n";
    if (file_exists($items_file)) {
        $content = mb_convert_encoding(file_get_contents($items_file), 'UTF-8', 'auto');
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", trim($content)));
        array_shift($lines);

        $stmtItem = $pdo->prepare("REPLACE INTO items (id, spot_id, name, spot_buff_target, spot_buff_type, spot_buff_value, spot_buff_desc) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        // データの対応関係
        // 7:drop_item_id, 2:spot_id, 3:item_name, 8:spot_buff_target, 9:spot_buff_type, 10:spot_buff_value, 11:spot_buff_desc
        $mapping = [7, 2, 3, 8, 9, 10, 11];
        $count = 0;
        
        foreach ($lines as $line) {
            $data = str_getcsv($line);
            // アイテムID(インデックス7)が正規の数値として存在しない行を確実に弾く
            if (count($data) < 8 || !isset($data[7]) || !is_numeric(trim($data[7])) || (int)$data[7] <= 0) {
                continue; 
            }
            
            // 【安全クッション】11番目の説明文が省略されて配列の長さが足りなくても、Noticeを出さずにnull補完
            $params = [];
            foreach ($mapping as $idx) {
                if (isset($data[$idx]) && trim($data[$idx]) !== '') {
                    $params[] = trim($data[$idx]);
                } else {
                    $params[] = null; // カラムが切れていたら安全にNULL埋め
                }
            }
            
            $stmtItem->execute($params);
            $count++;
        }
        echo "✅ Items Table Synced: $count records loaded.\n";
    }

    // --- 6. 正式な神仏マスタ登録 (全8名・名前付き安全バインド) ---
    echo "\n⛩️ Injecting Formal 8 Mythical Gods master data...\n";
    $stmtGod = $pdo->prepare("REPLACE INTO gods (id, name, district_id, spot_id, special_effect, image_url, description) 
                              VALUES (:id, :name, :district_id, :spot_id, :special_effect, :image_url, :description)");
    
    $godsData = [
        ['id' => 1, 'name' => 'Neil', 'district_id' => 141, 'spot_id' => 14101, 'special_effect' => 'MAX_HP +30, STAMINA -25, HP +10', 'image_url' => 'assets/gods/Neil.png', 'description' => '戦いの神。圧倒的な耐久力を誇る。'],
        ['id' => 2, 'name' => 'Garry', 'district_id' => 241, 'spot_id' => 24104, 'special_effect' => 'ATK +20', 'image_url' => 'assets/gods/Garry.png', 'description' => '俊敏の神。攻撃に特化している。'],
        ['id' => 3, 'name' => 'Shem', 'district_id' => 123, 'spot_id' => 12301, 'special_effect' => 'MAX_AP +15, HP +10, AP +10', 'image_url' => 'assets/gods/Shem.png', 'description' => '太陽の神。バランスの取れた性能。'],
        ['id' => 4, 'name' => 'Quisie', 'district_id' => 161, 'spot_id' => 16101, 'special_effect' => 'HP -20, FAITH 100', 'image_url' => 'assets/gods/Quisie.png', 'description' => '静寂の神。信仰心の高さが武器。'],
        ['id' => 5, 'name' => 'Eduardo', 'district_id' => 131, 'spot_id' => 13101, 'special_effect' => 'DEF +15', 'image_url' => 'assets/gods/Eduardo.png', 'description' => '鉄壁の神。防御性能が高い。'],
        ['id' => 6, 'name' => 'Kurt', 'district_id' => 132, 'spot_id' => 13202, 'special_effect' => 'STAMINA +30, HP -10', 'image_url' => 'assets/gods/Kurt.png', 'description' => '疾風の神。スタミナが豊富。'],
        ['id' => 7, 'name' => 'Stephen', 'district_id' => 332, 'spot_id' => 33201, 'special_effect' => 'FAITH_REGEN (5)', 'image_url' => 'assets/gods/Stephen.png', 'description' => '幻影の神。信仰心が自動回復する。'],
        ['id' => 8, 'name' => 'Bernardine', 'district_id' => 151, 'spot_id' => 15101, 'special_effect' => 'MAX_AP +30, AP +30', 'image_url' => 'assets/gods/Bernardine.png', 'description' => '洞察の神。スキルの回転率が高い。']
    ];

    foreach ($godsData as $god) {
        $stmtGod->execute($god);
    }
    echo "✅ All 8 Canonical Gods successfully loaded.\n";

    // --- 7. 制約の再有効化 ---
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "\n🏆 [SUCCESS] ALL GEOGRAPHY, ITEMS, AND 8 CANONICAL GODS LIVE!";

} catch (Exception $e) {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    echo "\n❌ CRITICAL ERROR IN SYNC BATCH: " . $e->getMessage() . "\n";
}