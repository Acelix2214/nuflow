<?php
session_start();
header('Content-Type: application/json');

try {
    require_once 'functions.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
    exit;
}

$action = $_POST['action'] ?? '';

switch ($action) {
    case 'login':
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        
        if (loginUser($username, $password)) {
            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'email' => $_SESSION['email'],
                    'role' => $_SESSION['role']
                ]
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid username or password'
            ]);
        }
        break;
        
    case 'register':
        $username = $_POST['username'] ?? '';
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $organization = $_POST['organization'] ?? '';
        
        if (empty($username) || empty($email) || empty($password) || empty($organization)) {
            echo json_encode([
                'success' => false,
                'message' => 'All fields are required'
            ]);
            break;
        }
        
        if (registerStudentOrganization($username, $email, $password, $organization)) {
            echo json_encode([
                'success' => true,
                'message' => 'Registration successful'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Username or email already exists'
            ]);
        }
        break;

    case 'register_org':
        $username = $_POST['username'] ?? '';
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $organizationName = $_POST['organizationName'] ?? '';
        
        if (empty($username) || empty($email) || empty($password) || empty($organizationName)) {
            echo json_encode([
                'success' => false,
                'message' => 'All fields are required'
            ]);
            break;
        }
        
        if (registerStudentOrganization($username, $email, $password, $organizationName)) {
            echo json_encode([
                'success' => true,
                'message' => 'Registration successful. Your organization is pending SDAO approval.'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Username or email already exists'
            ]);
        }
        break;
        
    case 'logout':
        logout();
        break;
        
    case 'check_session':
        if (isLoggedIn()) {
            echo json_encode([
                'success' => true,
                'loggedIn' => true,
                'user_id' => $_SESSION['user_id'],
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'email' => $_SESSION['email'],
                'role' => $_SESSION['role']
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'loggedIn' => false,
                'message' => 'Not logged in'
            ]);
        }
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action'
        ]);
}
?>
