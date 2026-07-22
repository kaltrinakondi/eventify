<?php
/**
 * Eventify Setup Script
 * Run once: php setup.php
 * Creates database, tables, and seed data with correct password hashes.
 */

$host = 'localhost';
$user = 'root';
$pass = '';
$dbName = 'eventify';

try {
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbName`");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('user', 'admin') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            time TIME NOT NULL,
            location VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) DEFAULT 0.00,
            image VARCHAR(255) DEFAULT 'images/default-event.jpg',
            organizer_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS rsvps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_id INT NOT NULL,
            status ENUM('going', 'maybe', 'cancelled') DEFAULT 'going',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_rsvp (user_id, event_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            event_id INT NOT NULL,
            rating TINYINT NOT NULL,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        )
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");

    $pdo->exec('DELETE FROM reviews');
    $pdo->exec('DELETE FROM rsvps');
    $pdo->exec('DELETE FROM events');
    $pdo->exec('DELETE FROM users');

    $hash = password_hash('admin123', PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    $stmt->execute(['Admin User', 'admin@eventify.com', $hash, 'admin']);
    $stmt->execute(['John Doe', 'john@example.com', $hash, 'user']);
    $stmt->execute(['Jane Smith', 'jane@example.com', $hash, 'user']);

    $events = [
        ['Tech Innovation Summit 2026', 'Join industry leaders for a day of cutting-edge technology talks, workshops, and networking opportunities.', 'Technology', '2026-08-15', '09:00:00', 'Convention Center, New York', 49.99, 'images/event-tech.jpg', 2],
        ['Summer Music Festival', 'Experience live performances from top artists across multiple genres in an outdoor setting.', 'Music', '2026-07-25', '14:00:00', 'Central Park, New York', 79.99, 'images/event-music.jpg', 2],
        ['Startup Networking Night', 'Connect with entrepreneurs, investors, and innovators in a relaxed evening setting.', 'Business', '2026-07-20', '18:30:00', 'WeWork Downtown, San Francisco', 0.00, 'images/event-business.jpg', 3],
        ['Modern Art Exhibition', 'Explore contemporary artworks from emerging and established artists worldwide.', 'Art', '2026-08-01', '10:00:00', 'Modern Art Museum, Chicago', 25.00, 'images/event-art.jpg', 3],
        ['Fitness Bootcamp Challenge', 'High-intensity outdoor workout session suitable for all fitness levels.', 'Sports', '2026-07-18', '07:00:00', 'Riverside Park, Austin', 15.00, 'images/event-sports.jpg', 2],
        ['Food & Wine Tasting', 'Sample gourmet dishes and fine wines from local chefs and vineyards.', 'Food', '2026-08-10', '17:00:00', 'Harbor Restaurant, Seattle', 55.00, 'images/event-food.jpg', 3],
    ];

    $stmt = $pdo->prepare('INSERT INTO events (title, description, category, date, time, location, price, image, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($events as $e) {
        $stmt->execute($e);
    }

    $pdo->exec('INSERT INTO rsvps (user_id, event_id, status) VALUES (2, 1, "going"), (2, 3, "going"), (3, 2, "going"), (3, 4, "going")');
    $pdo->exec('INSERT INTO reviews (user_id, event_id, rating, comment) VALUES (2, 1, 5, "Amazing speakers and great networking opportunities!"), (3, 2, 4, "Fantastic music lineup. Would love more food options."), (3, 4, 5, "Beautiful exhibition with thought-provoking pieces.")');

    echo "Eventify setup complete!\n";
    echo "Login: admin@eventify.com / admin123\n";
    echo "Start server: php -S localhost:8000\n";

} catch (PDOException $e) {
    echo "Setup failed: " . $e->getMessage() . "\n";
    exit(1);
}
