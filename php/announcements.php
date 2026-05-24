<?php
session_start();
require_once 'functions.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

header('Content-Type: application/json');

$action = $_REQUEST['action'] ?? '';

if ($action === 'get') {
    $conn = getDBConnection();
    
    // Only show approved announcements for general view
    $sql = "SELECT a.*, u.username as creator FROM announcements a 
            LEFT JOIN users u ON a.created_by = u.id 
            WHERE a.approval_status = 'Approved'
            ORDER BY a.created_at DESC 
            LIMIT 50";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $announcements = [];
    while ($row = $result->fetch_assoc()) {
        $announcements[] = $row;
    }
    
    $conn->close();
    echo json_encode(['success' => true, 'announcements' => $announcements]);
} elseif ($action === 'getUserAnnouncements') {
    // Get announcements created by current user (including pending ones)
    $userId = $_SESSION['user_id'] ?? null;
    
    if (!$userId) {
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        exit;
    }
    
    $conn = getDBConnection();
    
    $sql = "SELECT a.*, u.username as creator FROM announcements a 
            LEFT JOIN users u ON a.created_by = u.id 
            WHERE a.created_by = ?
            ORDER BY a.created_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $announcements = [];
    while ($row = $result->fetch_assoc()) {
        $announcements[] = $row;
    }
    
    $conn->close();
    echo json_encode(['success' => true, 'announcements' => $announcements]);
} elseif ($action === 'create') {
    $title = $_POST['title'] ?? '';
    $content = $_POST['content'] ?? '';
    $priority = $_POST['priority'] ?? 'Medium';
    $userId = $_SESSION['user_id'] ?? null;
    
    if (empty($title) || empty($content) || !$userId) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    $success = createAnnouncement($title, $content, $priority, $userId);
    
    if ($success) {
        // Check user role to determine message
        $userRole = $_SESSION['role'] ?? '';
        if ($userRole === 'SDAO Office') {
            $message = 'Announcement created successfully';
        } else {
            $message = 'Announcement request submitted successfully. Waiting for SDAO approval.';
        }
        echo json_encode(['success' => true, 'message' => $message]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to create announcement']);
    }
} elseif ($action === 'update') {
    $id = $_POST['id'] ?? '';
    $title = $_POST['title'] ?? '';
    $content = $_POST['content'] ?? '';
    $priority = $_POST['priority'] ?? 'Medium';
    
    if (empty($id) || empty($title) || empty($content)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    $result = updateAnnouncement($id, $title, $content, $priority);
    
    // Handle the new response format from updateAnnouncement function
    if (is_array($result)) {
        echo json_encode($result);
    } else {
        // Legacy support for boolean return
        echo json_encode(['success' => $result, 'message' => $result ? 'Announcement updated successfully' : 'Failed to update announcement']);
    }
} elseif ($action === 'delete') {
    $id = $_POST['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Announcement ID is required']);
        exit;
    }
    
    $success = deleteAnnouncement($id);
    echo json_encode(['success' => $success, 'message' => $success ? 'Announcement deleted successfully' : 'Failed to delete announcement']);
} elseif ($action === 'approve') {
    $id = $_POST['id'] ?? '';
    $userId = $_SESSION['user_id'] ?? null;
    
    if (empty($id) || !$userId) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    // Check if user has permission (SDAO Office only)
    if ($_SESSION['role'] !== 'SDAO Office') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    
    $success = approveAnnouncement($id, $userId);
    echo json_encode(['success' => $success, 'message' => $success ? 'Announcement approved successfully' : 'Failed to approve announcement']);
} elseif ($action === 'reject') {
    $id = $_POST['id'] ?? '';
    $reason = $_POST['reason'] ?? '';
    $userId = $_SESSION['user_id'] ?? null;
    
    if (empty($id) || !$userId) {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }
    
    // Check if user has permission (SDAO Office only)
    if ($_SESSION['role'] !== 'SDAO Office') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    
    $success = rejectAnnouncement($id, $userId, $reason);
    echo json_encode(['success' => $success, 'message' => $success ? 'Announcement rejected successfully' : 'Failed to reject announcement']);
} elseif ($action === 'getPending') {
    // Check if user has permission (SDAO Office only)
    if ($_SESSION['role'] !== 'SDAO Office') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    
    $announcements = getPendingAnnouncements();
    echo json_encode(['success' => true, 'announcements' => $announcements]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>