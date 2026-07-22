<?php
require_once 'config.php';

$id = (int) ($_GET['id'] ?? 0);

if ($id <= 0) {
    jsonResponse(['success' => false, 'message' => 'Invalid event ID.'], 400);
}

$pdo = getDB();
$userId = $_SESSION['user_id'] ?? null;

$sql = 'SELECT e.*, u.name AS creator_name,
        (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id) AS rsvp_count';
if ($userId) {
    $sql .= ', (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.user_id = ?) AS user_rsvped';
}
$sql .= ' FROM events e JOIN users u ON e.user_id = u.id WHERE e.id = ?';

$params = $userId ? [$userId, $id] : [$id];
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$event = $stmt->fetch();

if (!$event) {
    jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
}

$event['user_rsvped'] = isset($event['user_rsvped']) ? (bool) $event['user_rsvped'] : false;
$event['rsvp_count'] = (int) $event['rsvp_count'];

jsonResponse(['success' => true, 'event' => $event]);
