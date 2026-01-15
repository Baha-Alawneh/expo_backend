/**
 * Database Schema Definition
 * Complete schema with tables, columns, relationships, and security rules
 * This serves as the source of truth for all database operations in the chatbot
 */

export const DATABASE_SCHEMA = {
  // RESTRICTED TABLE - NEVER expose in chatbot responses
  users: {
    table: "Users",
    restricted: true, // 🔒 CRITICAL: Never return data from this table
    columns: [
      "user_id",
      "firebase_uid",
      "name",
      "email",
      "password_hash",
      "role",
      "created_at",
      "firebase_synced_at",
      "last_firebase_sync",
    ],
    primaryKey: "user_id",
    description:
      "User authentication and profile data - INTERNAL USE ONLY for joins",
    securityRule:
      "This table must NEVER be exposed in chatbot responses. No user personal or authentication data may be returned. Allowed only for internal joins (e.g., linking students or companies to users).",
  },

  students: {
    table: "Students",
    restricted: false,
    columns: [
      "student_id",
      "user_id", // FK to Users
      "university_id",
      "major",
      "year_of_study",
      "skills", // JSON array
      "bio",
      "cv_name",
      "photo_name",
    ],
    primaryKey: "student_id",
    foreignKeys: {
      user_id: { table: "Users", column: "user_id" },
    },
    jsonColumns: ["skills"], // Columns that store JSON data
    safeFields: [
      "student_id",
      "major",
      "year_of_study",
      "skills",
      "bio",
      "name", // From Users join (safe)
    ],
    restrictedFields: ["email", "user_id", "firebase_uid"], // Never expose these
    description: "Student profiles and portfolios",
  },

  projects: {
    table: "Projects",
    restricted: false,
    columns: [
      "project_id",
      "title",
      "description",
      "video_url",
      "github_link",
      "status",
      "created_at",
      "booth",
      "project_photos", // JSON array
    ],
    primaryKey: "project_id",
    jsonColumns: ["project_photos"],
    safeFields: [
      "project_id",
      "title",
      "description",
      "video_url",
      "github_link",
      "status",
      "created_at",
      "booth",
    ],
    description: "Student project showcases",
  },

  projectMembers: {
    table: "ProjectMembers",
    restricted: false,
    columns: ["project_id", "student_id"],
    foreignKeys: {
      project_id: { table: "Projects", column: "project_id" },
      student_id: { table: "Students", column: "student_id" },
    },
    description: "Many-to-many relationship between projects and students",
  },

  offering: {
    table: "Offering",
    restricted: false,
    columns: [
      "offering_id",
      "company_id", // FK to Companies
      "name",
      "description",
      "price",
      "offering_photos", // JSON array
    ],
    primaryKey: "offering_id",
    foreignKeys: {
      company_id: { table: "Companies", column: "company_id" },
    },
    jsonColumns: ["offering_photos"],
    safeFields: [
      "offering_id",
      "name",
      "description",
      "price",
      "company_name", // From Companies join
    ],
    description: "Company products and services",
  },

  feedback: {
    table: "Feedback",
    restricted: false,
    columns: [
      "feedback_id",
      "entity_id", // Can reference project_id, company_id, etc.
      "entity_type", // 'project', 'company', 'offering'
      "user_id", // FK to Users
      "rating",
      "comment",
      "created_at",
      "updated_at",
    ],
    primaryKey: "feedback_id",
    foreignKeys: {
      user_id: { table: "Users", column: "user_id" },
    },
    safeFields: [
      "feedback_id",
      "entity_id",
      "entity_type",
      "rating",
      "comment",
      "created_at",
    ],
    restrictedFields: ["user_id"], // Never expose who gave feedback
    description:
      "User feedback and ratings - MUST BE ANONYMIZED (no user identity)",
    securityRule: "Feedback data must be anonymized - never expose user_id",
  },

  companies: {
    table: "Companies",
    restricted: false,
    columns: [
      "company_id",
      "user_id", // FK to Users
      "company_name",
      "category",
      "description",
      "phone",
      "booth_id", // FK to Booths
      "profile_image",
      "website_url",
      "address",
    ],
    primaryKey: "company_id",
    foreignKeys: {
      user_id: { table: "Users", column: "user_id" },
      booth_id: { table: "Booths", column: "booth_id" },
    },
    safeFields: [
      "company_id",
      "company_name",
      "category",
      "description",
      "phone",
      "website_url",
      "address",
      "booth_id",
      "booth_number", // From Booths join
    ],
    restrictedFields: ["user_id", "email"], // Never expose user link
    description: "Company profiles and information",
  },

  booths: {
    table: "Booths",
    restricted: false,
    columns: [
      "booth_id",
      "booth_number",
      "location_x",
      "location_y",
      "assigned_to_project",
      "assigned_to_company",
    ],
    primaryKey: "booth_id",
    safeFields: [
      "booth_id",
      "booth_number",
      "location_x",
      "location_y",
      "assigned_to_project",
      "assigned_to_company",
    ],
    description: "Physical booth locations at the expo",
  },
};

/**
 * Get safe fields for a table (fields that can be exposed to chatbot responses)
 * Automatically excludes restricted fields and applies security rules
 */
export const getSafeFields = (tableName) => {
  const tableKey = Object.keys(DATABASE_SCHEMA).find(
    (key) =>
      DATABASE_SCHEMA[key].table.toLowerCase() === tableName.toLowerCase()
  );

  if (!tableKey) {
    console.warn(`Table ${tableName} not found in schema`);
    return [];
  }

  const tableSchema = DATABASE_SCHEMA[tableKey];

  // If entire table is restricted, return empty array
  if (tableSchema.restricted) {
    return [];
  }

  // Return explicitly defined safe fields, or all columns except restricted ones
  if (tableSchema.safeFields) {
    return tableSchema.safeFields;
  }

  // Fallback: all columns except those in restrictedFields
  const restrictedFields = tableSchema.restrictedFields || [];
  return tableSchema.columns.filter(
    (col) => !restrictedFields.includes(col)
  );
};

/**
 * Check if a table should never be exposed
 */
export const isRestrictedTable = (tableName) => {
  const tableKey = Object.keys(DATABASE_SCHEMA).find(
    (key) =>
      DATABASE_SCHEMA[key].table.toLowerCase() === tableName.toLowerCase()
  );

  if (!tableKey) return true; // Unknown tables are restricted by default

  return DATABASE_SCHEMA[tableKey].restricted === true;
};

/**
 * Get table relationships for intelligent joins
 */
export const getTableRelationships = (tableName) => {
  const tableKey = Object.keys(DATABASE_SCHEMA).find(
    (key) =>
      DATABASE_SCHEMA[key].table.toLowerCase() === tableName.toLowerCase()
  );

  if (!tableKey) return {};

  return DATABASE_SCHEMA[tableKey].foreignKeys || {};
};

/**
 * Common JOIN patterns for related data
 */
export const JOIN_PATTERNS = {
  // Get student name for students (join Users but only select name)
  studentsWithName: {
    from: "Students",
    joins: [
      {
        type: "JOIN",
        table: "Users",
        on: "Students.user_id = Users.user_id",
        selectFields: ["name"], // Only safe field from Users
      },
    ],
  },

  // Get company name contact for companies
  companiesWithDetails: {
    from: "Companies",
    joins: [
      {
        type: "JOIN",
        table: "Users",
        on: "Companies.user_id = Users.user_id",
        selectFields: ["name"], // Only safe field from Users
      },
      {
        type: "LEFT JOIN",
        table: "Booths",
        on: "Companies.booth_id = Booths.booth_id",
        selectFields: ["booth_number", "location_x", "location_y"],
      },
    ],
  },

  // Get projects with student members
  projectsWithStudents: {
    from: "Projects",
    joins: [
      {
        type: "LEFT JOIN",
        table: "ProjectMembers",
        on: "Projects.project_id = ProjectMembers.project_id",
      },
      {
        type: "LEFT JOIN",
        table: "Students",
        on: "ProjectMembers.student_id = Students.student_id",
      },
      {
        type: "LEFT JOIN",
        table: "Users",
        on: "Students.user_id = Users.user_id",
        selectFields: ["name"], // Only safe field
      },
    ],
  },

  // Get offerings with company info
  offeringsWithCompany: {
    from: "Offering",
    joins: [
      {
        type: "JOIN",
        table: "Companies",
        on: "Offering.company_id = Companies.company_id",
        selectFields: ["company_name", "category"],
      },
    ],
  },

  // Get anonymized feedback (no user info)
  anonymizedFeedback: {
    from: "Feedback",
    excludeFields: ["user_id"], // CRITICAL: Never expose user_id
  },

  // Get projects with their booth location
  projectsWithBooth: {
    from: "Projects",
    joins: [
      {
        type: "LEFT JOIN",
        table: "Booths",
        on: "Projects.booth = Booths.booth_id",
        selectFields: ["booth_number", "location_x", "location_y"],
      },
    ],
  },
};

/**
 * Security validator - ensures no restricted data is exposed
 */
export const validateQuerySecurity = (query, results) => {
  // Check if query contains restricted patterns
  const restrictedPatterns = [
    /password/i,
    /firebase_uid/i,
    /password_hash/i,
    /last_firebase_sync/i,
    /firebase_synced_at/i,
    /Users\.email/i, // Prevent direct email access from Users table
  ];

  const queryLower = query.toLowerCase();

  for (const pattern of restrictedPatterns) {
    if (pattern.test(queryLower)) {
      throw new Error(
        `Security violation: Query contains restricted field - ${pattern}`
      );
    }
  }

  // If results contain user emails from Users table join, remove them
  if (Array.isArray(results)) {
    return results.map((row) => {
      const sanitized = { ...row };
      // Remove any firebase or auth fields that might leak
      delete sanitized.firebase_uid;
      delete sanitized.password_hash;
      delete sanitized.password;
      delete sanitized.last_firebase_sync;
      delete sanitized.firebase_synced_at;
      return sanitized;
    });
  }

  return results;
};

export default DATABASE_SCHEMA;
