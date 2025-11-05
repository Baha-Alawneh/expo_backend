import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";
import { getStudentByEmail } from "./Student.js";
// Get project by project_id
export const getProjectByStudentId = async (student_id) => {
  const [projectRows] = await pool.execute(
    `SELECT p.* 
     FROM Projects p
     JOIN ProjectMembers pm ON p.project_id = pm.project_id
     WHERE pm.student_id = ?`,
    [student_id]
  );

  if (projectRows.length === 0) return null;

  const project = projectRows[0];

  // get all students associated with the project
  const [studentRows] = await pool.execute(
    `SELECT s.student_id, u.name, u.email
     FROM ProjectMembers pm
     JOIN Students s ON pm.student_id = s.student_id
     JOIN Users u ON s.user_id = u.user_id
     WHERE pm.project_id = ?`,
    [project.project_id]
  );

  // Parse project_photos JSON
  let images = [];
  if (project.project_photos) {
    try {
      images = JSON.parse(project.project_photos);
      if (!Array.isArray(images)) images = [];
    } catch (e) {
      images = [];
    }
  }

  // return project with images, status, and associated students
  return {
    ...project,
    images,
    status: project.status || "pending",
    students: studentRows,
  };
};

// Create new project for student
export const createProject = async (student_id, data) => {
  const {
    title,
    description,
    video_url,
    project_photos,
    github_link,
    partner_email,
  } = data;

  let partner_id = null;
  let partnerExists = true;

  if (partner_email) {
    const partner = await getStudentByEmail(partner_email);
    if (partner) {
      partner_id = partner.student_id;
    } else {
      partnerExists = false;
    }
  }

  const project_id = uuidv4();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    //create project
    await connection.execute(
      `INSERT INTO Projects 
       (project_id, title, description, video_url, github_link, project_photos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        title || null,
        description || null,
        video_url || null,
        github_link || null,
        project_photos ? JSON.stringify(project_photos) : null,
      ]
    );

    // add student as project member
    await connection.execute(
      `INSERT INTO ProjectMembers (project_id, student_id) VALUES (?, ?)`,
      [project_id, student_id]
    );

    // add partner as project member if exists
    if (partner_id) {
      await connection.execute(
        `INSERT INTO ProjectMembers (project_id, student_id) VALUES (?, ?)`,
        [project_id, partner_id]
      );
    }

    await connection.commit();

    return {
      project_id,
      partnerExists,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

// Update existing project for student
export const updateProject = async (student_id, data) => {
  const { title, description, video_url, project_photos, github_link } = data;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [projectRows] = await connection.execute(
      `SELECT project_id FROM ProjectMembers WHERE student_id = ?`,
      [student_id]
    );

    if (projectRows.length === 0) {
      throw new Error("Project not found for this student");
    }

    const project_id = projectRows[0].project_id;

    await connection.execute(
      `UPDATE Projects 
       SET 
         title = COALESCE(?, title), 
         description = COALESCE(?, description), 
         video_url = COALESCE(?, video_url), 
         github_link = COALESCE(?, github_link), 
         project_photos = COALESCE(?, project_photos)
       WHERE project_id = ?`,
      [
        title || null,
        description || null,
        video_url || null,
        github_link || null,
        project_photos ? JSON.stringify(project_photos) : null,
        project_id,
      ]
    );

    await connection.commit();

    return {
      project: await getProjectByStudentId(student_id),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
// Get all projects
export const getAllProjects = async () => {
  const [rows] = await pool.query("SELECT * FROM Projects");

  // Get students for each project
  const projectsWithStudents = await Promise.all(
    rows.map(async (project) => {
      const [studentRows] = await pool.execute(
        `SELECT s.student_id, u.name, u.email
         FROM ProjectMembers pm
         JOIN Students s ON pm.student_id = s.student_id
         JOIN Users u ON s.user_id = u.user_id
         WHERE pm.project_id = ?`,
        [project.project_id]
      );

      // Keep project_photos as raw JSON string for controller to process
      return {
        ...project,
        students: studentRows,
      };
    })
  );

  return projectsWithStudents;
};

// Get all projects except one student's project
export const getProjectsExceptStudentId = async (student_id) => {
  const [rows] = await pool.query(
    `SELECT p.*
     FROM Projects p
     WHERE p.project_id NOT IN (
       SELECT pm.project_id
       FROM ProjectMembers pm
       WHERE pm.student_id = ?
     )`,
    [student_id]
  );

  // For each project, get the students associated with it
  const projectsWithStudents = await Promise.all(
    rows.map(async (project) => {
      const [studentRows] = await pool.execute(
        `SELECT s.student_id, u.name, u.email
         FROM ProjectMembers pm
         JOIN Students s ON pm.student_id = s.student_id
         JOIN Users u ON s.user_id = u.user_id
         WHERE pm.project_id = ?`,
        [project.project_id]
      );

      // Keep project_photos as raw JSON string for controller to process
      // The controller will parse and generate signed URLs
      return {
        ...project,
        students: studentRows,
      };
    })
  );

  return projectsWithStudents;
};
