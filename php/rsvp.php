<?php
require_once 'database.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user = requireAuth();
    $type = $_GET['type'] ?? 'all';

    $created = [];
    $rsvpd = [];

    if ($type === 'all' || $type === 'created') {
        $stmt = $db->prepare('
            SELECT e.*, u.name AS organizer_name,
                   (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = "going") AS rsvp_count
            FROM events e
            JOIN users u ON e.organizer_id = u.id
            WHERE e.organizer_id = ?
            ORDER BY e.date DESC
        ');
        $stmt->execute([$user['id']]);
        $created = $stmt->fetchAll();
    }

    if ($type === 'all' || $type === 'rsvpd') {
        $stmt = $db->prepare('
            SELECT e.*, u.name AS organizer_name, rv.status AS rsvp_status,
                   (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = "going") AS rsvp_count
            FROM rsvps rv
            JOIN events e ON rv.event_id = e.id
            JOIN users u ON e.organizer_id = u.id
            WHERE rv.user_id = ? AND rv.status = "going"
            ORDER BY e.date ASC
        ');
        $stmt->execute([$user['id']]);
        $rsvpd = $stmt->fetchAll();
    }

    jsonResponse(['success' => true, 'created' => $created, 'rsvpd' => $rsvpd]);
}

if ($method === 'POST') {
    $user = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $eventId = $data['event_id'] ?? null;
    $status = $data['status'] ?? 'going';

    if (!$eventId) {
        jsonResponse(['success' => false, 'message' => 'Event ID is required.'], 400);
    }

    $stmt = $db->prepare('SELECT id FROM events WHERE id = ?');
    $stmt->execute([$eventId]);
    if (!$stmt->fetch()) {
        jsonResponse(['success' => false, 'message' => 'Event not found.'], 404);
    }

    if ($status === 'cancelled') {
        $stmt = $db->prepare('DELETE FROM rsvps WHERE user_id = ? AND event_id = ?');
        $stmt->execute([$user['id'], $eventId]);
        jsonResponse(['success' => true, 'message' => 'RSVP cancelled.']);
    }

    $stmt = $db->prepare('
        INSERT INTO rsvps (user_id, event_id, status) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status)
    ');
    $stmt->execute([$user['id'], $eventId, $status]);
    jsonResponse(['success' => true, 'message' => 'RSVP confirmed!']);
}

jsonResponse(['success' => false, 'message' => 'Invalid request.'], 405);
