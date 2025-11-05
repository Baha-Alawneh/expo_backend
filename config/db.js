import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  connectionLimit: 10, // Maximum number of connections in pool
  queueLimit: 0, // Unlimited queued requests
  waitForConnections: true, // Wait for available connection
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test database connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected successfully");
    connection.release();
  }
});

export default pool.promise();
