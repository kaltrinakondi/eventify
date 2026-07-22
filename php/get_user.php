<?php
require_once 'config.php';

$user = getCurrentUser();

if ($user) {
    jsonResponse(['success' => true, 'user' => $user]);
}

jsonResponse(['success' => true, 'user' => null]);
