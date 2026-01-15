import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

/**
 * Database Connection Pool for Chatbot API
 * Creates a connection pool to the MySQL database for optimal performance
 */
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  connectionLimit: 10, // Maximum number of connections
  queueLimit: 0, // Unlimited queue
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test database connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Database connected successfully");
    connection.release();
  }
});

// Export promise-based pool for async/await support
export default pool.promise();
