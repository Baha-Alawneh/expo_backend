const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for better performance
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// Execute a query with error handling
async function executeQuery(sql, params = []) {
  try {
    // Count the number of placeholders in the SQL
    const placeholderCount = (sql.match(/\?/g) || []).length;
    
    // Validate that placeholder count matches params length
    if (placeholderCount !== params.length) {
      throw new Error(
        `SQL placeholder mismatch: Found ${placeholderCount} placeholders but received ${params.length} parameters. ` +
        `Query: ${sql.substring(0, 100)}...`
      );
    }
    
    // Use execute() for parameterized queries (with placeholders)
    // Use query() for static queries (no placeholders)
    if (params.length > 0) {
      const [rows] = await pool.execute(sql, params);
      return { success: true, data: rows };
    } else {
      const [rows] = await pool.query(sql);
      return { success: true, data: rows };
    }
  } catch (error) {
    console.error('Query execution error:', error.message);
    console.error('SQL:', sql.substring(0, 200));
    console.error('Params:', params);
    return { success: false, error: error.message };
  }
}

// Get a connection from the pool (for transactions)
async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Failed to get connection:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  getConnection
};
