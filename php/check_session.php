<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(["loggedIn" => false]);
} else {
    echo json_encode([
        "loggedIn" => true,
        "user_id" => $_SESSION['user_id'],
        "id" => $_SESSION['user_id'],
        "username" => $_SESSION['username'],
        "role" => $_SESSION['role']
    ]);
}
?>
