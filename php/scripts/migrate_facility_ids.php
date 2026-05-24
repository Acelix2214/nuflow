<?php
/**
 * Migration script to link events with facilities based on venue names
 * This script matches event venues with facility names and updates facility_id
 */

require_once __DIR__ . '/../php/config.php';

try {
    $conn = getDBConnection();
    
    echo "[v0] Starting facility ID migration...\n";
    
    // Get all facilities
    $facilitiesSql = "SELECT id, name FROM facilities";
    $facilitiesResult = $conn->query($facilitiesSql);
    $facilities = [];
    
    while ($row = $facilitiesResult->fetch_assoc()) {
        $facilities[$row['name']] = $row['id'];
    }
    
    echo "[v0] Found " . count($facilities) . " facilities\n";
    
    // Get all events without facility_id
    $eventsSql = "SELECT id, venue FROM events WHERE facility_id IS NULL OR facility_id = 0";
    $eventsResult = $conn->query($eventsSql);
    
    $updated = 0;
    $notFound = 0;
    
    while ($event = $eventsResult->fetch_assoc()) {
        $venue = trim($event['venue']);
        
        // Try to find matching facility
        if (isset($facilities[$venue])) {
            $facilityId = $facilities[$venue];
            $updateSql = "UPDATE events SET facility_id = ? WHERE id = ?";
            $stmt = $conn->prepare($updateSql);
            $stmt->bind_param("ii", $facilityId, $event['id']);
            
            if ($stmt->execute()) {
                echo "[v0] Updated event {$event['id']}: venue '{$venue}' -> facility_id {$facilityId}\n";
                $updated++;
            } else {
                echo "[v0] Failed to update event {$event['id']}: " . $stmt->error . "\n";
            }
            $stmt->close();
        } else {
            echo "[v0] No matching facility found for venue: '{$venue}'\n";
            $notFound++;
        }
    }
    
    echo "[v0] Migration complete!\n";
    echo "[v0] Updated: $updated events\n";
    echo "[v0] Not found: $notFound events\n";
    
    $conn->close();
    
} catch (Exception $e) {
    echo "[v0] Migration error: " . $e->getMessage() . "\n";
}
?>
