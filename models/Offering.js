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

  const [rows] = await pool.execute(`SELECT * FROM Offering ${orderByClause}`);

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
