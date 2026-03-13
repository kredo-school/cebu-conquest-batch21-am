<?php

header("Content-Type: text/plain; charset=UTF-8");

// 日本語のCSVを正しく読み込むための設定
// setlocale(LC_ALL, 'ja_JP. UTF-8');

$host = '127.0.0.1';
$db = 'cebu_conquest';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 既存データをリセット
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE items;");
    $pdo->exec("TRUNCATE TABLE territories;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    // インポートするCSVファイルのリスト
    $csvFiles = [
        '../GI_Project-エリア別スポット_特産品リスト - 市街地.csv',
        '../GI_Project-エリア別スポット_特産品リスト - マクタン.csv',
        '../GI_Project-エリア別スポット_特産品リスト - 北部.csv',
        '../GI_Project-エリア別スポット_特産品リスト - 南部.csv'
    ];

    $totalInserted = 0;

    foreach ($csvFiles as $file) {
        if (!file_exists($file)) {
            echo "File not found: $file\n";
            continue;
        }

        echo "Processing: $file...\n";
        // ファイルの中身を丸ごとテキストとして読み込む（Windowsの不具合を回避）
        $content = file_get_contents($file);

        // 文字コードを確実にUTF-8へ変換
        $encoding = mb_detect_encoding($content, 'UTF-8, SJIS-win, SJIS, EUC-JP, ASCII', true);
        if ($encoding && $encoding !== 'UTF-8') {
            $content = mb_convert_encoding($content, 'UTF-8', $encoding);
        }

        // UTF-8のBOM（見えない文字）を削除し、改行コードを統一
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));

        // BOM削除と改行コード統一
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $lines = explode("\n", str_replace(["\r\n", "\r"], "\n", $content));

        // 1行目（ヘッダー）を削除
        array_shift($lines);

        foreach ($lines as $index => $line) {
            if (trim($line) === '') continue; // 空行は無視

            // CSVの1行を配列に分割
            $data = explode(',', $line);

            $area           = isset($data[0]) ? trim($data[0]) : '';
            $spotName       = isset($data[1]) ? trim($data[1]) : '';
            $itemName       = isset($data[2]) ? trim($data[2]) : '';
            $effectRaw      = isset($data[3]) ? trim($data[3]) : '';
            $dropRateRaw    = isset($data[4]) ? trim($data[4]) : '10'; // 空ならデフォルト10

            // スポット名やアイテム名が空の場合は不正データとしてスキップ
            if (empty($spotName) || empty($itemName)) {
                continue;
            }

            //バフ名分離ロジック
            $buffName = "";
            $buffEffect = $effectRaw;
            if (Preg_match('/【(.*?)】(.*)/u', $effectRaw, $matches)) {
                $buffName = $matches[1];
                $buffEffect = trim($matches[2]);
            }

            // ドロップ率を数値化
            $dropRate = (int)str_replace('%', '', $dropRateRaw);
            if ($dropRate === 0) {
                $dropRate = 10;
            }

            //1. territories テーブルに挿入
            $stmt = $pdo->prepare("INSERT INTO territories (area, name, description, buff_name, buff_effect) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$area, $spotName, "$area in Cebu Island is a famous spot.", $buffName, $buffEffect]);

            // 直前に挿入した陣地のIDを取得
            $territoryId = $pdo->lastInsertId();

            // 2. item テーブルに挿入
            $stmtItem = $pdo->prepare("INSERT INTO items (territory_id, name, effect, drop_rate) VALUES (?, ?, ?, ?)");
            $stmtItem->execute([$territoryId, $itemName, $effectRaw, $dropRate]);

            $totalInserted++;
        }
    }

    echo "\nインポート完了!master-data.phpを確認してください。";
    echo "🎉 合計 {$totalInserted} 件のスポットをDBに登録しました！\n";
} catch (Exception $e) {
    echo "\nエラー発生: " . $e->getMessage();
}
