<?php
require_once 'database.php';

session_destroy();
session_start();

jsonResponse(['success' => true, 'message' => 'Logged out successfully.']);
