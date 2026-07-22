<?php
require_once 'config.php';

$userId = requireLogin();
$pdo = getDB();

$stmt = $pdo->prepare(
    'SELECT e.*, (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id) AS rsvp_count
     FROM events e WHERE e.user_id = ? ORDER BY e.date ASC, e.time ASC'
);
$stmt->execute([$userId]);
$events = $stmt->fetchAll();

foreach ($events as &$event) {
    $event['rsvp_count'] = (int) $event['rsvp_count'];
}

jsonResponse(['success' => true, 'events' => $events]);
