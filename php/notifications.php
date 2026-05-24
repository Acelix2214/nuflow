<?php
session_start();
require_once 'functions.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

header('Content-Type: application/json');

// Handle both GET and POST requests
$action = $_REQUEST['action'] ?? '';
$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}

if ($action === 'get') {
    $limit = $_REQUEST['limit'] ?? 50;
    $notifications = getUserNotifications($userId, $limit);
    echo json_encode(['success' => true, 'notifications' => $notifications]);
} elseif ($action === 'markAsRead') {
    $notificationId = $_REQUEST['id'] ?? '';
    
    if (empty($notificationId)) {
        echo json_encode(['success' => false, 'message' => 'Notification ID is required']);
        exit;
    }
    
    $success = markNotificationAsRead($notificationId, $userId);
    echo json_encode(['success' => $success, 'message' => $success ? 'Notification marked as read' : 'Failed to mark notification as read']);
} elseif ($action === 'markAllAsRead') {
    $success = markAllNotificationsAsRead($userId);
    echo json_encode(['success' => $success, 'message' => $success ? 'All notifications marked as read' : 'Failed to mark all notifications as read']);
} elseif ($action === 'delete') {
    $notificationId = $_REQUEST['id'] ?? '';
    
    if (empty($notificationId)) {
        echo json_encode(['success' => false, 'message' => 'Notification ID is required']);
        exit;
    }
    
    $success = deleteNotification($notificationId, $userId);
    echo json_encode(['success' => $success, 'message' => $success ? 'Notification deleted successfully' : 'Failed to delete notification']);
} elseif ($action === 'getUnreadCount') {
    $count = getUnreadNotificationCount($userId);
    echo json_encode(['success' => true, 'count' => $count]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>