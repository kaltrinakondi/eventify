<?php
require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$user = requireAuth();
$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$eventId = $data['event_id'] ?? null;
$rating = (int)($data['rating'] ?? 0);
$comment = trim($data['comment'] ?? '');

if (!$eventId || $rating < 1 || $rating > 5) {
    jsonResponse(['success' => false, 'message' => 'Valid event ID and rating (1-5) are required.'], 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT id FROM events WHERE id = ?');
$stmt->execute([$eventId]);
if (!$stmt->fetch()) {
    jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
}

$stmt = $db->prepare('
    INSERT INTO reviews (user_id, event_id, rating, comment) VALUES (?, ?, ?, ?)
');
$stmt->execute([$user['id'], $eventId, $rating, $comment]);

jsonResponse(['success' => true, 'message' => 'Review submitted successfully.']);
