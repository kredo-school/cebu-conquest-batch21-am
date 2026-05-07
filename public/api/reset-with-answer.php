<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

$input = json_decode(file_get_contents("php://input"), true);
$username = $input['username'] ?? '';
$submittedAnswer = $input['security_answer'] ?? '';
$newPassword = $input['new_password'] ?? '';

if (!$username || !$submittedAnswer || !$newPassword) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => '全項目入力してください']);
    exit;
}

try {
    // 1. DBからハッシュ化された「答え」を取得
    $stmt = $pdo->prepare("SELECT security_answer FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'ユーザーが存在しません']);
        exit;
    }

    // 2. password_verify で答えを照合
    if (!password_verify($submittedAnswer, $user['security_answer'])) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => '答えが間違っています']);
        exit;
    }

    // 3. 合致していれば、新しいパスワードをハッシュ化して更新
    $newHashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
    $updateStmt->execute([$newHashedPassword, $username]);

    echo json_encode([
        'status' => 'success',
        'message' => 'パスワードを更新しました。新しいパスワードでログインしてください！'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}