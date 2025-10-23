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

  // Parse images if it's a JSON string, otherwise return empty array
  let images = [];
  if (project.images) {
    try {
      images = JSON.parse(project.images);
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
  const { title, booth, description, demoLink, images } = data;
  const project_id = uuidv4();

  await pool.execute(
    `INSERT INTO Projects (project_id, student_id, title, booth, description)
     VALUES (?, ?, ?, ?, ?)`,
    [project_id, student_id, title || null, booth || null, description || null]
  );

  return await getProjectByStudentId(student_id);
};

//  Update existing project for student
export const updateProject = async (student_id, data) => {
  const { title, booth, description, demoLink, images } = data;

  await pool.execute(
    `UPDATE Projects SET title = ?, booth = ?, description = ? WHERE student_id = ?`,
    [title || null, booth || null, description || null, student_id]
  );

  return await getProjectByStudentId(student_id);
};
