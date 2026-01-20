import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export const createCompany = async (user_id, name = null) => {
  const company_id = uuidv4();
  await pool.execute(
    `INSERT INTO Companies (company_id, user_id, company_name, status) VALUES (?, ?, ?, 'pending')`,
    [company_id, user_id, name]
  );
  return { company_id, user_id };
};

export const getCompanyByCompanyId = async (company_id) => {
  if (!company_id) throw new Error("company_id is required");

  const [rows] = await pool.execute(
    `SELECT 
        c.company_id,
        c.user_id,
        c.company_name,
        c.type,
        c.description,
        c.phone,
        c.address,
        c.booth_id,
        c.profile_image,
        c.website_url,
        c.status,
        u.name,
        u.email
     FROM Companies AS c
     JOIN Users AS u ON c.user_id = u.user_id
     WHERE c.company_id = ?`,
    [company_id]
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
    description: company.description || "",
    company_email: company.company_email || "",
    phone: company.phone || "",
    address: company.address || "",
    booth_id: company.booth_id || "",
    profile_image: company.profile_image || null,
    website_url: company.website_url || "",
    status: company.status || "pending",
  };
};

export const getCompanyById = async (user_id) => {
  if (!user_id) throw new Error("user_id is required");

  const [rows] = await pool.execute(
    `SELECT 
        c.company_id,
        c.user_id,
        c.company_name,
        c.type,
        c.description,
        c.phone,
        c.address,
        c.booth_id,
        c.profile_image,
        c.website_url,
        c.status,
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
    description: company.description || "",
    company_email: company.company_email || "",
    phone: company.phone || "",
    address: company.address || "",
    booth_id: company.booth_id || "",
    profile_image: company.profile_image || null,
    website_url: company.website_url || "",
    status: company.status || "pending",
  };
};

export const getCompanyByEmail = async (email) => {
  if (!email) throw new Error("email is required");

  const [rows] = await pool.execute(
    `SELECT 
        c.company_id,
        c.user_id,
        c.company_name,
        c.type,
        c.description,
        c.phone,
        c.address,
        c.booth_id,
        c.profile_image,
        c.website_url,
        c.status,
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
    type: company.type || "",
    description: company.description || "",
    company_email: company.company_email || "",
    phone: company.phone || "",
    address: company.address || "",
    booth_id: company.booth_id || "",
    profile_image: company.profile_image || null,
    website_url: company.website_url || "",
    status: company.status || "pending",
  };
};

export const updateCompanyById = async (user_id, data) => {
  const { company_name, phone, address, description, website_url, type } =
    data;

  console.log("Model updateCompanyById - Received data:", {
    company_name,
    phone,
    address,
    description,
    website_url,
    type,
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
        type = ?
       WHERE user_id = ?`,
      [
        company_name || null,
        phone || null,
        address || null,
        description || null,
        website_url || null,
        type || null,
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
      type,
      description,
      phone,
      booth_id,
      profile_image,
      website_url,
      address,
      status
    FROM Companies
    ORDER BY company_name ASC`
  );

  return rows;
};

// ================================================
// =============== BOOTH ASSIGNMENT ===============
// ================================================

export const getUnassignedCompanies = async () => {
  const [rows] = await pool.query(
    `SELECT 
      company_id,
      user_id,
      company_name,
      type,
      description,
      phone,
      website_url,
      status
    FROM Companies
    WHERE booth_id IS NULL OR booth_id = ''
    ORDER BY company_name ASC`
  );

  return rows;
};

export const assignBoothToCompany = async (company_id, booth_id) => {
  console.log('🏢 Assigning booth to company:', { company_id, booth_id });
  
  // Update Companies table
  const [result1] = await pool.execute(
    `UPDATE Companies SET booth_id = ? WHERE company_id = ?`,
    [booth_id, company_id]
  );
  console.log('✅ Companies table updated:', result1.affectedRows, 'rows');
  
  // Update Booths table to link company to booth
  const [result2] = await pool.execute(
    `UPDATE Booths SET assigned_to_company = ? WHERE booth_id = ?`,
    [company_id, booth_id]
  );
  console.log('✅ Booths table updated:', result2.affectedRows, 'rows');
  
  if (result2.affectedRows === 0) {
    console.error('❌ No booth found with booth_id:', booth_id);
  }
};

export const unassignBoothFromCompany = async (company_id) => {
  // Update Booths table first (remove company assignment)
  await pool.execute(
    `UPDATE Booths SET assigned_to_company = NULL WHERE assigned_to_company = ?`,
    [company_id]
  );
  
  // Update Companies table
  await pool.execute(
    `UPDATE Companies SET booth_id = NULL WHERE company_id = ?`,
    [company_id]
  );
};

// ================================================
// ============== COMPANY APPROVAL ================
// ================================================

export const getPendingCompanies = async () => {
  const [rows] = await pool.query(
    `SELECT 
      c.company_id,
      c.user_id,
      c.company_name,
      c.type,
      c.description,
      c.phone,
      c.address,
      c.profile_image,
      c.website_url,
      c.status,
      u.name,
      u.email,
      u.created_at
    FROM Companies AS c
    JOIN Users AS u ON c.user_id = u.user_id
    WHERE c.status = 'pending'
    ORDER BY u.created_at DESC`
  );

  return rows;
};

export const updateCompanyStatus = async (company_id, status) => {
  const [result] = await pool.execute(
    `UPDATE Companies SET status = ? WHERE company_id = ?`,
    [status, company_id]
  );

  if (result.affectedRows === 0) {
    throw new Error('Company not found');
  }

  return await getCompanyByCompanyId(company_id);
};

export const getApprovedCompanies = async (sortBy = null, sortOrder = "DESC") => {
  // Fetch approved companies
  const [rows] = await pool.query(
    `SELECT 
      company_id,
      user_id,
      company_name,
      type,
      description,
      phone,
      booth_id,
      profile_image,
      website_url,
      address,
      status
    FROM Companies
    WHERE status = 'approved'`
  );

  // For each company, get ratings from all its offerings
  const companiesWithRatings = await Promise.all(
    rows.map(async (company) => {
      // Get all offerings for this company
      const [offeringRows] = await pool.execute(
        `SELECT offering_id FROM Offering WHERE company_id = ?`,
        [company.company_id]
      );

      // Get ratings for all offerings
      let totalRating = 0;
      let totalCount = 0;

      for (const offering of offeringRows) {
        const [ratingRows] = await pool.execute(
          `SELECT 
             AVG(rating) as average_rating,
             COUNT(*) as total_ratings
           FROM Feedback 
           WHERE entity_id = ? AND entity_type = 'offer'`,
          [offering.offering_id]
        );

        if (ratingRows[0].average_rating) {
          totalRating += ratingRows[0].average_rating * ratingRows[0].total_ratings;
          totalCount += ratingRows[0].total_ratings;
        }
      }

      return {
        ...company,
        average_rating: totalCount > 0 ? parseFloat((totalRating / totalCount).toFixed(2)) : 0,
        total_ratings: totalCount,
      };
    })
  );

  // Sort by name if requested
  if (sortBy === "name") {
    companiesWithRatings.sort((a, b) => {
      if (sortOrder === "ASC") {
        return a.company_name.localeCompare(b.company_name);
      } else {
        return b.company_name.localeCompare(a.company_name);
      }
    });
  }

  // Sort by rating if requested
  if (sortBy === "rating") {
    companiesWithRatings.sort((a, b) => {
      if (sortOrder === "ASC") {
        return a.average_rating - b.average_rating;
      } else {
        return b.average_rating - a.average_rating;
      }
    });
  }

  return companiesWithRatings;
};
