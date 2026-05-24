<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

require_once 'config.php';

// Authentication functions
function loginUser($username, $password) {
    try {
        $conn = getDBConnection();
        
        $sql = "SELECT id, username, email, password, role, verification_status FROM users WHERE username = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            
            if (password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['email'] = $user['email'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['verification_status'] = $user['verification_status'];
                
                error_log("[v0] Login successful - Session set for: " . $user['username']);
                
                $stmt->close();
                $conn->close();
                return true;
            }
        }
        
        $stmt->close();
        $conn->close();
        return false;
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        return false;
    }
}

function registerStudentOrganization($username, $email, $password, $organizationName) {
    try {
        $conn = getDBConnection();
        
        // Check if username or email already exists
        $sql = "SELECT id FROM users WHERE username = ? OR email = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ss", $username, $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $stmt->close();
            $conn->close();
            return false;
        }
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $role = 'Student Organizations';
        $verificationStatus = 'Pending';
        
        $sql = "INSERT INTO users (username, email, password, role, organization_name, verification_status) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssss", $username, $email, $hashedPassword, $role, $organizationName, $verificationStatus);
        
        $success = $stmt->execute();
        
        error_log("[v0] Student org registration " . ($success ? "successful" : "failed") . " for: " . $username);
        
        $stmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Registration error: " . $e->getMessage());
        return false;
    }
}

function logout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}

function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Conflict detection functions
function checkTimeConflict($date, $startTime, $endTime, $facilityId, $excludeEventId = null) {
    try {
        $conn = getDBConnection();
        
        // Check for overlapping events on the same facility and date
        $sql = "SELECT id, title, event_time, end_time, venue FROM events 
                WHERE facility_id = ? 
                AND event_date = ? 
                AND approval_status IN ('Approved', 'Pending')
                AND (
                    (event_time < ? AND end_time > ?) OR
                    (event_time < ? AND end_time > ?) OR
                    (event_time >= ? AND event_time < ?) OR
                    (end_time > ? AND end_time <= ?)
                )";
        
        $params = [$facilityId, $date, $endTime, $startTime, $endTime, $startTime, $startTime, $endTime, $startTime, $endTime];
        
        // If updating an existing event, exclude it from conflict check
        if ($excludeEventId !== null) {
            $sql .= " AND id != ?";
            $params[] = $excludeEventId;
        }
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(str_repeat('s', count($params)), ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $conflicts = [];
        while ($row = $result->fetch_assoc()) {
            $conflicts[] = [
                'id' => $row['id'],
                'title' => $row['title'],
                'venue' => $row['venue'],
                'start_time' => $row['event_time'],
                'end_time' => $row['end_time']
            ];
        }
        
        $stmt->close();
        $conn->close();
        
        return $conflicts;
    } catch (Exception $e) {
        error_log("Check time conflict error: " . $e->getMessage());
        return [];
    }
}

function checkFacilityAvailability($facilityId, $date, $startTime, $endTime, $excludeEventId = null) {
    try {
        $conn = getDBConnection();
        
        // Get facility name for better error messages
        $facilitySql = "SELECT name FROM facilities WHERE id = ?";
        $facilityStmt = $conn->prepare($facilitySql);
        $facilityStmt->bind_param("i", $facilityId);
        $facilityStmt->execute();
        $facilityResult = $facilityStmt->get_result();
        $facility = $facilityResult->fetch_assoc();
        $facilityName = $facility ? $facility['name'] : "Unknown Facility";
        
        // Check for conflicts
        $conflicts = checkTimeConflict($date, $startTime, $endTime, $facilityId, $excludeEventId);
        
        $facilityStmt->close();
        $conn->close();
        
        return [
            'available' => empty($conflicts),
            'facility_name' => $facilityName,
            'conflicts' => $conflicts
        ];
    } catch (Exception $e) {
        error_log("Check facility availability error: " . $e->getMessage());
        return [
            'available' => false,
            'facility_name' => 'Unknown Facility',
            'conflicts' => [],
            'error' => 'Database error occurred'
        ];
    }
}

function validateEventTimes($startTime, $endTime) {
    try {
        $start = new DateTime($startTime);
        $end = new DateTime($endTime);
        
        if ($end <= $start) {
            return [
                'valid' => false,
                'message' => 'End time must be after start time'
            ];
        }
        
        // Check if event duration is reasonable (not more than 12 hours)
        $interval = $start->diff($end);
        $hours = $interval->h + ($interval->days * 24);
        
        if ($hours > 12) {
            return [
                'valid' => false,
                'message' => 'Event duration cannot exceed 12 hours'
            ];
        }
        
        return ['valid' => true];
    } catch (Exception $e) {
        return [
            'valid' => false,
            'message' => 'Invalid time format'
        ];
    }
}

function validateEventDate($date) {
    try {
        $eventDate = new DateTime($date);
        $today = new DateTime();
        $today->setTime(0, 0, 0); // Set to beginning of day
        
        if ($eventDate < $today) {
            return [
                'valid' => false,
                'message' => 'Event date cannot be in the past'
            ];
        }
        
        // Check if event is too far in the future (e.g., more than 1 year)
        $maxDate = clone $today;
        $maxDate->add(new DateInterval('P1Y')); // Add 1 year
        
        if ($eventDate > $maxDate) {
            return [
                'valid' => false,
                'message' => 'Event date cannot be more than 1 year in the future'
            ];
        }
        
        return ['valid' => true];
    } catch (Exception $e) {
        return [
            'valid' => false,
            'message' => 'Invalid date format'
        ];
    }
}

// Event functions
function createEvent($title, $description, $date, $time, $endTime, $venue, $facilityId, $userId) {
    try {
        // Validate input data
        if (empty($title) || empty($date) || empty($time) || empty($endTime)) {
            return [
                'success' => false,
                'message' => 'All required fields must be filled'
            ];
        }
        
        // Validate event date
        $dateValidation = validateEventDate($date);
        if (!$dateValidation['valid']) {
            return [
                'success' => false,
                'message' => $dateValidation['message']
            ];
        }
        
        // Validate event times
        $timeValidation = validateEventTimes($time, $endTime);
        if (!$timeValidation['valid']) {
            return [
                'success' => false,
                'message' => $timeValidation['message']
            ];
        }
        
        // Check facility availability and conflicts
        if ($facilityId) {
            $availability = checkFacilityAvailability($facilityId, $date, $time, $endTime);
            
            if (!$availability['available']) {
                $conflictMessages = [];
                foreach ($availability['conflicts'] as $conflict) {
                    $conflictMessages[] = "'{$conflict['title']}' from {$conflict['start_time']} to {$conflict['end_time']}";
                }
                
                $message = "Time conflict detected at {$availability['facility_name']}. ";
                $message .= "Conflicting events: " . implode(', ', $conflictMessages);
                
                return [
                    'success' => false,
                    'message' => $message,
                    'conflict_type' => 'time_facility',
                    'conflicts' => $availability['conflicts']
                ];
            }
        }
        
        $conn = getDBConnection();
        
        // Check user role to determine approval status
        $userSql = "SELECT role FROM users WHERE id = ?";
        $userStmt = $conn->prepare($userSql);
        $userStmt->bind_param("i", $userId);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        $user = $userResult->fetch_assoc();
        
        if (!$user) {
            $userStmt->close();
            $conn->close();
            return [
                'success' => false,
                'message' => 'Invalid user'
            ];
        }
        
        // SDAO Office can create approved events directly, others create pending requests
        $approvalStatus = ($user['role'] === 'SDAO Office') ? 'Approved' : 'Pending';
        
        $sql = "INSERT INTO events (title, description, event_date, event_time, end_time, venue, facility_id, created_by, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssssiis", $title, $description, $date, $time, $endTime, $venue, $facilityId, $userId, $approvalStatus);
        
        $success = $stmt->execute();
        
        if ($success && $approvalStatus === 'Pending') {
            // Create notification for SDAO about new event request
            createNotification(
                null, // Will be sent to all SDAO users
                'event_request',
                'New Event Request',
                "A new event request '{$title}' has been submitted for approval.",
                $stmt->insert_id,
                'event'
            );
        }
        
        $stmt->close();
        $userStmt->close();
        $conn->close();
        
        if ($success) {
            $message = ($user['role'] === 'SDAO Office') 
                ? 'Event created successfully' 
                : 'Event request submitted successfully. Waiting for SDAO approval.';
            
            return [
                'success' => true,
                'message' => $message
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to create event'
            ];
        }
    } catch (Exception $e) {
        error_log("Create event error: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Database error occurred while creating event'
        ];
    }
}

function updateEvent($id, $title, $description, $date, $time, $endTime, $venue, $facilityId = null) {
    try {
        // Validate input data
        if (empty($id) || empty($title) || empty($date) || empty($time) || empty($endTime)) {
            return [
                'success' => false,
                'message' => 'All required fields must be filled'
            ];
        }
        
        // Validate event date
        $dateValidation = validateEventDate($date);
        if (!$dateValidation['valid']) {
            return [
                'success' => false,
                'message' => $dateValidation['message']
            ];
        }
        
        // Validate event times
        $timeValidation = validateEventTimes($time, $endTime);
        if (!$timeValidation['valid']) {
            return [
                'success' => false,
                'message' => $timeValidation['message']
            ];
        }
        
        // Check facility availability and conflicts (excluding current event)
        if ($facilityId) {
            $availability = checkFacilityAvailability($facilityId, $date, $time, $endTime, $id);
            
            if (!$availability['available']) {
                $conflictMessages = [];
                foreach ($availability['conflicts'] as $conflict) {
                    $conflictMessages[] = "'{$conflict['title']}' from {$conflict['start_time']} to {$conflict['end_time']}";
                }
                
                $message = "Time conflict detected at {$availability['facility_name']}. ";
                $message .= "Conflicting events: " . implode(', ', $conflictMessages);
                
                return [
                    'success' => false,
                    'message' => $message,
                    'conflict_type' => 'time_facility',
                    'conflicts' => $availability['conflicts']
                ];
            }
        }
        
        $conn = getDBConnection();
        
        // Get current event details and user role
        $eventSql = "SELECT e.*, u.role FROM events e JOIN users u ON e.created_by = u.id WHERE e.id = ?";
        $eventStmt = $conn->prepare($eventSql);
        $eventStmt->bind_param("i", $id);
        $eventStmt->execute();
        $eventResult = $eventStmt->get_result();
        $currentEvent = $eventResult->fetch_assoc();
        
        if (!$currentEvent) {
            $eventStmt->close();
            $conn->close();
            return [
                'success' => false,
                'message' => 'Event not found'
            ];
        }
        
        // Check if this is a student organization editing an approved event
        $needsReapproval = false;
        if ($currentEvent['role'] === 'Student Organizations' && $currentEvent['approval_status'] === 'Approved') {
            // Check if any significant changes were made
            $hasSignificantChanges = (
                $currentEvent['title'] !== $title ||
                $currentEvent['event_date'] !== $date ||
                $currentEvent['event_time'] !== $time ||
                $currentEvent['end_time'] !== $endTime ||
                $currentEvent['venue'] !== $venue ||
                $currentEvent['facility_id'] != $facilityId
            );
            
            if ($hasSignificantChanges) {
                $needsReapproval = true;
            }
        }
        
        // Determine new approval status
        $newApprovalStatus = $currentEvent['approval_status'];
        if ($needsReapproval) {
            $newApprovalStatus = 'Pending';
        }
        
        // Update the event - also reset approved_by and approved_at if needs reapproval
        if ($facilityId) {
            if ($needsReapproval) {
                $sql = "UPDATE events SET title = ?, description = ?, event_date = ?, event_time = ?, end_time = ?, venue = ?, facility_id = ?, approval_status = ?, approved_by = NULL, approved_at = NULL WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ssssssiis", $title, $description, $date, $time, $endTime, $venue, $facilityId, $newApprovalStatus, $id);
            } else {
                $sql = "UPDATE events SET title = ?, description = ?, event_date = ?, event_time = ?, end_time = ?, venue = ?, facility_id = ?, approval_status = ? WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("ssssssiis", $title, $description, $date, $time, $endTime, $venue, $facilityId, $newApprovalStatus, $id);
            }
        } else {
            if ($needsReapproval) {
                $sql = "UPDATE events SET title = ?, description = ?, event_date = ?, event_time = ?, end_time = ?, venue = ?, approval_status = ?, approved_by = NULL, approved_at = NULL WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sssssssi", $title, $description, $date, $time, $endTime, $venue, $newApprovalStatus, $id);
            } else {
                $sql = "UPDATE events SET title = ?, description = ?, event_date = ?, event_time = ?, end_time = ?, venue = ?, approval_status = ? WHERE id = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sssssssi", $title, $description, $date, $time, $endTime, $venue, $newApprovalStatus, $id);
            }
        }
        
        $success = $stmt->execute();
        
        // If the event now needs reapproval, create notification for SDAO
        if ($success && $needsReapproval) {
            createNotification(
                null, // Will be sent to all SDAO users
                'event_edit_request',
                'Event Edit Request',
                "Event '{$title}' has been edited and requires re-approval.",
                $id,
                'event'
            );
        }
        
        $stmt->close();
        $eventStmt->close();
        $conn->close();
        
        if ($success) {
            $message = 'Event updated successfully';
            if ($needsReapproval) {
                $message .= '. Changes require SDAO approval - event status changed to Pending.';
            }
            
            return [
                'success' => true,
                'message' => $message,
                'needs_reapproval' => $needsReapproval
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to update event'
            ];
        }
    } catch (Exception $e) {
        error_log("Update event error: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Database error occurred while updating event'
        ];
    }
}

function deleteEvent($id) {
    try {
        $conn = getDBConnection();
        
        $sql = "DELETE FROM events WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        
        $success = $stmt->execute();
        
        $stmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Delete event error: " . $e->getMessage());
        return false;
    }
}

function getEventsByFacility($facilityId) {
    try {
        $conn = getDBConnection();
        
        $sql = "SELECT e.*, u.username as creator FROM events e 
                LEFT JOIN users u ON e.created_by = u.id 
                WHERE e.facility_id = ? AND e.event_date >= CURDATE() AND e.approval_status = 'Approved'
                ORDER BY e.event_date ASC, e.event_time ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $facilityId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $events = [];
        while ($row = $result->fetch_assoc()) {
            $events[] = $row;
        }
        
        $stmt->close();
        $conn->close();
        
        return $events;
    } catch (Exception $e) {
        error_log("Get events by facility error: " . $e->getMessage());
        return [];
    }
}

function approveEvent($id, $approvedBy) {
    try {
        $conn = getDBConnection();
        
        // Get event details for notification and conflict check
        $eventSql = "SELECT title, created_by, event_date, event_time, end_time, facility_id, venue FROM events WHERE id = ?";
        $eventStmt = $conn->prepare($eventSql);
        $eventStmt->bind_param("i", $id);
        $eventStmt->execute();
        $eventResult = $eventStmt->get_result();
        $event = $eventResult->fetch_assoc();
        
        if (!$event) {
            $eventStmt->close();
            $conn->close();
            return [
                'success' => false,
                'message' => 'Event not found'
            ];
        }
        
        // Check for conflicts before approving
        if ($event['facility_id']) {
            $availability = checkFacilityAvailability(
                $event['facility_id'], 
                $event['event_date'], 
                $event['event_time'], 
                $event['end_time'], 
                $id
            );
            
            if (!$availability['available']) {
                $conflictMessages = [];
                foreach ($availability['conflicts'] as $conflict) {
                    $conflictMessages[] = "'{$conflict['title']}' from {$conflict['start_time']} to {$conflict['end_time']}";
                }
                
                $message = "Cannot approve: Time conflict detected at {$availability['facility_name']}. ";
                $message .= "Conflicting events: " . implode(', ', $conflictMessages);
                
                $eventStmt->close();
                $conn->close();
                
                return [
                    'success' => false,
                    'message' => $message,
                    'conflict_type' => 'time_facility',
                    'conflicts' => $availability['conflicts']
                ];
            }
        }
        
        $sql = "UPDATE events SET approval_status = 'Approved', approved_by = ?, approved_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $approvedBy, $id);
        
        $success = $stmt->execute();
        
        if ($success && $event) {
            // Create notification for event creator
            createNotification(
                $event['created_by'],
                'event_approved',
                'Event Approved',
                "Your event '{$event['title']}' has been approved by SDAO.",
                $id,
                'event'
            );
        }
        
        $stmt->close();
        $eventStmt->close();
        $conn->close();
        
        return [
            'success' => $success,
            'message' => $success ? 'Event approved successfully' : 'Failed to approve event'
        ];
    } catch (Exception $e) {
        error_log("Approve event error: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Database error occurred while approving event'
        ];
    }
}

function rejectEvent($id, $rejectedBy, $reason = '') {
    try {
        $conn = getDBConnection();
        
        // Get event details for notification
        $eventSql = "SELECT title, created_by FROM events WHERE id = ?";
        $eventStmt = $conn->prepare($eventSql);
        $eventStmt->bind_param("i", $id);
        $eventStmt->execute();
        $eventResult = $eventStmt->get_result();
        $event = $eventResult->fetch_assoc();
        
        if ($event) {
            // Create notification for event creator before deleting
            $message = "Your event '{$event['title']}' has been rejected by SDAO.";
            if (!empty($reason)) {
                $message .= " Reason: " . $reason;
            }
            
            createNotification(
                $event['created_by'],
                'event_rejected',
                'Event Rejected',
                $message,
                $id,
                'event'
            );
        }
        
        // Delete the event
        $sql = "DELETE FROM events WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        
        $success = $stmt->execute();
        
        $stmt->close();
        $eventStmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Reject event error: " . $e->getMessage());
        return false;
    }
}

function getPendingEvents() {
    try {
        $conn = getDBConnection();
        
        $sql = "SELECT e.*, u.username as creator, u.organization_name FROM events e 
                LEFT JOIN users u ON e.created_by = u.id 
                WHERE e.approval_status = 'Pending'
                ORDER BY e.created_at DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $events = [];
        while ($row = $result->fetch_assoc()) {
            $events[] = $row;
        }
        
        $stmt->close();
        $conn->close();
        
        return $events;
    } catch (Exception $e) {
        error_log("Get pending events error: " . $e->getMessage());
        return [];
    }
}

// Facilities functions
function getFacilities() {
    try {
        $conn = getDBConnection();
        
        $sql = "SELECT * FROM facilities ORDER BY name ASC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $facilities = [];
        while ($row = $result->fetch_assoc()) {
            $facilities[] = $row;
        }
        
        $stmt->close();
        $conn->close();
        
        return $facilities;
    } catch (Exception $e) {
        error_log("Get facilities error: " . $e->getMessage());
        return [];
    }
}

// Announcement functions
function createAnnouncement($title, $content, $priority, $userId) {
    try {
        $conn = getDBConnection();
        
        // Check user role to determine approval status
        $userSql = "SELECT role FROM users WHERE id = ?";
        $userStmt = $conn->prepare($userSql);
        $userStmt->bind_param("i", $userId);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        $user = $userResult->fetch_assoc();
        
        // SDAO Office can create approved announcements directly, others create pending requests
        $approvalStatus = ($user['role'] === 'SDAO Office') ? 'Approved' : 'Pending';
        
        $sql = "INSERT INTO announcements (title, content, priority, created_by, approval_status) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssis", $title, $content, $priority, $userId, $approvalStatus);
        
        $success = $stmt->execute();
        
        if ($success && $approvalStatus === 'Pending') {
            // Create notification for SDAO about new announcement request
            createNotification(
                null, // Will be sent to all SDAO users
                'announcement_request',
                'New Announcement Request',
                "A new announcement request '{$title}' has been submitted for approval.",
                $stmt->insert_id,
                'announcement'
            );
        }
        
        $stmt->close();
        $userStmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Create announcement error: " . $e->getMessage());
        return false;
    }
}

function updateAnnouncement($id, $title, $content, $priority) {
    try {
        $conn = getDBConnection();
        
        // Get current announcement details and user role
        $announcementSql = "SELECT a.*, u.role FROM announcements a JOIN users u ON a.created_by = u.id WHERE a.id = ?";
        $announcementStmt = $conn->prepare($announcementSql);
        $announcementStmt->bind_param("i", $id);
        $announcementStmt->execute();
        $announcementResult = $announcementStmt->get_result();
        $currentAnnouncement = $announcementResult->fetch_assoc();
        
        if (!$currentAnnouncement) {
            $announcementStmt->close();
            $conn->close();
            return [
                'success' => false,
                'message' => 'Announcement not found'
            ];
        }
        
        // Check if this is a student organization editing an approved announcement
        $needsReapproval = false;
        if ($currentAnnouncement['role'] === 'Student Organizations' && $currentAnnouncement['approval_status'] === 'Approved') {
            // Check if any significant changes were made
            $hasSignificantChanges = (
                $currentAnnouncement['title'] !== $title ||
                $currentAnnouncement['content'] !== $content ||
                $currentAnnouncement['priority'] !== $priority
            );
            
            if ($hasSignificantChanges) {
                $needsReapproval = true;
            }
        }
        
        // Determine new approval status
        $newApprovalStatus = $currentAnnouncement['approval_status'];
        if ($needsReapproval) {
            $newApprovalStatus = 'Pending';
        }
        
        $sql = "UPDATE announcements SET title = ?, content = ?, priority = ?, approval_status = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssssi", $title, $content, $priority, $newApprovalStatus, $id);
        
        $success = $stmt->execute();
        
        // If the announcement now needs reapproval, create notification for SDAO
        if ($success && $needsReapproval) {
            createNotification(
                null, // Will be sent to all SDAO users
                'announcement_edit_request',
                'Announcement Edit Request',
                "Announcement '{$title}' has been edited and requires re-approval.",
                $id,
                'announcement'
            );
        }
        
        $stmt->close();
        $announcementStmt->close();
        $conn->close();
        
        if ($success) {
            $message = 'Announcement updated successfully';
            if ($needsReapproval) {
                $message .= '. Changes require SDAO approval - announcement status changed to Pending.';
            }
            
            return [
                'success' => true,
                'message' => $message,
                'needs_reapproval' => $needsReapproval
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to update announcement'
            ];
        }
    } catch (Exception $e) {
        error_log("Update announcement error: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Database error occurred while updating announcement'
        ];
    }
}

function deleteAnnouncement($id) {
    try {
        $conn = getDBConnection();
        
        $sql = "DELETE FROM announcements WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        
        $success = $stmt->execute();
        
        $stmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Delete announcement error: " . $e->getMessage());
        return false;
    }
}

function approveAnnouncement($id, $approvedBy) {
    try {
        $conn = getDBConnection();
        
        // Get announcement details for notification
        $announcementSql = "SELECT title, created_by FROM announcements WHERE id = ?";
        $announcementStmt = $conn->prepare($announcementSql);
        $announcementStmt->bind_param("i", $id);
        $announcementStmt->execute();
        $announcementResult = $announcementStmt->get_result();
        $announcement = $announcementResult->fetch_assoc();
        
        $sql = "UPDATE announcements SET approval_status = 'Approved', approved_by = ?, approved_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $approvedBy, $id);
        
        $success = $stmt->execute();
        
        if ($success && $announcement) {
            // Create notification for announcement creator
            createNotification(
                $announcement['created_by'],
                'announcement_approved',
                'Announcement Approved',
                "Your announcement '{$announcement['title']}' has been approved by SDAO.",
                $id,
                'announcement'
            );
        }
        
        $stmt->close();
        $announcementStmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Approve announcement error: " . $e->getMessage());
        return false;
    }
}

function rejectAnnouncement($id, $rejectedBy, $reason = '') {
    try {
        $conn = getDBConnection();
        
        // Get announcement details for notification
        $announcementSql = "SELECT title, created_by FROM announcements WHERE id = ?";
        $announcementStmt = $conn->prepare($announcementSql);
        $announcementStmt->bind_param("i", $id);
        $announcementStmt->execute();
        $announcementResult = $announcementStmt->get_result();
        $announcement = $announcementResult->fetch_assoc();
        
        if ($announcement) {
            // Create notification for announcement creator before deleting
            $message = "Your announcement '{$announcement['title']}' has been rejected by SDAO.";
            if (!empty($reason)) {
                $message .= " Reason: " . $reason;
            }
            
            createNotification(
                $announcement['created_by'],
                'announcement_rejected',
                'Announcement Rejected',
                $message,
                $id,
                'announcement'
            );
        }
        
        // Delete the announcement
        $sql = "DELETE FROM announcements WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        
        $success = $stmt->execute();
        
        $stmt->close();
        $announcementStmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Reject announcement error: " . $e->getMessage());
        return false;
    }
}

function getPendingAnnouncements() {
    try {
        $conn = getDBConnection();
        
        $sql = "SELECT a.*, u.username as creator, u.organization_name FROM announcements a 
                LEFT JOIN users u ON a.created_by = u.id 
                WHERE a.approval_status = 'Pending'
                ORDER BY a.created_at ASC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $announcements = [];
        while ($row = $result->fetch_assoc()) {
            $announcements[] = $row;
        }
        
        $stmt->close();
        $conn->close();
        
        return $announcements;
    } catch (Exception $e) {
        error_log("Get pending announcements error: " . $e->getMessage());
        return [];
    }
}

// Notification functions
function createNotification($userId, $type, $title, $message, $relatedId = null, $relatedType = null) {
    try {
        $conn = getDBConnection();
        
        // If userId is null, send to all SDAO users
        if ($userId === null) {
            $userSql = "SELECT id FROM users WHERE role = 'SDAO Office'";
            $userStmt = $conn->prepare($userSql);
            $userStmt->execute();
            $userResult = $userStmt->get_result();
            
            while ($user = $userResult->fetch_assoc()) {
                $sql = "INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("isssss", $user['id'], $type, $title, $message, $relatedId, $relatedType);
                $stmt->execute();
                $stmt->close();
            }
            $userStmt->close();
        } else {
            $sql = "INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("isssss", $userId, $type, $title, $message, $relatedId, $relatedType);
            $stmt->execute();
            $stmt->close();
        }
        
        $conn->close();
        return true;
    } catch (Exception $e) {
        error_log("Create notification error: " . $e->getMessage());
        return false;
    }
}

function getUserNotifications($userId, $limit = 50) {
    try {
        $conn = getDBConnection();
        
        $sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $userId, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $notifications = [];
        while ($row = $result->fetch_assoc()) {
            $notifications[] = $row;
        }
        
        $stmt->close();
        $conn->close();
        
        return $notifications;
    } catch (Exception $e) {
        error_log("Get notifications error: " . $e->getMessage());
        return [];
    }
}

function markNotificationAsRead($notificationId, $userId) {
    try {
        $conn = getDBConnection();
        
        $sql = "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $notificationId, $userId);
        
        $success = $stmt->execute();
        
        $stmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Mark notification as read error: " . $e->getMessage());
        return false;
    }
}

function markAllNotificationsAsRead($userId) {
    try {
        $conn = getDBConnection();
        
        $sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $userId);
        
        $success = $stmt->execute();
        
        $stmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Mark all notifications as read error: " . $e->getMessage());
        return false;
    }
}

function deleteNotification($notificationId, $userId) {
    try {
        $conn = getDBConnection();
        
        $sql = "DELETE FROM notifications WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $notificationId, $userId);
        
        $success = $stmt->execute();
        
        $stmt->close();
        $conn->close();
        
        return $success;
    } catch (Exception $e) {
        error_log("Delete notification error: " . $e->getMessage());
        return false;
    }
}

function getUnreadNotificationCount($userId) {
    try {
        $conn = getDBConnection();
        
        $sql = "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        $stmt->close();
        $conn->close();
        
        return $row['count'];
    } catch (Exception $e) {
        error_log("Get unread notification count error: " . $e->getMessage());
        return 0;
    }
}
?>