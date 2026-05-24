<?php
session_start();
require_once 'functions.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

header('Content-Type: application/json');
ob_start();

$action = $_REQUEST['action'] ?? '';

if ($action === 'get') {
    $conn = getDBConnection();
    
    // Only show approved events for general view
    $sql = "SELECT e.*, u.username as creator FROM events e 
            LEFT JOIN users u ON e.created_by = u.id 
            WHERE e.event_date >= CURDATE() AND e.approval_status = 'Approved'
            ORDER BY e.event_date ASC, e.event_time ASC 
            LIMIT 50";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $events = [];
    while ($row = $result->fetch_assoc()) {
        $events[] = $row;
    }
    
    $conn->close();
    echo json_encode(['success' => true, 'events' => $events]);
} elseif ($action === 'getUserEvents') {
    // Get events created by current user (including pending ones)
    $userId = $_SESSION['user_id'] ?? null;
    
    if (!$userId) {
        echo json_encode(['success' => false, 'message' => 'User not logged in']);
        exit;
    }
    
    $conn = getDBConnection();
    
    $sql = "SELECT e.*, u.username as creator FROM events e 
            LEFT JOIN users u ON e.created_by = u.id 
            WHERE e.created_by = ? AND e.event_date >= CURDATE()
            ORDER BY e.event_date ASC, e.event_time ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $events = [];
    while ($row = $result->fetch_assoc()) {
        $events[] = $row;
    }
    
    $conn->close();
    echo json_encode(['success' => true, 'events' => $events]);
} elseif ($action === 'create') {
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $date = $_POST['event_date'] ?? '';
    $time = $_POST['event_time'] ?? '';
    $endTime = $_POST['end_time'] ?? '';
    $venue = $_POST['venue'] ?? '';
    $facilityId = !empty($_POST['facility_id']) ? (int)$_POST['facility_id'] : null;
    
    // Get user ID from session
    $userId = $_SESSION['user_id'] ?? null;
    
    if (empty($title) || empty($date) || empty($time) || empty($endTime)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    if (!$userId || $userId <= 0) {
        error_log("[v0] Event creation failed - invalid user_id: " . var_export($userId, true));
        echo json_encode(['success' => false, 'message' => 'User ID is invalid. Please log in again.']);
        exit;
    }
    
    $result = createEvent($title, $description, $date, $time, $endTime, $venue, $facilityId, $userId);
    
    // Handle the new response format from createEvent function
    if (is_array($result)) {
        echo json_encode($result);
    } else {
        // Legacy support for boolean return
        if ($result) {
            $userRole = $_SESSION['role'] ?? '';
            if ($userRole === 'SDAO Office') {
                $message = 'Event created successfully';
            } else {
                $message = 'Event request submitted successfully. Waiting for SDAO approval.';
            }
            echo json_encode(['success' => true, 'message' => $message]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to create event']);
        }
    }
} elseif ($action === 'update') {
    $id = $_POST['id'] ?? '';
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $date = $_POST['event_date'] ?? '';
    $time = $_POST['event_time'] ?? '';
    $endTime = $_POST['end_time'] ?? '';
    $venue = $_POST['venue'] ?? '';
    $facilityId = !empty($_POST['facility_id']) ? (int)$_POST['facility_id'] : null;
    
    if (empty($id) || empty($title) || empty($date) || empty($time) || empty($endTime)) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    $result = updateEvent($id, $title, $description, $date, $time, $endTime, $venue, $facilityId);
    
    // Handle the new response format from updateEvent function
    if (is_array($result)) {
        echo json_encode($result);
    } else {
        // Legacy support for boolean return
        echo json_encode(['success' => $result, 'message' => $result ? 'Event updated successfully' : 'Failed to update event']);
    }
} elseif ($action === 'delete') {
    $id = $_POST['id'] ?? '';
    
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Event ID is required']);
        exit;
    }
    
    $success = deleteEvent($id);
    echo json_encode(['success' => $success, 'message' => $success ? 'Event deleted successfully' : 'Failed to delete event']);
} elseif ($action === 'getByFacility') {
    $facilityId = $_POST['facilityId'] ?? '';
    
    if (empty($facilityId)) {
        echo json_encode(['success' => false, 'message' => 'Facility ID is required']);
        exit;
    }
    
    $events = getEventsByFacility($facilityId);
    echo json_encode(['success' => true, 'events' => $events]);
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
    
    $result = approveEvent($id, $userId);
    
    // Handle the new response format from approveEvent function
    if (is_array($result)) {
        echo json_encode($result);
    } else {
        // Legacy support for boolean return
        echo json_encode(['success' => $result, 'message' => $result ? 'Event approved successfully' : 'Failed to approve event']);
    }
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
    
    $success = rejectEvent($id, $userId, $reason);
    echo json_encode(['success' => $success, 'message' => $success ? 'Event rejected successfully' : 'Failed to reject event']);
} elseif ($action === 'getPending') {
    // Check if user has permission (SDAO Office only)
    if ($_SESSION['role'] !== 'SDAO Office') {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    
    $events = getPendingEvents();
    echo json_encode(['success' => true, 'events' => $events]);
} elseif ($action === 'checkConflicts') {
    // New endpoint to check for conflicts without creating an event
    $date = $_POST['event_date'] ?? '';
    $startTime = $_POST['event_time'] ?? '';
    $endTime = $_POST['end_time'] ?? '';
    $facilityId = !empty($_POST['facility_id']) ? (int)$_POST['facility_id'] : null;
    $excludeEventId = !empty($_POST['exclude_event_id']) ? (int)$_POST['exclude_event_id'] : null;
    
    if (empty($date) || empty($startTime) || empty($endTime) || !$facilityId) {
        echo json_encode(['success' => false, 'message' => 'Date, times, and facility are required']);
        exit;
    }
    
    // Validate event times
    $timeValidation = validateEventTimes($startTime, $endTime);
    if (!$timeValidation['valid']) {
        echo json_encode(['success' => false, 'message' => $timeValidation['message']]);
        exit;
    }
    
    // Check facility availability
    $availability = checkFacilityAvailability($facilityId, $date, $startTime, $endTime, $excludeEventId);
    
    if ($availability['available']) {
        echo json_encode([
            'success' => true,
            'available' => true,
            'message' => 'No conflicts found. Facility is available.',
            'facility_name' => $availability['facility_name']
        ]);
    } else {
        $conflictMessages = [];
        foreach ($availability['conflicts'] as $conflict) {
            $conflictMessages[] = "'{$conflict['title']}' from {$conflict['start_time']} to {$conflict['end_time']}";
        }
        
        echo json_encode([
            'success' => true,
            'available' => false,
            'message' => "Time conflicts detected at {$availability['facility_name']}",
            'facility_name' => $availability['facility_name'],
            'conflicts' => $availability['conflicts'],
            'conflict_details' => $conflictMessages
        ]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

ob_end_flush();
?>