<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$userId = requireLogin();
$data = json_decode(file_get_contents('php://input'), true);

$id = (int) ($data['id'] ?? 0);

if ($id <= 0) {
    jsonResponse(['success' => false, 'message' => 'Invalid event ID.'], 400);
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT user_id FROM events WHERE id = ?');
$stmt->execute([$id]);
$event = $stmt->fetch();

if (!$event) {
    jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
}

if ((int) $event['user_id'] !== $userId) {
    jsonResponse(['success' => false, 'message' => 'You can only delete your own events.'], 403);
}

$stmt = $pdo->prepare('DELETE FROM events WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['success' => true, 'message' => 'Event deleted successfully.']);
