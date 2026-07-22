<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed.'], 405);
}

$userId = requireLogin();
$data = json_decode(file_get_contents('php://input'), true);

$title = trim($data['title'] ?? '');
$description = trim($data['description'] ?? '');
$category = trim($data['category'] ?? '');
$date = trim($data['date'] ?? '');
$time = trim($data['time'] ?? '');
$location = trim($data['location'] ?? '');
$image = trim($data['image'] ?? '');

if (empty($title) || empty($category) || empty($date) || empty($time) || empty($location)) {
    jsonResponse(['success' => false, 'message' => 'Title, category, date, time, and location are required.'], 400);
}

$pdo = getDB();
$stmt = $pdo->prepare(
    'INSERT INTO events (title, description, category, date, time, location, image, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([$title, $description, $category, $date, $time, $location, $image, $userId]);

jsonResponse([
    'success' => true,
    'message' => 'Event created successfully.',
    'event_id' => (int) $pdo->lastInsertId(),
]);
