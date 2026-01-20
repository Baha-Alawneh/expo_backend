import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// Create a new job offer
export const createJobOffer = async (company_id, jobData) => {
  const job_id = uuidv4();
  const {
    title,
    description,
    job_type,
    location,
    salary_range,
    requirements,
    responsibilities,
    deadline
  } = jobData;

  await pool.execute(
    `INSERT INTO JobOffers 
    (job_id, company_id, title, description, job_type, location, salary_range, requirements, responsibilities, deadline, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [job_id, company_id, title, description, job_type, location, salary_range, requirements, responsibilities, deadline]
  );

  return job_id;
};

// Get all active job offers (for students to browse)
export const getAllActiveJobOffers = async () => {
  const [rows] = await pool.execute(
    `SELECT 
      j.*,
      c.company_name,
      c.profile_image,
      c.type as company_type,
      (SELECT COUNT(*) FROM JobApplications WHERE job_id = j.job_id) as applications_count
    FROM JobOffers j
    JOIN Companies c ON j.company_id = c.company_id
    WHERE j.is_active = TRUE
    ORDER BY j.created_at DESC`
  );
  return rows;
};

// Get job offers by company
export const getJobOffersByCompany = async (company_id) => {
  const [rows] = await pool.execute(
    `SELECT 
      j.*,
      (SELECT COUNT(*) FROM JobApplications WHERE job_id = j.job_id) as applications_count
    FROM JobOffers j
    WHERE j.company_id = ?
    ORDER BY j.created_at DESC`,
    [company_id]
  );
  return rows;
};

// Get single job offer by ID
export const getJobOfferById = async (job_id) => {
  const [rows] = await pool.execute(
    `SELECT 
      j.*,
      c.company_name,
      c.profile_image,
      c.type as company_type,
      c.website_url,
      c.description as company_description,
      (SELECT COUNT(*) FROM JobApplications WHERE job_id = j.job_id) as applications_count
    FROM JobOffers j
    JOIN Companies c ON j.company_id = c.company_id
    WHERE j.job_id = ?`,
    [job_id]
  );
  return rows[0] || null;
};

// Update job offer
export const updateJobOffer = async (job_id, jobData) => {
  const {
    title,
    description,
    job_type,
    location,
    salary_range,
    requirements,
    responsibilities,
    deadline,
    is_active
  } = jobData;

  await pool.execute(
    `UPDATE JobOffers 
    SET title = ?, description = ?, job_type = ?, location = ?, salary_range = ?, 
        requirements = ?, responsibilities = ?, deadline = ?, is_active = ?, updated_at = NOW()
    WHERE job_id = ?`,
    [title, description, job_type, location, salary_range, requirements, responsibilities, deadline, is_active, job_id]
  );
};

// Delete job offer
export const deleteJobOffer = async (job_id) => {
  await pool.execute(`DELETE FROM JobOffers WHERE job_id = ?`, [job_id]);
};

// Toggle job active status
export const toggleJobStatus = async (job_id, is_active) => {
  await pool.execute(
    `UPDATE JobOffers SET is_active = ?, updated_at = NOW() WHERE job_id = ?`,
    [is_active, job_id]
  );
};

// Check if job belongs to company
export const isJobOwnedByCompany = async (job_id, company_id) => {
  const [rows] = await pool.execute(
    `SELECT job_id FROM JobOffers WHERE job_id = ? AND company_id = ?`,
    [job_id, company_id]
  );
  return rows.length > 0;
};
