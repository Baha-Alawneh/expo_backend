import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const createStudent = async (user_id) => {
  const student_id = uuidv4();
  await pool.execute(
    `INSERT INTO Students (student_id, user_id) VALUES (?, ?)`,
    [student_id, user_id]
  );
  return { student_id, user_id };
};

export const getStudentById = async (user_id) => {
  // Validate user_id
  if (!user_id) {
    throw new Error("user_id is required");
  }

  const [rows] = await pool.execute(
    `SELECT 
        s.student_id,
        s.user_id,
        s.university_id,
        s.major,
        s.year_of_study AS year,
        s.skills,
        s.bio,
        s.photo_name,
        s.cv_name,
        u.name,
        u.email,
        p.title AS project_title,
        p.booth AS project_booth
     FROM Students AS s
     JOIN Users AS u ON s.user_id = u.user_id
     LEFT JOIN Projects AS p ON s.student_id = p.student_id
     WHERE s.user_id = ?`,
    [user_id]
  );

  if (rows.length === 0) return null;

  const student = rows[0];

  // Ensure skills is always an array (parse JSON string if necessary)
  let skills = [];
  if (student.skills) {
    if (Array.isArray(student.skills)) {
      skills = student.skills;
    } else if (typeof student.skills === "string") {
      try {
        const parsed = JSON.parse(student.skills);
        skills = Array.isArray(parsed) ? parsed : [];
      } catch {
        skills = [];
      }
    }
  }

  return {
    student_id: student.student_id,
    user_id: student.user_id,
    university_id: student.university_id || "",
    name: student.name || "",
    email: student.email || "",
    major: student.major || "",
    year: student.year || "",
    skills, // array of skills from JSON
    bio: student.bio || "",
    photo_name: student.photo_name || null,
    cv_name: student.cv_name || null,
    project: {
      title: student.project_title || "",
      booth: student.project_booth || "",
    },
  };
};

export const updateStudentById = async (user_id, data) => {
  const { name, email, major, year, skills, bio, project } = data;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update Users table
    await connection.execute(
      `UPDATE Users SET name = ?, email = ? WHERE user_id = ?`,
      [name, email, user_id]
    );

    // Update Students table - fixed duplicate year_of_study
    await connection.execute(
      `UPDATE Students SET major = ?, year_of_study = ?, skills = ?, bio = ? WHERE user_id = ?`,
      [major, year, JSON.stringify(skills || []), bio, user_id]
    );

    // Get student_id for project update
    const [rows] = await connection.execute(
      `SELECT student_id FROM Students WHERE user_id = ?`,
      [user_id]
    );
    const student_id = rows[0]?.student_id;

    // Update project if provided and student_id exists
    if (project && student_id) {
      await connection.execute(
        `UPDATE Projects SET title = ?, booth = ? WHERE student_id = ?`,
        [project.title, project.booth, student_id]
      );
    }

    await connection.commit();
    return await getStudentById(user_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateStudentFiles = async (user_id, photo_name, cv_name) => {
  const updates = [];
  const values = [];

  if (photo_name !== undefined) {
    updates.push("photo_name = ?");
    values.push(photo_name);
  }

  if (cv_name !== undefined) {
    updates.push("cv_name = ?");
    values.push(cv_name);
  }

  if (updates.length === 0) {
    throw new Error("No files to update");
  }

  values.push(user_id);

  await pool.execute(
    `UPDATE Students SET ${updates.join(", ")} WHERE user_id = ?`,
    values
  );

  return await getStudentById(user_id);
};

// Get all students (for admin panel)
export const getAllStudents = async () => {
  const [rows] = await pool.execute(
    `SELECT 
        s.student_id,
        s.user_id,
        s.university_id,
        s.major,
        s.year_of_study AS year,
        s.skills,
        s.bio,
        s.photo_name,
        s.cv_name,
        u.name,
        u.email
     FROM Students AS s
     JOIN Users AS u ON s.user_id = u.user_id
     ORDER BY u.name ASC`
  );

  return rows.map((student) => {
    let skills = [];
    if (student.skills) {
      if (Array.isArray(student.skills)) {
        skills = student.skills;
      } else if (typeof student.skills === "string") {
        try {
          const parsed = JSON.parse(student.skills);
          skills = Array.isArray(parsed) ? parsed : [];
        } catch {
          skills = [];
        }
      }
    }

    return {
      student_id: student.student_id,
      user_id: student.user_id,
      university_id: student.university_id || "",
      name: student.name || "",
      email: student.email || "",
      major: student.major || "",
      year: student.year || "",
      skills,
      bio: student.bio || "",
      photo_name: student.photo_name || null,
      cv_name: student.cv_name || null,
    };
  });
};
