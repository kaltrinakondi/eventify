<?php
require_once 'database.php';

requireAdmin();
$db = getDB();
$action = $_GET['action'] ?? 'stats';

if ($action === 'stats') {
    $stats = [
        'users' => $db->query('SELECT COUNT(*) FROM users')->fetchColumn(),
        'events' => $db->query('SELECT COUNT(*) FROM events')->fetchColumn(),
        'rsvps' => $db->query('SELECT COUNT(*) FROM rsvps WHERE status = "going"')->fetchColumn(),
        'reviews' => $db->query('SELECT COUNT(*) FROM reviews')->fetchColumn(),
        'upcoming' => $db->query('SELECT COUNT(*) FROM events WHERE date >= CURDATE()')->fetchColumn(),
    ];
    jsonResponse(['success' => true, 'stats' => $stats]);
}

if ($action === 'users') {
    $users = $db->query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC')->fetchAll();
    jsonResponse(['success' => true, 'users' => $users]);
}

if ($action === 'events') {
    $events = $db->query('
        SELECT e.*, u.name AS organizer_name
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        ORDER BY e.created_at DESC
    ')->fetchAll();
    jsonResponse(['success' => true, 'events' => $events]);
}

if ($action === 'delete_user' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = $data['id'] ?? null;
    if (!$id) {
        jsonResponse(['success' => false, 'message' => 'User ID required.'], 400);
    }
    if ($id == $_SESSION['user_id']) {
        jsonResponse(['success' => false, 'message' => 'Cannot delete your own account.'], 400);
    }
    $stmt = $db->prepare('DELETE FROM users WHERE id = ? AND role != "admin"');
    $stmt->execute([$id]);
    jsonResponse(['success' => true, 'message' => 'User deleted.']);
}

jsonResponse(['success' => false, 'message' => 'Invalid action.'], 400);
