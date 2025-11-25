import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const createCompany = async (user_id) => {
  const company_id = uuidv4();
  await pool.execute(
    `INSERT INTO Companies (company_id, user_id) VALUES (?, ?)`,
    [company_id, user_id]
  );
  return { company_id, user_id };
};

export const getCompanyById = async (user_id) => {
  if (!user_id) throw new Error("user_id is required");

  const [rows] = await pool.execute(
    `SELECT 
        c.company_id,
        c.user_id,
        c.company_name,
        c.category,
        c.description,
        c.phone,
        c.address,
        c.booth_id,
        c.profile_image,
        c.website_url,
        u.name,
        u.email
     FROM Companies AS c
     JOIN Users AS u ON c.user_id = u.user_id
     WHERE c.user_id = ?`,
    [user_id]
  );

  if (rows.length === 0) return null;
  const company = rows[0];

  return {
    company_id: company.company_id,
    user_id: company.user_id,
    name: company.name || "",
    email: company.email || "",
    company_name: company.company_name || "",
    type: company.type || "",
    category: company.category || "",
    description: company.description || "",
    company_email: company.company_email || "",
    phone: company.phone || "",
    address: company.address || "",
    booth_id: company.booth_id || "",
    profile_image: company.profile_image || null,
    website_url: company.website_url || "",
  };
};

export const getCompanyByEmail = async (email) => {
  if (!email) throw new Error("email is required");

  const [rows] = await pool.execute(
    `SELECT 
        c.company_id,
        c.user_id,
        c.company_name,
        c.category,
        c.description,
        c.phone,
        c.address,
        c.booth_id,
        c.profile_image,
        c.website_url,
        u.name,
        u.email
     FROM Companies AS c
     JOIN Users AS u ON c.user_id = u.user_id
     WHERE u.email = ?`,
    [email]
  );

  if (rows.length === 0) return null;
  const company = rows[0];

  return {
    company_id: company.company_id,
    user_id: company.user_id,
    name: company.name || "",
    email: company.email || "",
    company_name: company.company_name || "",
    category: company.category || "",
    description: company.description || "",
    company_email: company.company_email || "",
    phone: company.phone || "",
    address: company.address || "",
    booth_id: company.booth_id || "",
    profile_image: company.profile_image || null,
    website_url: company.website_url || "",
  };
};

export const updateCompanyById = async (user_id, data) => {
  const { company_name, phone, address, description, website_url, category } =
    data;

  console.log("Model updateCompanyById - Received data:", {
    company_name,
    phone,
    address,
    description,
    website_url,
    category,
    user_id,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update Companies table only (no Users table update)
    await connection.execute(
      `UPDATE Companies SET 
        company_name = ?,
        phone = ?,
        address = ?,
        description = ?,
        website_url = ?,
        category = ?
       WHERE user_id = ?`,
      [
        company_name,
        phone,
        address,
        description,
        website_url,
        category,
        user_id,
      ]
    );

    await connection.commit();

    // Return updated company data
    return await getCompanyById(user_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const updateCompanyFiles = async (user_id, profile_image) => {
  if (!profile_image) {
    throw new Error("No file to update");
  }

  await pool.execute(
    `UPDATE Companies SET profile_image = ? WHERE user_id = ?`,
    [profile_image, user_id]
  );

  return await getCompanyById(user_id);
};

export const getAllCompanies = async () => {
  const [rows] = await pool.query(
    `SELECT 
      company_id,
      user_id,
      company_name,
      category,
      description,
      phone,
      booth_id,
      profile_image,
      website_url,
      address
    FROM Companies
    ORDER BY company_name ASC`
  );

  return rows;
};
