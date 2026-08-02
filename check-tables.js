const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sanvi@@@123Olympics',
  database: 'sanvi_olympics'
};

async function inspectDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Get list of all tables
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('📋 Tables in "sanvi_olympics":\n');
    
    for (const tableObj of tables) {
      const tableName = Object.values(tableObj)[0];
      console.log(`--- Table: ${tableName} ---`);

      // Describe table structure
      const [columns] = await connection.query(`DESCRIBE \`${tableName}\`;`);
      console.table(columns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      })));
    }
  } catch (error) {
    console.error('Error fetching tables:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

inspectDatabase();