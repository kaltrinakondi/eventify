-- Eventify Database Setup
-- Run this script in MySQL to create the database and tables

CREATE DATABASE IF NOT EXISTS eventify;
USE eventify;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(200) NOT NULL,
    image VARCHAR(500) DEFAULT '',
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rsvps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rsvp (user_id, event_id)
);

-- Sample user (password: password123)
INSERT INTO users (name, email, password) VALUES
('Demo User', 'demo@eventify.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Sample events
INSERT INTO events (title, description, category, date, time, location, image, user_id) VALUES
('Summer Music Festival', 'Join us for an unforgettable evening of live music featuring top artists from around the world. Food trucks and drinks available.', 'Music', '2026-08-15', '18:00:00', 'Central Park, New York', 'https://images.unsplash.com/photo-1459749411175-04bf52924ce5?w=800', 1),
('Tech Innovation Summit', 'Explore the latest trends in AI, cloud computing, and software development. Network with industry leaders.', 'Technology', '2026-09-20', '09:00:00', 'Convention Center, San Francisco', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', 1),
('Gourmet Food Expo', 'Taste dishes from award-winning chefs and discover new culinary trends. Cooking demos included.', 'Food', '2026-07-25', '11:00:00', 'Downtown Market, Chicago', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', 1),
('Marathon Run 2026', 'Annual city marathon open to all fitness levels. 5K, 10K, and full marathon routes available.', 'Sports', '2026-10-05', '07:00:00', 'City Stadium, Boston', 'https://images.unsplash.com/photo-1452626038306-9d0c56eca2e1?w=800', 1),
('Art Gallery Opening', 'Experience contemporary art from emerging artists. Wine and cheese reception included.', 'Arts', '2026-08-01', '19:00:00', 'Modern Art Museum, Los Angeles', 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800', 1),
('Startup Pitch Night', 'Watch innovative startups pitch their ideas to investors. Great networking opportunity for entrepreneurs.', 'Business', '2026-09-10', '17:30:00', 'Innovation Hub, Austin', 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800', 1);
