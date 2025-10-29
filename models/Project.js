import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// Get project by student_id
export const getProjectByStudentId = async (student_id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM Projects WHERE student_id = ?`,
    [student_id]
  );

  if (rows.length === 0) return null;

  const project = rows[0];

  // Parse images from project_photos if it's a JSON string, otherwise return empty array
  let images = [];
  if (project.project_photos) {
    try {
      images = JSON.parse(project.project_photos);
      if (!Array.isArray(images)) {
        images = [];
      }
    } catch (e) {
      images = [];
    }
  }

  return {
    ...project,
    status: project.status || "pending", // Include status field, default to 'pending'
    images, // Always return images array (empty if not set)
    github_link: project.github_link || null,
    video_url: project.video_url || null,
  };
};

// Create new project for student
export const createProject = async (student_id, data) => {
  // Check if student already has a project
  const existingProject = await getProjectByStudentId(student_id);
  if (existingProject) {
    throw new Error("Student already has a project. Use update instead.");
  }

  const { title, description, video_url, project_photos, github_link } = data;
  const project_id = uuidv4();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO Projects (project_id, student_id, title, description, video_url, github_link, project_photos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        student_id,
        title || null,
        description || null,
        video_url || null,
        github_link || null,
        project_photos ? JSON.stringify(project_photos) : null,
      ]
    );

    await connection.execute(
      `UPDATE Students SET project_id = ? WHERE student_id = ?`,
      [project_id, student_id]
    );

    await connection.commit();
    return await getProjectByStudentId(student_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Update existing project for student
export const updateProject = async (student_id, data) => {
  const { title, description, video_url, project_photos, github_link } = data;

  await pool.execute(
    `UPDATE Projects 
     SET 
       title = COALESCE(?, title), 
       description = COALESCE(?, description), 
       video_url = COALESCE(?, video_url), 
       github_link = COALESCE(?, github_link), 
       project_photos = COALESCE(?, project_photos)
     WHERE student_id = ?`,
    [
      title || null,
      description || null,
      video_url || null,
      github_link || null,
      project_photos ? JSON.stringify(project_photos) : null,
      student_id,
    ]
  );

  return await getProjectByStudentId(student_id);
};
