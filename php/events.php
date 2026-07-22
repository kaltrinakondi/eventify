<?php
require_once 'database.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;
    $category = $_GET['category'] ?? null;
    $search = $_GET['search'] ?? null;
    $sort = $_GET['sort'] ?? 'date_asc';
    $date = $_GET['date'] ?? null;
    $organizer = $_GET['organizer_id'] ?? null;
    $featured = $_GET['featured'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 50), 100);

    if ($id) {
        $stmt = $db->prepare('
            SELECT e.*, u.name AS organizer_name,
                   (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = "going") AS rsvp_count,
                   (SELECT ROUND(AVG(rating), 1) FROM reviews rv WHERE rv.event_id = e.id) AS avg_rating
            FROM events e
            JOIN users u ON e.organizer_id = u.id
            WHERE e.id = ?
        ');
        $stmt->execute([$id]);
        $event = $stmt->fetch();
        if (!$event) {
            jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
        }

        $reviews = $db->prepare('
            SELECT r.*, u.name AS user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.event_id = ?
            ORDER BY r.created_at DESC
        ');
        $reviews->execute([$id]);

        jsonResponse(['success' => true, 'event' => $event, 'reviews' => $reviews->fetchAll()]);
    }

    $sql = '
        SELECT e.*, u.name AS organizer_name,
               (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = "going") AS rsvp_count
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        WHERE 1=1
    ';
    $params = [];

    if ($category && $category !== 'all') {
        $sql .= ' AND e.category = ?';
        $params[] = $category;
    }
    if ($search) {
        $sql .= ' AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
        $term = '%' . $search . '%';
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }
    if ($date) {
        $sql .= ' AND e.date = ?';
        $params[] = $date;
    }
    if ($organizer) {
        $sql .= ' AND e.organizer_id = ?';
        $params[] = $organizer;
    }
    if ($featured) {
        $sql .= ' AND e.date >= CURDATE()';
    }

    switch ($sort) {
        case 'date_desc':
            $sql .= ' ORDER BY e.date DESC, e.time DESC';
            break;
        case 'title_asc':
            $sql .= ' ORDER BY e.title ASC';
            break;
        case 'price_asc':
            $sql .= ' ORDER BY e.price ASC';
            break;
        case 'price_desc':
            $sql .= ' ORDER BY e.price DESC';
            break;
        default:
            $sql .= ' ORDER BY e.date ASC, e.time ASC';
    }

    $sql .= ' LIMIT ' . $limit;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['success' => true, 'events' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
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
}

jsonResponse(['success' => false, 'message' => 'Invalid request.'], 405);
