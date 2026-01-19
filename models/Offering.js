import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";
import { getOfferingAverageRating } from "./Feedback.js";

// Get offering by company_id
export const getOfferingByCompanyId = async (company_id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM Offering WHERE company_id = ?`,
    [company_id]
  );

  if (rows.length === 0) return null;

  const offering = rows[0];

  // MySQL JSON columns are already parsed as arrays, no need to JSON.parse
  let images = [];
  if (offering.offering_photos) {
    if (Array.isArray(offering.offering_photos)) {
      // Already an array from MySQL
      images = offering.offering_photos.filter(
        (photo) => photo && typeof photo === 'string' && photo.trim().length > 0
      );
    } else if (typeof offering.offering_photos === 'string') {
      // In case it's a string, parse it
      try {
        const parsed = JSON.parse(offering.offering_photos);
        images = Array.isArray(parsed) ? parsed.filter(
          (photo) => photo && typeof photo === 'string' && photo.trim().length > 0
        ) : [];
      } catch (e) {
        console.error("Error parsing offering_photos:", e);
        images = [];
      }
    }
  }

  // Get rating stats
  const ratingStats = await getOfferingAverageRating(offering.offering_id);

  return {
    ...offering,
    images,
    average_rating: ratingStats.average_rating,
    total_ratings: ratingStats.total_ratings,
  };
};

// Get all offerings by company_id (supports multiple offerings per company)
export const getAllOfferingsByCompanyId = async (company_id) => {
  const [rows] = await pool.execute(
    `SELECT * FROM Offering WHERE company_id = ? ORDER BY name ASC`,
    [company_id]
  );

  if (rows.length === 0) return [];

  // Process each offering
  const offerings = await Promise.all(
    rows.map(async (offering) => {
      // Parse offering_photos
      let images = [];
      if (offering.offering_photos) {
        if (Array.isArray(offering.offering_photos)) {
          images = offering.offering_photos.filter(
            (photo) => photo && typeof photo === 'string' && photo.trim().length > 0
          );
        } else if (typeof offering.offering_photos === 'string') {
          try {
            const parsed = JSON.parse(offering.offering_photos);
            images = Array.isArray(parsed) ? parsed.filter(
              (photo) => photo && typeof photo === 'string' && photo.trim().length > 0
            ) : [];
          } catch (e) {
            console.error("Error parsing offering_photos:", e);
            images = [];
          }
        }
      }

      // Get rating stats
      const ratingStats = await getOfferingAverageRating(offering.offering_id);

      return {
        ...offering,
        images,
        average_rating: ratingStats.average_rating,
        total_ratings: ratingStats.total_ratings,
      };
    })
  );

  return offerings;
};

// Create new offering for company
export const createOffering = async (company_id, data) => {
  const { name, description, price, offering_photos, type } = data;

  const offering_id = uuidv4();

  // Insert offering - don't store offering_photos initially, they will be uploaded separately
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
      null, // Always null initially - images uploaded separately
    ]
  );

  // Update company type if provided
  if (type) {
    await pool.execute(
      `UPDATE Companies SET type = ? WHERE company_id = ?`,
      [type, company_id]
    );
  }

  return {
    offering_id,
    company_id,
  };
};

// Update existing offering for company
export const updateOffering = async (company_id, data) => {
  const { name, description, price, offering_photos } = data;

  // Validate and clean offering_photos if provided
  let cleanedPhotos;
  let shouldUpdatePhotos = false;
  
  if (offering_photos !== undefined && offering_photos !== null) {
    shouldUpdatePhotos = true;
    if (Array.isArray(offering_photos)) {
      // Filter to only valid S3 keys (strings)
      const validPhotos = offering_photos.filter(
        (photo) => photo && typeof photo === 'string' && photo.trim().length > 0
      );
      cleanedPhotos = validPhotos.length > 0 ? JSON.stringify(validPhotos) : null;
    } else {
      cleanedPhotos = null;
    }
  }

  // Build query based on whether we're updating photos
  const query = shouldUpdatePhotos
    ? `UPDATE Offering 
       SET 
         name = COALESCE(?, name), 
         description = COALESCE(?, description), 
         price = COALESCE(?, price), 
         offering_photos = ?
       WHERE company_id = ?`
    : `UPDATE Offering 
       SET 
         name = COALESCE(?, name), 
         description = COALESCE(?, description), 
         price = COALESCE(?, price)
       WHERE company_id = ?`;

  const params = shouldUpdatePhotos
    ? [name || null, description || null, price || null, cleanedPhotos, company_id]
    : [name || null, description || null, price || null, company_id];

  await pool.execute(query, params);

  return await getOfferingByCompanyId(company_id);
};

// Get all offerings with optional sorting
export const getAllOfferings = async (sortBy = null, sortOrder = "DESC") => {
  // Build the ORDER BY clause
  let orderByClause = "";
  if (sortBy === "name") {
    orderByClause = `ORDER BY name ${sortOrder}`;
  } else if (sortBy === "rating") {
    // We'll add rating after fetching
    orderByClause = ""; // Will sort in JavaScript
  } else {
    // Default: order by offering_id (newest first based on UUID)
    orderByClause = "ORDER BY offering_id DESC";
  }

  // Only fetch offerings from approved companies
  const [rows] = await pool.execute(
    `SELECT o.* 
     FROM Offering o
     INNER JOIN Companies c ON o.company_id = c.company_id
     WHERE c.status = 'approved'
     ${orderByClause}`
  );

  // For each offering, get rating stats
  const offeringsWithRatings = await Promise.all(
    rows.map(async (offering) => {
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

      // Get rating stats
      const ratingStats = await getOfferingAverageRating(offering.offering_id);

      return {
        ...offering,
        images,
        average_rating: ratingStats.average_rating,
        total_ratings: ratingStats.total_ratings,
      };
    })
  );

  // If sorting by rating, sort in JavaScript
  if (sortBy === "rating") {
    offeringsWithRatings.sort((a, b) => {
      if (sortOrder === "ASC") {
        return a.average_rating - b.average_rating;
      } else {
        return b.average_rating - a.average_rating;
      }
    });
  }

  return offeringsWithRatings;
};

// Delete offering by company_id
export const deleteOffering = async (company_id) => {
  const [result] = await pool.execute(
    `DELETE FROM Offering WHERE company_id = ?`,
    [company_id]
  );

  return result.affectedRows > 0;
};
