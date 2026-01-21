import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

const User = {
  findUserByEmail: async (email) => {
    const query = "SELECT * FROM Users WHERE email = ?";
    const [rows] = await pool.query(query, [email]);
    return rows[0];
  },
  createUser: async (data) => {
    const userId = uuidv4();
    const { name, email, password, role, created_at } = data;
    const query = `INSERT INTO Users (user_id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
    await pool.query(query, [userId, name, email, password, role, created_at]);
    return userId;
  },
  updatePassword: async (userId, hashedPassword) => {
    const query = "UPDATE Users SET password_hash = ? WHERE user_id = ?";
    await pool.query(query, [hashedPassword, userId]);
  },
};

export default User;
