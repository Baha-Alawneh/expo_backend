import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Get all booths with optional filtering and assignment information
 * Joins with Projects and Companies tables to get assigned entity details
 */
export const findAll = async (filters = {}) => {
  let query = `
    SELECT 
      b.booth_id,
      b.booth_number,
      b.location_x,
      b.location_y,
      b.width,
      b.height,
      b.zone_type,
      b.shape_type,
      b.rotation,
      b.is_custom,
      b.layout_mode,
      b.booth_metadata,
      b.assigned_to_project,
      b.assigned_to_company,
      CASE 
        WHEN b.assigned_to_project IS NOT NULL OR b.assigned_to_company IS NOT NULL THEN 'occupied'
        ELSE 'available'
      END AS status,
      p.title AS project_title,
      p.description AS project_description,
      p.type AS project_type,
      c.company_name,
      c.type AS company_type,
      c.description AS company_description,
      c.phone AS company_phone,
      c.website_url AS company_website
    FROM Booths b
    LEFT JOIN Projects p ON b.assigned_to_project = p.project_id
    LEFT JOIN Companies c ON b.assigned_to_company = c.company_id
  `;

  const conditions = [];
  const params = [];

  if (filters.layout_mode) {
    conditions.push('b.layout_mode = ?');
    params.push(filters.layout_mode);
  }

  if (filters.zone_type) {
    conditions.push('b.zone_type = ?');
    params.push(filters.zone_type);
  }

  if (filters.is_custom !== undefined) {
    conditions.push('b.is_custom = ?');
    params.push(filters.is_custom);
  }

  if (filters.unassigned) {
    conditions.push('b.assigned_to_project IS NULL AND b.assigned_to_company IS NULL');
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY CAST(b.booth_number AS UNSIGNED), b.booth_number';

  const [rows] = await pool.execute(query, params);

  // Transform to frontend-friendly format
  return rows.map(booth => ({
    booth_id: booth.booth_id,
    booth_number: booth.booth_number,
    location_x: booth.location_x,
    location_y: booth.location_y,
    width: booth.width,
    height: booth.height,
    zone_type: booth.zone_type,
    shape_type: booth.shape_type,
    rotation: booth.rotation || 0,
    is_custom: Boolean(booth.is_custom),
    layout_mode: booth.layout_mode,
    metadata: booth.booth_metadata ? JSON.parse(booth.booth_metadata) : null,
    assigned_to_project: booth.assigned_to_project,
    assigned_to_company: booth.assigned_to_company,
    project: booth.project_title ? {
      title: booth.project_title,
      description: booth.project_description,
      type: booth.project_type
    } : null,
    company: booth.company_name ? {
      name: booth.company_name,
      type: booth.company_type,
      description: booth.company_description,
      phone: booth.company_phone,
      website: booth.company_website
    } : null,
    // Computed frontend properties
    status: (booth.assigned_to_project || booth.assigned_to_company) ? 'occupied' : 'available',
    assignee: booth.company_name || booth.project_title || null
  }));
};

/**
 * Get single booth by ID
 */
export const findById = async (boothId) => {
  const [rows] = await pool.execute(
    `SELECT 
      b.booth_id,
      b.booth_number,
      b.location_x,
      b.location_y,
      b.width,
      b.height,
      b.zone_type,
      b.shape_type,
      b.rotation,
      b.is_custom,
      b.layout_mode,
      b.booth_metadata,
      b.assigned_to_project,
      b.assigned_to_company,
      p.title AS project_title,
      p.description AS project_description,
      p.type AS project_type,
      p.github_link,
      p.video_url,
      c.company_name,
      c.type AS company_type,
      c.description AS company_description,
      c.phone AS company_phone,
      c.website_url
    FROM Booths b
    LEFT JOIN Projects p ON b.assigned_to_project = p.project_id
    LEFT JOIN Companies c ON b.assigned_to_company = c.company_id
    WHERE b.booth_id = ?`,
    [boothId]
  );

  if (rows.length === 0) return null;

  const booth = rows[0];
  return {
    booth_id: booth.booth_id,
    booth_number: booth.booth_number,
    location_x: booth.location_x,
    location_y: booth.location_y,
    width: booth.width,
    height: booth.height,
    zone_type: booth.zone_type,
    shape_type: booth.shape_type,
    rotation: booth.rotation || 0,
    is_custom: Boolean(booth.is_custom),
    layout_mode: booth.layout_mode,
    metadata: booth.booth_metadata ? JSON.parse(booth.booth_metadata) : null,
    assigned_to_project: booth.assigned_to_project,
    assigned_to_company: booth.assigned_to_company,
    project: booth.project_title ? {
      title: booth.project_title,
      description: booth.project_description,
      type: booth.project_type,
      github_link: booth.github_link,
      video_url: booth.video_url
    } : null,
    company: booth.company_name ? {
      name: booth.company_name,
      type: booth.company_type,
      description: booth.company_description,
      phone: booth.company_phone,
      website_url: booth.website_url
    } : null,
    status: (booth.assigned_to_project || booth.assigned_to_company) ? 'occupied' : 'available',
    assignee: booth.company_name || booth.project_title || null
  };
};

/**
 * Get booth by booth_number (unique identifier)
 */
export const findByBoothNumber = async (boothNumber) => {
  const [rows] = await pool.execute(
    `SELECT booth_id FROM Booths WHERE booth_number = ?`,
    [boothNumber]
  );

  return rows.length > 0 ? rows[0].booth_id : null;
};

/**
 * Create new booth
 */
export const create = async (boothData) => {
  const booth_id = uuidv4();
  const {
    booth_number,
    location_x,
    location_y,
    width = 3.0,
    height = 3.0,
    zone_type = 'standard',
    shape_type = 'rectangle',
    rotation = 0,
    is_custom = false,
    layout_mode = 'default',
    booth_metadata = null
  } = boothData;

  // Check if booth_number already exists
  const existing = await findByBoothNumber(booth_number);
  if (existing) {
    throw new Error(`Booth number ${booth_number} already exists`);
  }

  await pool.execute(
    `INSERT INTO Booths (
      booth_id, booth_number, location_x, location_y, width, height,
      zone_type, shape_type, rotation, is_custom, layout_mode, booth_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      booth_id, 
      booth_number, 
      location_x, 
      location_y, 
      width, 
      height,
      zone_type, 
      shape_type, 
      rotation, 
      is_custom, 
      layout_mode,
      booth_metadata ? JSON.stringify(booth_metadata) : null
    ]
  );

  return findById(booth_id);
};

/**
 * Update booth properties
 */
export const update = async (boothId, updates) => {
  const allowedFields = [
    'booth_number', 'location_x', 'location_y', 'width', 'height',
    'zone_type', 'shape_type', 'rotation', 'booth_metadata'
  ];

  const fields = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(key === 'booth_metadata' && updates[key] !== null 
        ? JSON.stringify(updates[key]) 
        : updates[key]
      );
    }
  });

  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }

  values.push(boothId);

  await pool.execute(
    `UPDATE Booths SET ${fields.join(', ')} WHERE booth_id = ?`,
    values
  );

  return findById(boothId);
};

/**
 * Delete booth
 */
export const deleteBooth = async (boothId) => {
  // Check if booth is assigned
  const booth = await findById(boothId);
  if (!booth) {
    throw new Error('Booth not found');
  }

  if (booth.assigned_to_project || booth.assigned_to_company) {
    throw new Error('Cannot delete assigned booth. Unassign first.');
  }

  await pool.execute('DELETE FROM Booths WHERE booth_id = ?', [boothId]);
  return { success: true, message: 'Booth deleted successfully' };
};

/**
 * Assign booth to project
 */
export const assignToProject = async (boothId, projectId) => {
  // Verify project exists
  const [projects] = await pool.execute(
    'SELECT project_id FROM Projects WHERE project_id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    throw new Error('Project not found');
  }

  // Clear company assignment and set project
  await pool.execute(
    `UPDATE Booths 
     SET assigned_to_project = ?, assigned_to_company = NULL 
     WHERE booth_id = ?`,
    [projectId, boothId]
  );

  return findById(boothId);
};

/**
 * Assign booth to company
 */
export const assignToCompany = async (boothId, companyId) => {
  // Verify company exists
  const [companies] = await pool.execute(
    'SELECT company_id FROM Companies WHERE company_id = ?',
    [companyId]
  );

  if (companies.length === 0) {
    throw new Error('Company not found');
  }

  // Clear project assignment and set company
  await pool.execute(
    `UPDATE Booths 
     SET assigned_to_company = ?, assigned_to_project = NULL 
     WHERE booth_id = ?`,
    [companyId, boothId]
  );

  return findById(boothId);
};

/**
 * Unassign booth (clear both project and company)
 */
export const unassign = async (boothId) => {
  await pool.execute(
    `UPDATE Booths 
     SET assigned_to_project = NULL, assigned_to_company = NULL 
     WHERE booth_id = ?`,
    [boothId]
  );

  return findById(boothId);
};

/**
 * Unassign all booths (clear all assignments)
 */
export const unassignAll = async () => {
  const [result] = await pool.execute(
    `UPDATE Booths 
     SET assigned_to_project = NULL, assigned_to_company = NULL`
  );

  return {
    success: true,
    message: `${result.affectedRows} booth(s) unassigned successfully`,
    count: result.affectedRows
  };
};

/**
 * Get next available custom booth number
 * Returns the next "C-X" number
 */
export const getNextCustomBoothNumber = async () => {
  const [rows] = await pool.execute(
    `SELECT booth_number FROM Booths 
     WHERE booth_number LIKE 'C-%' 
     ORDER BY CAST(SUBSTRING(booth_number, 3) AS UNSIGNED) DESC 
     LIMIT 1`
  );

  if (rows.length === 0) {
    return 'C-1';
  }

  const lastNumber = rows[0].booth_number;
  const numberPart = parseInt(lastNumber.split('-')[1]);
  return `C-${numberPart + 1}`;
};

/**
 * Batch update booth positions
 * @param {Array} updates - Array of {booth_id, location_x, location_y}
 * @returns {Promise<number>} Number of booths updated
 */
export const batchUpdatePositions = async (updates) => {
  if (!updates || updates.length === 0) return 0;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const update of updates) {
      await connection.execute(
        'UPDATE Booths SET location_x = ?, location_y = ? WHERE booth_id = ?',
        [update.location_x, update.location_y, update.booth_id]
      );
    }
    
    await connection.commit();
    return updates.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
