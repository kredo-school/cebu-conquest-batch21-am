<?php
require_once __DIR__ . '/api-cors.php';
require_once __DIR__ . '/../db_connection.php';
require_once 'jwt-helper.php';

/**
 * Cebu Conquest: Room Listing API
 * Role: Fetches all rooms currently in 'waiting' status along with player counts.
 */

// Note: By Garry the line below only visible to logged-in users/players

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    exit(json_encode(['status' => 'error', 'message' => 'Unauthorized']));
}


try {
    // 2. Query to fetch waiting rooms, their host names, and current player counts
    $query = "
        SELECT 
            r.id, 
            r.room_key, 
            r.host_user_id,
            r.status,
            u.username as host_name,
            (SELECT COUNT(*) FROM room_players WHERE room_id = r.id) as current_players
        FROM rooms r
        JOIN users u ON r.host_user_id = u.id
        WHERE r.status = 'waiting'
        ORDER BY r.created_at DESC
    ";

    $stmt = $pdo->query($query);
    $rooms = $stmt->fetchAll();

    // 3. Success Response
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'success',
        'data' => $rooms
    ]);

} catch (Exception $e) {
    // 4. Error Handling
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error', 
        'message' => 'Failed to fetch rooms: ' . $e->getMessage()
    ]);
}
