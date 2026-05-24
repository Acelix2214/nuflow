<?php
// Migration script to fix events facility_id
require_once 'config.php';

try {
    $conn = getDBConnection();
    
    $facilitiesResult = $conn->query("SELECT id, name FROM facilities");
    $facilities = [];
    while ($row = $facilitiesResult->fetch_assoc()) {
        $facilities[strtolower($row['name'])] = $row['id'];
    }
    
    $eventsResult = $conn->query("SELECT id, venue FROM events WHERE facility_id IS NULL OR facility_id = 0");
    
    $updated = 0;
    while ($event = $eventsResult->fetch_assoc()) {
        $venueLower = strtolower($event['venue']);
        
        // Try to match venue name with facility name
        if (isset($facilities[$venueLower])) {
            $facilityId = $facilities[$venueLower];
            $updateSql = "UPDATE events SET facility_id = ? WHERE id = ?";
            $stmt = $conn->prepare($updateSql);
            $stmt->bind_param("ii", $facilityId, $event['id']);
            if ($stmt->execute()) {
                $updated++;
            }
        }
    }
    
    error_log("[v0] Migration: Updated $updated events with facility_id");
    echo "Migration complete: Updated $updated events with facility_id\n";
    
    $conn->close();
} catch (Exception $e) {
    error_log("[v0] Migration error: " . $e->getMessage());
    echo "Migration error: " . $e->getMessage() . "\n";
}
?>
