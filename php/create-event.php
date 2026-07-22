<?php
require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$user = requireAuth();
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$category = trim($_POST['category'] ?? '');
$date = $_POST['date'] ?? '';
$time = $_POST['time'] ?? '';
$location = trim($_POST['location'] ?? '');
$price = floatval($_POST['price'] ?? 0);

if (!$title || !$description || !$category || !$date || !$time || !$location) {
    jsonResponse(['success' => false, 'message' => 'All required fields must be filled.'], 400);
}

$db = getDB();
$imagePath = 'images/default-event.jpg';

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

$stmt = $db->prepare('
    INSERT INTO events (title, description, category, date, time, location, price, image, organizer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
');
$stmt->execute([$title, $description, $category, $date, $time, $location, $price, $imagePath, $user['id']]);

jsonResponse(['success' => true, 'message' => 'Event created successfully.', 'event_id' => $db->lastInsertId()]);
