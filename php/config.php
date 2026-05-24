<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'nu_flow');

// Create connection
function getDBConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            error_log("Database connection failed: " . $conn->connect_error);
            throw new Exception("Database connection failed: " . $conn->connect_error);
        }
        
        return $conn;
    } catch (Exception $e) {
        error_log("Database error: " . $e->getMessage());
        throw $e;
    }
}

// Create database and tables if they don't exist
function initializeDatabase() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
        
        if ($conn->connect_error) {
            error_log("Database initialization connection failed: " . $conn->connect_error);
            return;
        }
        
        // Create database
        $sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME;
        $conn->query($sql);
        
        $conn->select_db(DB_NAME);
        
        // Create users table
        $sql = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('SDAO Office', 'Facilities Office', 'Student Organizations') NOT NULL,
            organization_name VARCHAR(100),
            verification_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
            assigned_facility_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        $conn->query($sql);
        
        $sql = "CREATE TABLE IF NOT EXISTS facilities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            capacity INT,
            description TEXT,
            image VARCHAR(255),
            status ENUM('Available', 'Booked', 'Maintenance') DEFAULT 'Available'
        )";
        $conn->query($sql);
        
        $sql = "CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            event_date DATE NOT NULL,
            event_time TIME NOT NULL,
            end_time TIME,
            venue VARCHAR(100),
            facility_id INT,
            created_by INT,
            approval_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
            approved_by INT,
            approved_at TIMESTAMP NULL,
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL,
            FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
        )";
        $conn->query($sql);
        
        // Create facility_bookings table
        $sql = "CREATE TABLE IF NOT EXISTS facility_bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            facility_id INT,
            user_id INT,
            booking_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            purpose TEXT,
            status ENUM('Pending', 'Approved', 'Denied') DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )";
        $conn->query($sql);
        
        // Create announcements table
        $sql = "CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL,
            priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
            created_by INT,
            approval_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
            approved_by INT,
            approved_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
        )";
        $conn->query($sql);
        
        $sql = "CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            related_id INT,
            related_type VARCHAR(50),
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )";
        $conn->query($sql);
        
        $sql = "CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INT,
            old_value TEXT,
            new_value TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )";
        $conn->query($sql);
        
        // Insert sample facilities
        $facilities = [
            ['Library', 150, 'Study and research facility', 'images/Library.jpg'],
            ['Gym', 100, 'Fitness and workout facility', 'images/Gym.jpg'],
            ['Swimming Pool', 80, 'Olympic-size swimming pool', 'images/Pool.jpg'],
            ['Basketball Court', 200, 'Indoor basketball court', 'images/hoops_center.jpg'],
            ['Tennis Court', 50, 'Outdoor tennis court', 'images/Tennis_Court.jpg'],
            ['Dormitory', 300, 'Student housing facility', 'images/Dormitel.jpg'],
            ['Multi-Purpose Center', 500, 'Multi-purpose center for various activities', 'images/Multipurpose_center.jpg'],
            ['Auditorium', 600, 'Main auditorium for large events', 'images/auditorium.jpg'],
            ['Chapel', 200, 'Campus chapel for religious services', 'images/chapel.jpg'],
            ['Clinic', 50, 'Campus health clinic', 'images/clinic.jpg'],
            ['Football Pitch', 400, 'Outdoor football field', 'images/football_pitch.jpg']
        ];
        
        foreach ($facilities as $facility) {
            $check = "SELECT id FROM facilities WHERE name = ?";
            $stmt = $conn->prepare($check);
            $stmt->bind_param("s", $facility[0]);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows == 0) {
                $insert = "INSERT INTO facilities (name, capacity, description, image) VALUES (?, ?, ?, ?)";
                $stmt = $conn->prepare($insert);
                $stmt->bind_param("siss", $facility[0], $facility[1], $facility[2], $facility[3]);
                $stmt->execute();
            }
        }
        
        $conn->close();
    } catch (Exception $e) {
        error_log("Database initialization error: " . $e->getMessage());
    }
}

// Initialize database on first run
initializeDatabase();

function seedDefaultAccounts() {
    try {
        $conn = getDBConnection();
        
        // Check if SDAO account exists
        $checkSdao = "SELECT id FROM users WHERE username = 'SDAOadmin'";
        $result = $conn->query($checkSdao);
        
        if ($result->num_rows == 0) {
            $sdaoPassword = password_hash('SDAOnuflow', PASSWORD_DEFAULT);
            $sdaoRole = 'SDAO Office';
            $sdaoEmail = 'sdao@nuflow.edu';
            
            $insertSdao = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
            $stmt = $conn->prepare($insertSdao);
            $sdaoUsername = 'SDAOadmin';
            $stmt->bind_param("ssss", $sdaoUsername, $sdaoEmail, $sdaoPassword, $sdaoRole);
            $stmt->execute();
            error_log("[v0] SDAO default account created");
        }
        
        // Check if Facilitator account exists
        $checkFacilitator = "SELECT id FROM users WHERE username = 'Facilitatoradmin'";
        $result = $conn->query($checkFacilitator);
        
        if ($result->num_rows == 0) {
            $facilPassword = password_hash('Facilitatornuflow', PASSWORD_DEFAULT);
            $facilRole = 'Facilities Office';
            $facilEmail = 'facilities@nuflow.edu';
            
            $insertFacil = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
            $stmt = $conn->prepare($insertFacil);
            $facilUsername = 'Facilitatoradmin';
            $stmt->bind_param("ssss", $facilUsername, $facilEmail, $facilPassword, $facilRole);
            $stmt->execute();
            error_log("[v0] Facilitator default account created");
        }
        
        $conn->close();
    } catch (Exception $e) {
        error_log("[v0] Error seeding default accounts: " . $e->getMessage());
    }
}

// Call seed function after database initialization
seedDefaultAccounts();
?>