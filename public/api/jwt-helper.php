<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';

function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

// 【生成用】login.php で使用
function createJWT($userId, $username) {
    global $jwt_secret; // database.php の秘密鍵を使用

    // 1. ヘッダー作成
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    
    // 2. ペイロード作成 (有効期限は24時間)
    $payload = json_encode([
        'user_id'  => $userId,
        'username' => $username,
        'exp'      => time() + (3600 * 24)
    ]);
    
    $baseHeader = base64UrlEncode($header);
    $basePayload = base64UrlEncode($payload);
    
    // 3. 署名作成 (HMAC-SHA256)
    $signature = hash_hmac('sha256', $baseHeader . "." . $basePayload, $jwt_secret, true);
    $baseSignature = base64UrlEncode($signature);
    
    // 4. 結合して返却
    return $baseHeader . "." . $basePayload . "." . $baseSignature;
}

/**
 * 【検証用】各APIの検問で使用
 * 署名を再計算し、改ざんや期限切れがないかチェック
 */
function validateJWT($jwt) {
    global $jwt_secret;
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return false;

    list($header, $payload, $signature) = $parts;

    // 署名の再計算（手元の秘密鍵で計算した結果と、送られてきた署名を比較）
    $validSignature = base64UrlEncode(hash_hmac('sha256', $header . "." . $payload, $jwt_secret, true));

    if ($signature === $validSignature) {
        // Base64Urlデコード（記号を元に戻してからデコード）
        $decodedPayload = base64_decode(str_replace(['-', '_'], ['+', '/'], $payload));
        $data = json_decode($decodedPayload, true);
        
        // 有効期限(exp)のチェック
        if (isset($data['exp']) && $data['exp'] > time()) {
            return $data;
        }
    }
    // 署名不一致、または期限切れの場合はfalseを返す
    return false;
}