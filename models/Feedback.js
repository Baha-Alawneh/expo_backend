import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Get feedback by feedback_id
 */
export const getFeedbackById = async (feedback_id) => {
  const [rows] = await pool.execute(
    `SELECT f.*, u.name as user_name, u.email as user_email
     FROM Feedback f
     JOIN Users u ON f.user_id = u.user_id
     WHERE f.feedback_id = ?`,
    [feedback_id]
  );
  return rows[0] || null;
};

/**
 * Get all feedback for a specific project
 */
export const getFeedbackByProjectId = async (project_id) => {
  const [rows] = await pool.execute(
    `SELECT f.*, u.name as user_name, u.email as user_email
     FROM Feedback f
     JOIN Users u ON f.user_id = u.user_id
     WHERE f.entity_id = ? AND f.entity_type = 'project'
     ORDER BY f.created_at DESC`,
    [project_id]
  );
  return rows;
};

/**
 * Get all feedback for a specific offering
 */
export const getFeedbackByOfferingId = async (offering_id) => {
  const [rows] = await pool.execute(
    `SELECT f.*, u.name as user_name, u.email as user_email
     FROM Feedback f
     JOIN Users u ON f.user_id = u.user_id
     WHERE f.entity_id = ? AND f.entity_type = 'offer'
     ORDER BY f.created_at DESC`,
    [offering_id]
  );
  return rows;
};

/**
 * Get user's feedback for a specific project
 */
export const getUserFeedbackForProject = async (user_id, project_id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM Feedback 
     WHERE user_id = ? AND entity_id = ? AND entity_type = 'project'`,
    [user_id, project_id]
  );
  return rows[0] || null;
};

/**
 * Get user's feedback for a specific offering
 */
export const getUserFeedbackForOffering = async (user_id, offering_id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM Feedback 
     WHERE user_id = ? AND entity_id = ? AND entity_type = 'offer'`,
    [user_id, offering_id]
  );
  return rows[0] || null;
};

/**
 * Validate that an entity exists in the appropriate table
 */
const validateEntityExists = async (entity_id, entity_type) => {
  if (entity_type === "project") {
    const [rows] = await pool.execute(
      `SELECT project_id FROM Projects WHERE project_id = ?`,
      [entity_id]
    );
    return rows.length > 0;
  } else if (entity_type === "offer") {
    const [rows] = await pool.execute(
      `SELECT offering_id FROM Offering WHERE offering_id = ?`,
      [entity_id]
    );
    return rows.length > 0;
  }
  return false;
};

/**
 * Create new feedback for a project or offering
 */
export const createFeedback = async (data) => {
  const { user_id, entity_id, entity_type, rating, comment } = data;

  // Validate that entity_id and entity_type are provided
  if (!entity_id) {
    throw new Error("entity_id is required");
  }

  if (!entity_type || !["project", "offer"].includes(entity_type)) {
    throw new Error("entity_type must be either 'project' or 'offer'");
  }

  // Validate that the entity exists in the appropriate table
  const entityExists = await validateEntityExists(entity_id, entity_type);
  if (!entityExists) {
    const tableName = entity_type === "project" ? "Projects" : "Offering";
    throw new Error(
      `${entity_type} with ID ${entity_id} not found in ${tableName} table`
    );
  }

  // Validate rating value
  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  const feedback_id = uuidv4();
  const now = new Date();

  // Normalize empty/whitespace comments to null
  const normalizedComment = comment && comment.trim() !== "" ? comment.trim() : null;

  await pool.execute(
    `INSERT INTO Feedback 
     (feedback_id, user_id, entity_id, entity_type, rating, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      feedback_id,
      user_id,
      entity_id,
      entity_type,
      rating,
      normalizedComment,
      now,
      now,
    ]
  );

  return getFeedbackById(feedback_id);
};

/**
 * Update existing feedback
 */
export const updateFeedback = async (feedback_id, data) => {
  const { rating, comment } = data;

  // Validate rating value if provided
  if (rating && (rating < 1 || rating > 5)) {
    throw new Error("Rating must be between 1 and 5");
  }

  const now = new Date();

  // Build update query dynamically based on provided fields
  const updates = [];
  const values = [];

  if (rating !== undefined) {
    updates.push("rating = ?");
    values.push(rating);
  }

  if (comment !== undefined) {
    // Normalize empty/whitespace comments to null
    const normalizedComment = comment && comment.trim() !== "" ? comment.trim() : null;
    updates.push("comment = ?");
    values.push(normalizedComment);
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(feedback_id);

  await pool.execute(
    `UPDATE Feedback SET ${updates.join(", ")} WHERE feedback_id = ?`,
    values
  );

  return getFeedbackById(feedback_id);
};

/**
 * Delete feedback
 */
export const deleteFeedback = async (feedback_id) => {
  await pool.execute(`DELETE FROM Feedback WHERE feedback_id = ?`, [
    feedback_id,
  ]);
};

/**
 * Get average rating for a project
 */
export const getProjectAverageRating = async (project_id) => {
  const [rows] = await pool.execute(
    `SELECT 
       AVG(rating) as average_rating,
       COUNT(*) as total_ratings
     FROM Feedback 
     WHERE entity_id = ? AND entity_type = 'project'`,
    [project_id]
  );

  const avgRating = rows[0].average_rating;
  return {
    average_rating: avgRating ? parseFloat(Number(avgRating).toFixed(2)) : 0,
    total_ratings: rows[0].total_ratings || 0,
  };
};

/**
 * Get average rating for an offering
 */
export const getOfferingAverageRating = async (offering_id) => {
  const [rows] = await pool.execute(
    `SELECT 
       AVG(rating) as average_rating,
       COUNT(*) as total_ratings
     FROM Feedback 
     WHERE entity_id = ? AND entity_type = 'offer'`,
    [offering_id]
  );

  const avgRating = rows[0].average_rating;
  return {
    average_rating: avgRating ? parseFloat(Number(avgRating).toFixed(2)) : 0,
    total_ratings: rows[0].total_ratings || 0,
  };
};

/**
 * Check if user has already rated a project
 */
export const hasUserRatedProject = async (user_id, project_id) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM Feedback 
     WHERE user_id = ? AND entity_id = ? AND entity_type = 'project'`,
    [user_id, project_id]
  );
  return rows[0].count > 0;
};

/**
 * Check if user has already rated an offering
 */
export const hasUserRatedOffering = async (user_id, offering_id) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM Feedback 
     WHERE user_id = ? AND entity_id = ? AND entity_type = 'offer'`,
    [user_id, offering_id]
  );
  return rows[0].count > 0;
};
