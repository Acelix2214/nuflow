<?php
require_once 'functions.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = $_POST['username'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $organization = $_POST['organization'] ?? '';

    if (empty($username) || empty($email) || empty($password) || empty($organization)) {
        echo json_encode(["success" => false, "message" => "All fields are required."]);
        exit;
    }

    $result = registerUserWithOrganization($username, $email, $password, $organization);

    if ($result) {
        echo json_encode(["success" => true, "message" => "Account created successfully!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Username or email already exists."]);
    }
}
?>
