<?php
require_once 'database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Invalid request method.'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$confirm = $data['confirm_password'] ?? $data['confirmPassword'] ?? '';

if (!$name || !$email || !$password || !$confirm) {
    jsonResponse(['success' => false, 'message' => 'All fields are required.'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['success' => false, 'message' => 'Invalid email address.'], 400);
}

if (strlen($password) < 6) {
    jsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters.'], 400);
}

if ($password !== $confirm) {
    jsonResponse(['success' => false, 'message' => 'Passwords do not match.'], 400);
}

$db = getDB();
$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonResponse(['success' => false, 'message' => 'Email already registered.'], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $db->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
$stmt->execute([$name, $email, $hash]);

$_SESSION['user_id'] = $db->lastInsertId();
$_SESSION['user_name'] = $name;
$_SESSION['user_email'] = $email;
$_SESSION['user_role'] = 'user';

jsonResponse([
    'success' => true,
    'message' => 'Registration successful.',
    'user' => [
        'id' => $_SESSION['user_id'],
        'name' => $name,
        'email' => $email,
        'role' => 'user',
    ],
]);
