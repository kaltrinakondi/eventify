<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$userId = requireLogin();
$data = json_decode(file_get_contents('php://input'), true);

$id = (int) ($data['id'] ?? 0);
$title = trim($data['title'] ?? '');
$description = trim($data['description'] ?? '');
$category = trim($data['category'] ?? '');
$date = trim($data['date'] ?? '');
$time = trim($data['time'] ?? '');
$location = trim($data['location'] ?? '');
$image = trim($data['image'] ?? '');

if ($id <= 0) {
    jsonResponse(['success' => false, 'message' => 'Invalid event ID.'], 400);
}

if (empty($title) || empty($category) || empty($date) || empty($time) || empty($location)) {
    jsonResponse(['success' => false, 'message' => 'Title, category, date, time, and location are required.'], 400);
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT user_id FROM events WHERE id = ?');
$stmt->execute([$id]);
$event = $stmt->fetch();

if (!$event) {
    jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
}

if ((int) $event['user_id'] !== $userId) {
    jsonResponse(['success' => false, 'message' => 'You can only edit your own events.'], 403);
}

$stmt = $pdo->prepare(
    'UPDATE events SET title = ?, description = ?, category = ?, date = ?, time = ?, location = ?, image = ?
     WHERE id = ?'
);
$stmt->execute([$title, $description, $category, $date, $time, $location, $image, $id]);

jsonResponse(['success' => true, 'message' => 'Event updated successfully.']);
