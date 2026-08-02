const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupSchema() {
  // 1. Initial connection without selecting a database
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true // Allows running multi-line SQL blocks
    });

    console.log('Connected to MySQL server...');

    // 2. Create and select database
    await connection.query('CREATE DATABASE IF NOT EXISTS sanvi_olympics;');
    await connection.query('USE sanvi_olympics;');
    console.log('Database "sanvi_olympics" ready.');

    // 3. Create Players table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age DECIMAL(4,1) NOT NULL,
        phase ENUM('Phase 1', 'Phase 2', 'Combine') NOT NULL DEFAULT 'Combine',
        gender ENUM('Male', 'Female', 'Mix') NOT NULL DEFAULT 'Mix',
        flat_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "players" created.');

    // 4. Create Sports table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        format_type ENUM('ROUND_ROBIN', 'KNOCKOUT', 'HEAT_RACE') NOT NULL,
        has_auction BOOLEAN DEFAULT FALSE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "sports" created.');

    // 5. Seed default sports
    await connection.query(`
      INSERT INTO sports (name, code, format_type, has_auction) VALUES
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
      ('General / Other', 'NAN', 'ROUND_ROBIN', FALSE)
      ON DUPLICATE KEY UPDATE name=VALUES(name);
    `);
    console.log('Default sports seeded.');

    // 6. Create Teams/Groups table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS teams_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sport_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        phase ENUM('Phase 1', 'Phase 2', 'Combine') NOT NULL,
        age_category ENUM('Under 12', '12-17 years', '17+ years', 'Senior Citizens') NOT NULL,
        gender_category ENUM('Male', 'Female', 'Mix') NOT NULL,
        FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "teams_groups" created.');

    // 7. Create Group Members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        player_id INT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES teams_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        UNIQUE KEY unique_member (group_id, player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "group_members" created.');

    // 8. Create Matches table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sport_id INT NOT NULL,
        group_id INT NULL,
        round_label VARCHAR(50) NOT NULL,
        player_a_id INT NULL,
        player_b_id INT NULL,
        score_a INT DEFAULT 0,
        score_b INT DEFAULT 0,
        winner_name VARCHAR(100) DEFAULT NULL,
        status ENUM('Scheduled', 'In_Progress', 'Completed') DEFAULT 'Scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "matches" created.');

    console.log('\nAll tables and seed data setup successfully for "sanvi_olympics"!');
  } catch (error) {
    console.error('\nError executing schema setup:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupSchema();