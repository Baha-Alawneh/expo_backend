import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

const Reel = {
  // Create a new reel
  createReel: async (data) => {
    const reelId = uuidv4();
    const { user_id, video_url, description } = data;
    const created_at = new Date();
    
    const query = `
      INSERT INTO Reels (reel_id, user_id, video_url, description, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await pool.query(query, [reelId, user_id, video_url, description, created_at]);
    return reelId;
  },

  // Get all reels (for feed)
  getAllReels: async () => {
    const query = `
      SELECT 
        r.reel_id,
        r.user_id,
        r.video_url,
        r.description,
        r.created_at,
        u.name as user_name,
        u.role as user_role,
        s.photo_name as student_photo,
        c.profile_image as company_photo
      FROM Reels r
      JOIN Users u ON r.user_id = u.user_id
      LEFT JOIN Students s ON r.user_id = s.user_id
      LEFT JOIN Companies c ON r.user_id = c.user_id
      ORDER BY r.created_at DESC
    `;
    
    const [rows] = await pool.query(query);
    return rows;
  },

  // Get reels by user ID
  getReelsByUserId: async (user_id) => {
    const query = `
      SELECT 
        r.reel_id,
        r.user_id,
        r.video_url,
        r.description,
        r.created_at,
        u.name as user_name,
        u.role as user_role,
        s.photo_name as student_photo,
        c.profile_image as company_photo
      FROM Reels r
      JOIN Users u ON r.user_id = u.user_id
      LEFT JOIN Students s ON r.user_id = s.user_id
      LEFT JOIN Companies c ON r.user_id = c.user_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    
    const [rows] = await pool.query(query, [user_id]);
    return rows;
  },

  // Get a single reel by ID
  getReelById: async (reel_id) => {
    const query = `
      SELECT 
        r.reel_id,
        r.user_id,
        r.video_url,
        r.description,
        r.created_at,
        u.name as user_name,
        u.role as user_role,
        s.photo_name as student_photo,
        c.profile_image as company_photo
      FROM Reels r
      JOIN Users u ON r.user_id = u.user_id
      LEFT JOIN Students s ON r.user_id = s.user_id
      LEFT JOIN Companies c ON r.user_id = c.user_id
      WHERE r.reel_id = ?
    `;
    
    const [rows] = await pool.query(query, [reel_id]);
    return rows[0];
  },

  // Delete a reel
  deleteReel: async (reel_id, user_id) => {
    const query = "DELETE FROM Reels WHERE reel_id = ? AND user_id = ?";
    const [result] = await pool.query(query, [reel_id, user_id]);
    return result.affectedRows > 0;
  },

  // Update reel description
  updateReelDescription: async (reel_id, user_id, description) => {
    const query = `
      UPDATE Reels 
      SET description = ? 
      WHERE reel_id = ? AND user_id = ?
    `;
    
    const [result] = await pool.query(query, [description, reel_id, user_id]);
    return result.affectedRows > 0;
  },
};

export default Reel;
