<?php
require_once 'config.php';

$pdo = getDB();
$userId = $_SESSION['user_id'] ?? null;

$search = trim($_GET['search'] ?? '');
$category = trim($_GET['category'] ?? '');

$sql = 'SELECT e.*, u.name AS creator_name,
        (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id) AS rsvp_count';
if ($userId) {
    $sql .= ', (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.user_id = ?) AS user_rsvped';
}
$sql .= ' FROM events e JOIN users u ON e.user_id = u.id WHERE 1=1';

$params = [];
if ($userId) {
    $params[] = $userId;
}

if ($search !== '') {
    $sql .= ' AND e.title LIKE ?';
    $params[] = '%' . $search . '%';
}

if ($category !== '' && $category !== 'all') {
    $sql .= ' AND e.category = ?';
    $params[] = $category;
}

$sql .= ' ORDER BY e.date ASC, e.time ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$events = $stmt->fetchAll();

foreach ($events as &$event) {
    $event['user_rsvped'] = isset($event['user_rsvped']) ? (bool) $event['user_rsvped'] : false;
    $event['rsvp_count'] = (int) $event['rsvp_count'];
}

jsonResponse(['success' => true, 'events' => $events]);
