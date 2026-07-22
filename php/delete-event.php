<?php
require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$user = requireAuth();
$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$id = $data['id'] ?? null;

if (!$id) {
    jsonResponse(['success' => false, 'message' => 'Event ID is required.'], 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT organizer_id FROM events WHERE id = ?');
$stmt->execute([$id]);
$event = $stmt->fetch();

if (!$event) {
    jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
}

if ($event['organizer_id'] != $user['id'] && $user['role'] !== 'admin') {
    jsonResponse(['success' => false, 'message' => 'Not authorized to delete this event.'], 403);
}

$stmt = $db->prepare('DELETE FROM events WHERE id = ?');
$stmt->execute([$id]);

jsonResponse(['success' => true, 'message' => 'Event deleted successfully.']);
