import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// Create a job application
export const createJobApplication = async (job_id, student_id, cover_letter = null) => {
  const application_id = uuidv4();

  await pool.execute(
    `INSERT INTO JobApplications (application_id, job_id, student_id, cover_letter)
    VALUES (?, ?, ?, ?)`,
    [application_id, job_id, student_id, cover_letter]
  );

  return application_id;
};

// Get applications for a specific job (for companies to review)
export const getApplicationsByJob = async (job_id) => {
  const [rows] = await pool.execute(
    `SELECT 
      ja.*,
      s.student_id,
      s.university_id,
      s.major,
      s.year_of_study,
      s.skills,
      s.bio,
      s.cv_name,
      s.photo_name,
      u.user_id,
      u.name as student_name,
      u.email
    FROM JobApplications ja
    JOIN Students s ON ja.student_id = s.student_id
    JOIN Users u ON s.user_id = u.user_id
    WHERE ja.job_id = ?
    ORDER BY ja.applied_at DESC`,
    [job_id]
  );
  
  // Format the response to match frontend expectations
  const formattedRows = rows.map(row => ({
    ...row,
    university: row.university_id || 'Not specified',
    graduation_year: row.year_of_study
  }));
  
  return formattedRows;
};

// Get applications by student (student's application history)
export const getApplicationsByStudent = async (student_id) => {
  const [rows] = await pool.execute(
    `SELECT 
      ja.*,
      j.title,
      j.job_type,
      j.location,
      j.salary_range,
      j.is_active,
      c.company_name,
      c.profile_image,
      c.company_id
    FROM JobApplications ja
    JOIN JobOffers j ON ja.job_id = j.job_id
    JOIN Companies c ON j.company_id = c.company_id
    ORDER BY ja.applied_at DESC`,
    [student_id]
  );
  return rows;
};

// Check if student already applied to a job
export const hasStudentApplied = async (job_id, student_id) => {
  const [rows] = await pool.execute(
    `SELECT application_id FROM JobApplications WHERE job_id = ? AND student_id = ?`,
    [job_id, student_id]
  );
  return rows.length > 0;
};

// Get single application by ID
export const getApplicationById = async (application_id) => {
  const [rows] = await pool.execute(
    `SELECT 
      ja.*,
      s.student_id,
      s.university_id,
      s.major,
      s.year_of_study,
      s.skills,
      s.bio,
      s.cv_name,
      s.photo_name,
      u.name,
      u.email,
      j.title as job_title,
      j.company_id
    FROM JobApplications ja
    JOIN Students s ON ja.student_id = s.student_id
    JOIN Users u ON s.user_id = u.user_id
    JOIN JobOffers j ON ja.job_id = j.job_id
    WHERE ja.application_id = ?`,
    [application_id]
  );
  return rows[0] || null;
};

// Delete application
export const deleteJobApplication = async (application_id) => {
  await pool.execute(`DELETE FROM JobApplications WHERE application_id = ?`, [application_id]);
};

// Get all applications for jobs owned by a company
export const getApplicationsByCompany = async (company_id) => {
  const [rows] = await pool.execute(
    `SELECT 
      ja.*,
      j.title as job_title,
      j.job_type,
      s.student_id,
      s.university_id,
      s.major,
      s.year_of_study,
      u.name,
      u.email
    FROM JobApplications ja
    JOIN JobOffers j ON ja.job_id = j.job_id
    JOIN Students s ON ja.student_id = s.student_id
    JOIN Users u ON s.user_id = u.user_id
    WHERE j.company_id = ?
    ORDER BY ja.applied_at DESC`,
    [company_id]
  );
  return rows;
};
