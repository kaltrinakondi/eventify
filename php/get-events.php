<?php
require_once 'database.php';

$db = getDB();
$search = trim($_GET['search'] ?? '');
$category = trim($_GET['category'] ?? '');
$sort = $_GET['sort'] ?? 'date';
$featured = isset($_GET['featured']);
$upcoming = isset($_GET['upcoming']);
$id = $_GET['id'] ?? null;
$date = $_GET['date'] ?? null;
$organizer = $_GET['organizer_id'] ?? null;
$rsvp_user = $_GET['rsvp_user_id'] ?? null;

if ($id) {
    $stmt = $db->prepare('
        SELECT e.*, u.name AS organizer_name,
        (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = "going") AS rsvp_count,
        (SELECT AVG(rating) FROM reviews rev WHERE rev.event_id = e.id) AS avg_rating
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        WHERE e.id = ?
    ');
    $stmt->execute([$id]);
    $event = $stmt->fetch();
    if (!$event) {
        jsonResponse(['success' => false, 'message' => 'Event not found'], 404);
    }
    jsonResponse(['success' => true, 'event' => $event]);
}

$sql = '
    SELECT e.*, u.name AS organizer_name,
    (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = "going") AS rsvp_count
    FROM events e
    JOIN users u ON e.organizer_id = u.id
    WHERE 1=1
';
$params = [];

if ($search) {
    $sql .= ' AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
    $term = "%$search%";
    $params = array_merge($params, [$term, $term, $term]);
}
if ($category) {
    $sql .= ' AND e.category = ?';
    $params[] = $category;
}
if ($upcoming) {
    $sql .= ' AND e.date >= CURDATE()';
}
if ($date) {
    $sql .= ' AND e.date = ?';
    $params[] = $date;
}
if ($organizer) {
    $sql .= ' AND e.organizer_id = ?';
    $params[] = $organizer;
}
if ($rsvp_user) {
    $sql .= ' AND e.id IN (SELECT event_id FROM rsvps WHERE user_id = ? AND status = "going")';
    $params[] = $rsvp_user;
}

$orderMap = [
    'date' => 'e.date ASC, e.time ASC',
    'date_desc' => 'e.date DESC, e.time DESC',
    'title' => 'e.title ASC',
    'price' => 'e.price ASC'
];
$sql .= ' ORDER BY ' . ($orderMap[$sort] ?? $orderMap['date']);

if ($featured) {
    $sql .= ' LIMIT 3';
}

$stmt = $db->prepare($sql);
$stmt->execute($params);
$events = $stmt->fetchAll();

jsonResponse(['success' => true, 'events' => $events]);
