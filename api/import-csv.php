<?php

header("Content-Type: text/plain; charset=UTF-8");

// ここで共通のデータベース設定を読み込む
require_once __DIR__ . '/../config/database.php';

try {

    // 既存データをリセット
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE items;");
    $pdo->exec("TRUNCATE TABLE occupations;");
    $pdo->exec("TRUNCATE TABLE territories;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // ここで変数をしっかり初期化！
    $totalSpots = 0;
    $totalItems = 0;

    // __DIR__ を使って「確実に1つ上の階層」を見に行くように強化
    $spotsFile = __DIR__ . '/../GI-Project_ID管理シート - Spots.csv'; //陣地
    $itemsFile = __DIR__ . '/../GI-Project_ID管理シート - Items.csv';  //Items

    // --- 1. Spots (陣地) のインポート ---

    if (!file_exists($spotsFile)) {
        echo "【エラー】ファイルが見つかりません: {$spotsFile}\n";
    } else {
        echo "■ Processing...: {$spotsFile}\n";
        $content = file_get_contents($spotsFile);
        $content = mb_convert_encoding($content, 'UTF-8', 'auto');
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
        array_shift($lines); // ヘッダーをスキップ

        // 🌟 記号を外してSQLエラーを防止
        $stmtSpot = $pdo->prepare("INSERT INTO territories (id, island_name, area_id, name, map_x, map_y, capture_cost) VALUES (?, ?, ?, ?, ?, ?, ?)");

        foreach ($lines as $line) {
            if (trim($line) === '') continue;

            // fgetcsvの代わりに安全な str_getcsv を使用
            $data = str_getcsv($line);
            if (count($data) < 9) continue;

            $island_name   = trim($data[0]);
            $area_id       = (int)trim($data[1]);
            $spot_id       = (int)trim($data[3]);
            $spot_name     = trim($data[4]);
            $map_x = null;
            if (isset($data[5]) && trim($data[5]) !== '') {
                $map_x = (float)trim($data[5]);
            }

            $map_y = null;
            if (isset($data[6]) && trim($data[6]) !== '') {
                $map_y = (float)trim($data[6]);
            }

            $capture_cost = 10;
            if (isset($data[7]) && trim($data[7]) !== '') {
                $capture_cost = (int)trim($data[7]);
            }

            if ($spot_id === 0 || empty($spot_name)) continue;

            $stmtSpot->execute([$spot_id, $island_name, $area_id, $spot_name, $map_x, $map_y, $capture_cost]);
            $totalSpots++;
        }
    }

    // --- 2. Items (アイテム・バフ) のインポート ---

    if (!file_exists($itemsFile)) {
        echo "【エラー】ファイルが見つかりません: {$itemsFile}\n";
    } else {
        echo "■ Processing...: {$itemsFile}\n";
        $content = file_get_contents($itemsFile);
        $content = mb_convert_encoding($content, 'UTF-8', 'auto');
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));
        array_shift($lines); // ヘッダーをスキップ

        // 🌟 記号を外してSQLエラーを防止
        $stmtItem = $pdo->prepare("INSERT INTO items (id, territory_id, name, buff_target, buff_type, buff_value, description) VALUES (?, ?, ?, ?, ?, ?, ?)");

        foreach ($lines as $line) {
            if (trim($line) === '') continue;

            $data = str_getcsv($line);
            if (count($data) < 12) continue;

            $spot_id      = isset($data[2]) ? (int)trim($data[2]) : 0;
            $item_name    = isset($data[3]) ? trim($data[3]) : '';
            $drop_item_id = isset($data[7]) ? (int)trim($data[7]) : 0;
            $buff_target  = isset($data[8]) ? trim($data[8]) : '';
            $buff_type    = isset($data[9]) ? trim($data[9]) : '';
            $buff_value = 0;
            if (isset($data[10]) && trim($data[10]) !== '') {
                $buff_value = (int)trim($data[10]);
            }

            $description  = isset($data[11]) ? trim($data[11]) : '';

            if ($drop_item_id === 0 || empty($item_name)) continue;

            $stmtItem->execute([$drop_item_id, $spot_id, $item_name, $buff_target, $buff_type, $buff_value, $description]);
            $totalItems++;
        }
    }


    echo "\n===================================\n";
    echo "🎉 インポート完了！\n";
    echo "Spots(陣地) を {$totalSpots} 件登録しました。\n";
    echo "Items(アイテム) を {$totalItems} 件登録しました。\n";
    echo "===================================\n";
} catch (Exception $e) {
    echo "\nエラー発生: " . $e->getMessage();
}
