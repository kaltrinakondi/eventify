<?php
require_once 'database.php';

if (empty($_SESSION['user_id'])) {
    jsonResponse(['success' => true, 'loggedIn' => false, 'user' => null]);
}

jsonResponse([
    'success' => true,
    'loggedIn' => true,
    'user' => [
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'] ?? '',
        'email' => $_SESSION['user_email'] ?? '',
        'role' => $_SESSION['user_role'] ?? 'user',
    ],
]);
