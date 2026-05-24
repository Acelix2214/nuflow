<?php
session_start();
require_once 'functions.php';

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

header('Content-Type: application/json');

try {
    $facilities = getFacilities();
    echo json_encode(['success' => true, 'facilities' => $facilities]);
} catch (Exception $e) {
    error_log("Fetch facilities error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Failed to fetch facilities', 'facilities' => []]);
}
?>