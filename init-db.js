const mysql = require('mysql2/promise');

// 1. Configure your MySQL connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sanvi@@@123Olympics',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true // Required to execute multiple SQL statements at once
};

// 2. Database Schema & Seed SQL Script
const sqlScript = `
CREATE DATABASE IF NOT EXISTS sanvi_olympics;
USE sanvi_olympics;

-- 1. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sport VARCHAR(100),
    phase VARCHAR(50) DEFAULT 'Phase 1',
    category VARCHAR(50) DEFAULT 'General',
    age VARCHAR(20),
    age_group VARCHAR(50),
    flat VARCHAR(50),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. SPORTS TABLE
CREATE TABLE IF NOT EXISTS sports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    format_type ENUM('ROUND_ROBIN', 'KNOCKOUT', 'HEAT_RACE') NOT NULL,
    has_auction BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default sports (skips if unique constraint hits)
INSERT IGNORE INTO sports (name, code, format_type, has_auction) VALUES
('Chess', 'CHESS', 'ROUND_ROBIN', FALSE),
('Carrom', 'CARROM', 'ROUND_ROBIN', FALSE),
('Cricket', 'CRICKET', 'KNOCKOUT', TRUE),
('Football', 'FOOTBALL', 'KNOCKOUT', TRUE),
('Running', 'RUNNING', 'HEAT_RACE', FALSE),
('Walking', 'WALKING', 'HEAT_RACE', FALSE),
('Swimming', 'SWIMMING', 'HEAT_RACE', FALSE),
('Table Tennis', 'TT', 'KNOCKOUT', FALSE),
('Badminton', 'BADMINTON', 'KNOCKOUT', FALSE),
('Tug Of War', 'TUG_OF_WAR', 'KNOCKOUT', FALSE),
('Quiz', 'QUIZ', 'ROUND_ROBIN', FALSE),
('General / Other', 'NAN', 'ROUND_ROBIN', FALSE);

-- 3. TEAMS / GROUPS TABLE
CREATE TABLE IF NOT EXISTS teams_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sport_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phase ENUM('Phase 1', 'Phase 2', 'Combine') NOT NULL,
    age_category ENUM('Under 12', '12-17 years', '17+ years', 'Senior Citizens') NOT NULL,
    gender_category ENUM('Male', 'Female', 'Mix') NOT NULL,
    round_number INT DEFAULT 1,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    player_id INT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES teams_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY unique_member (group_id, player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sport_id INT NOT NULL,
    group_id INT NULL,
    round_label VARCHAR(50) NOT NULL,
    round_number INT DEFAULT 1,
    team_a_id INT NULL,
    team_b_id INT NULL,
    player_a_id INT NULL,
    player_b_id INT NULL,
    score_a INT DEFAULT 0,
    score_b INT DEFAULT 0,
    winner_id INT NULL,
    status ENUM('Scheduled', 'In_Progress', 'Completed') DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. PLAYER SCORES TABLE
CREATE TABLE IF NOT EXISTS player_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    player_id INT NOT NULL,
    runs INT DEFAULT 0,
    wickets INT DEFAULT 0,
    goals INT DEFAULT 0,
    time_seconds DECIMAL(6,2) DEFAULT NULL,
    rank_position INT DEFAULT NULL,
    points_earned INT DEFAULT 0,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. AUCTIONS TABLE
CREATE TABLE IF NOT EXISTS auctions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sport_id INT NOT NULL,
    player_id INT NOT NULL,
    winning_team_id INT DEFAULT NULL,
    bid_amount INT DEFAULT 0,
    status ENUM('Pending', 'Sold', 'Unsold') DEFAULT 'Pending',
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// 3. Execution function
async function initDatabase() {
  let connection;
  try {
    console.log('Connecting to MySQL database server...');
    connection = await mysql.createConnection(dbConfig);

    console.log('Running database setup and table initialization...');
    await connection.query(sqlScript);

    console.log('✅ Database "sanvi_olympics" and tables initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();