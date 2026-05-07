<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

$input = json_decode(file_get_contents("php://input"), true);
$username = trim($input['username'] ?? '');

try {
    $stmt = $pdo->prepare("SELECT security_question FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'ユーザーが見つかりません']);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'question' => $user['security_question']
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}