const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL server...');
    await connection.query('CREATE DATABASE IF NOT EXISTS sanvi_olympics;');
    console.log('Database "sanvi_olympics" created successfully!');

    await connection.end();
  } catch (error) {
    // Log the entire error object to see error code and message
    console.error('Error creating database:', error);
  }
}

createDatabase();