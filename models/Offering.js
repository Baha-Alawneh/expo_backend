import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

// Get offering by company_id
export const getOfferingByCompanyId = async (company_id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM Offering WHERE company_id = ?`,
    [company_id]
  );

  if (rows.length === 0) return null;

  const offering = rows[0];

  // Parse offering_photos JSON
  let images = [];
  if (offering.offering_photos) {
    try {
      images = JSON.parse(offering.offering_photos);
      if (!Array.isArray(images)) images = [];
    } catch (e) {
      images = [];
    }
  }

  return {
    ...offering,
    images,
  };
};

// Create new offering for company
export const createOffering = async (company_id, data) => {
  const { name, description, price, offering_photos } = data;

  const offering_id = uuidv4();

  await pool.execute(
    `INSERT INTO Offering 
     (offering_id, company_id, name, description, price, offering_photos)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      offering_id,
      company_id,
      name || null,
      description || null,
      price || null,
      offering_photos ? JSON.stringify(offering_photos) : null,
    ]
  );

  return {
    offering_id,
    company_id,
  };
};

// Update existing offering for company
export const updateOffering = async (company_id, data) => {
  const { name, description, price, offering_photos } = data;

  await pool.execute(
    `UPDATE Offering 
     SET 
       name = COALESCE(?, name), 
       description = COALESCE(?, description), 
       price = COALESCE(?, price), 
       offering_photos = COALESCE(?, offering_photos)
     WHERE company_id = ?`,
    [
      name || null,
      description || null,
      price || null,
      offering_photos ? JSON.stringify(offering_photos) : null,
      company_id,
    ]
  );

  return await getOfferingByCompanyId(company_id);
};
