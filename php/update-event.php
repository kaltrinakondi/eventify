<?php
require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$user = requireAuth();
$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$id = $data['id'] ?? null;
$title = trim($data['title'] ?? '');
$description = trim($data['description'] ?? '');
$category = trim($data['category'] ?? '');
$date = $data['date'] ?? '';
$time = $data['time'] ?? '';
$location = trim($data['location'] ?? '');
$price = floatval($data['price'] ?? 0);

if (!$id || !$title || !$description || !$category || !$date || !$time || !$location) {
    jsonResponse(['success' => false, 'message' => 'All required fields must be filled.'], 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT organizer_id FROM events WHERE id = ?');
$stmt->execute([$id]);
$event = $stmt->fetch();

if (!$event) {
    jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
}

if ($event['organizer_id'] != $user['id'] && $user['role'] !== 'admin') {
    jsonResponse(['success' => false, 'message' => 'Not authorized to edit this event.'], 403);
}

$imagePath = null;
if (!empty($_FILES['image']['name'])) {
    $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($_FILES['image']['type'], $allowed)) {
        jsonResponse(['success' => false, 'message' => 'Invalid image format.'], 400);
    }
    $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $filename = 'event_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $dest = '../uploads/' . $filename;
    if (move_uploaded_file($_FILES['image']['tmp_name'], __DIR__ . '/' . $dest)) {
        $imagePath = 'uploads/' . $filename;
    }
}

if ($imagePath) {
    $stmt = $db->prepare('
        UPDATE events SET title=?, description=?, category=?, date=?, time=?, location=?, price=?, image=?
        WHERE id=?
    ');
    $stmt->execute([$title, $description, $category, $date, $time, $location, $price, $imagePath, $id]);
} else {
    $stmt = $db->prepare('
        UPDATE events SET title=?, description=?, category=?, date=?, time=?, location=?, price=?
        WHERE id=?
    ');
    $stmt->execute([$title, $description, $category, $date, $time, $location, $price, $id]);
}

jsonResponse(['success' => true, 'message' => 'Event updated successfully.']);
