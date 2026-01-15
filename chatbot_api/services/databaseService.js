import pool from "../config/database.js";
import {
  buildSafeQuery,
  buildQueryFromPattern,
  buildSearchQuery,
  buildAggregationQuery,
  sanitizeResults,
} from "./queryBuilder.js";

/**
 * Database Service - Handles all database queries for the chatbot
 * Enhanced with schema-aware secure querying and multi-table relationships
 */

// ============================================================================
// HELPER FUNCTIONS - Eliminate code duplication
// ============================================================================

/**
 * Safely parse JSON field, returning empty array on error
 */
const parseJsonArray = (jsonString) => {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * Parse student skills from JSON string
 */
const parseStudentSkills = (student) => {
  return {
    ...student,
    skills: parseJsonArray(student.skills),
  };
};

/**
 * Get students for a project with parsed skills
 */
const getProjectStudents = async (projectId) => {
  const [students] = await pool.query(
    `SELECT s.student_id, s.major, s.year_of_study, s.skills, s.bio, 
            u.name, u.email
     FROM ProjectMembers pm
     JOIN Students s ON pm.student_id = s.student_id
     JOIN Users u ON s.user_id = u.user_id
     WHERE pm.project_id = ?`,
    [projectId]
  );
  return students.map(parseStudentSkills);
};

/**
 * Enrich a single project with students and metadata
 */
const enrichProject = async (project) => {
  const students = await getProjectStudents(project.project_id);
  const images = parseJsonArray(project.project_photos);

  return {
    ...project,
    imageCount: images.length,
    students,
    studentCount: students.length,
    studentNames: students.map((s) => s.name).join(", "),
  };
};

/**
 * Enrich multiple projects in parallel
 */
const enrichProjects = (projects) => Promise.all(projects.map(enrichProject));

/**
 * Parse offering photos and add metadata
 */
const enrichOffering = (offering) => {
  const photos = parseJsonArray(offering.offering_photos);
  return {
    ...offering,
    photos,
    photoCount: photos.length,
  };
};


// ============================================================================
// PROJECT QUERIES
// ============================================================================

/**
 * Get all projects with complete details
 */
export const getAllProjects = async () => {
  try {
    const [projects] = await pool.query(
      `SELECT * FROM Projects ORDER BY created_at DESC`
    );
    return await enrichProjects(projects);
  } catch (error) {
    console.error("Error fetching all projects:", error);
    throw error;
  }
};

/**
 * Search projects by keyword
 */
export const searchProjects = async (keyword) => {
  try {
    const searchTerm = `%${keyword}%`;
    const [projects] = await pool.query(
      `SELECT DISTINCT p.* 
       FROM Projects p
       LEFT JOIN ProjectMembers pm ON p.project_id = pm.project_id
       LEFT JOIN Students s ON pm.student_id = s.student_id
       LEFT JOIN Users u ON s.user_id = u.user_id
       WHERE LOWER(p.title) LIKE LOWER(?) 
          OR LOWER(p.description) LIKE LOWER(?)
          OR LOWER(u.name) LIKE LOWER(?)
          OR LOWER(s.skills) LIKE LOWER(?)
          OR LOWER(s.major) LIKE LOWER(?)
       ORDER BY 
         CASE 
           WHEN LOWER(p.title) LIKE LOWER(?) THEN 1
           WHEN LOWER(p.description) LIKE LOWER(?) THEN 2
           WHEN LOWER(s.skills) LIKE LOWER(?) THEN 3
           ELSE 4
         END,
         p.created_at DESC`,
      [
        searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
        searchTerm, searchTerm, searchTerm
      ]
    );
    return await enrichProjects(projects);
  } catch (error) {
    console.error("Error searching projects:", error);
    throw error;
  }
};

/**
 * Get projects by student name
 */
export const getProjectsByStudent = async (studentName) => {
  try {
    const searchTerm = `%${studentName}%`;
    const [students] = await pool.query(
      `SELECT student_id FROM Students s
       JOIN Users u ON s.user_id = u.user_id
       WHERE LOWER(u.name) LIKE LOWER(?)`,
      [searchTerm]
    );

    if (students.length === 0) return [];

    const studentIds = students.map((s) => s.student_id);
    const placeholders = studentIds.map(() => "?").join(",");

    const [projectMembers] = await pool.query(
      `SELECT DISTINCT project_id FROM ProjectMembers 
       WHERE student_id IN (${placeholders})`,
      studentIds
    );

    if (projectMembers.length === 0) return [];

    const projectIds = projectMembers.map((pm) => pm.project_id);
    const projectPlaceholders = projectIds.map(() => "?").join(",");

    const [projects] = await pool.query(
      `SELECT * FROM Projects WHERE project_id IN (${projectPlaceholders})
       ORDER BY created_at DESC`,
      projectIds
    );

    return await enrichProjects(projects);
  } catch (error) {
    console.error("Error fetching projects by student:", error);
    throw error;
  }
};

/**
 * Get all companies with details
 * @returns {Promise<Array>} Array of company objects
 */
export const getAllCompanies = async () => {
  try {
    const [companies] = await pool.query(
      `SELECT c.company_id, c.user_id, c.company_name, c.category, 
              c.description, c.phone, c.address, c.booth_id, c.website_url,
              u.name, u.email
       FROM Companies c
       JOIN Users u ON c.user_id = u.user_id
       ORDER BY c.company_name ASC`
    );

    return companies;
  } catch (error) {
    console.error("Error fetching all companies:", error);
    throw error;
  }
};

/**
 * Search companies by keyword
 * @param {string} keyword - Search term
 * @returns {Promise<Array>} Matching companies
 */
export const searchCompanies = async (keyword) => {
  try {
    const searchTerm = `%${keyword}%`;
    const [companies] = await pool.query(
      `SELECT c.company_id, c.user_id, c.company_name, c.category, 
              c.description, c.phone, c.address, c.booth_id, c.website_url,
              u.name, u.email
       FROM Companies c
       JOIN Users u ON c.user_id = u.user_id
       WHERE LOWER(c.company_name) LIKE LOWER(?) 
          OR LOWER(c.category) LIKE LOWER(?)
          OR LOWER(c.description) LIKE LOWER(?)
       ORDER BY c.company_name ASC`,
      [searchTerm, searchTerm, searchTerm]
    );

    return companies;
  } catch (error) {
    console.error("Error searching companies:", error);
    throw error;
  }
};

/**
 * Get all students with details
 * @returns {Promise<Array>} Array of student objects
 */
// ============================================================================
// STUDENT QUERIES
// ============================================================================

export const getAllStudents = async () => {
  try {
    const [students] = await pool.query(
      `SELECT s.student_id, s.user_id, s.university_id, s.major, 
              s.year_of_study, s.skills, s.bio,
              u.name, u.email
       FROM Students s
       JOIN Users u ON s.user_id = u.user_id
       ORDER BY u.name ASC`
    );
    return students.map(parseStudentSkills);
  } catch (error) {
    console.error("Error fetching all students:", error);
    throw error;
  }
};

/**
 * Get database statistics
 * @returns {Promise<Object>} Statistics about the database
 */
export const getStatistics = async () => {
  try {
    const [projectCount] = await pool.query(
      `SELECT COUNT(*) as count FROM Projects`
    );
    const [companyCount] = await pool.query(
      `SELECT COUNT(*) as count FROM Companies`
    );
    const [studentCount] = await pool.query(
      `SELECT COUNT(*) as count FROM Students`
    );
    const [projectsWithGithub] = await pool.query(
      `SELECT COUNT(*) as count FROM Projects 
       WHERE github_link IS NOT NULL AND github_link != ''`
    );
    const [projectsWithVideo] = await pool.query(
      `SELECT COUNT(*) as count FROM Projects 
       WHERE video_url IS NOT NULL AND video_url != ''`
    );

    return {
      totalProjects: projectCount[0].count,
      totalCompanies: companyCount[0].count,
      totalStudents: studentCount[0].count,
      projectsWithGithub: projectsWithGithub[0].count,
      projectsWithVideo: projectsWithVideo[0].count,
    };
  } catch (error) {
    console.error("Error fetching statistics:", error);
    throw error;
  }
};

// ============================================================================
// ENHANCED DATABASE FUNCTIONS - Schema-Aware with Security
// ============================================================================

// ============================================================================
// OFFERING QUERIES
// ============================================================================

export const getAllOfferings = async () => {
  try {
    const { query, params } = buildQueryFromPattern("offeringsWithCompany", {
      orderBy: "Offering.offering_id DESC",
    });
    const [offerings] = await pool.query(query, params);
    return sanitizeResults(offerings.map(enrichOffering));
  } catch (error) {
    console.error("Error fetching all offerings:", error);
    throw error;
  }
};

export const searchOfferings = async (keyword) => {
  try {
    const { query, params } = buildSearchQuery({
      table: "Offering",
      searchFields: ["Offering.name", "Offering.description", "Companies.company_name"],
      keyword,
      joins: [
        {
          type: "JOIN",
          table: "Companies",
          on: "Offering.company_id = Companies.company_id",
          selectFields: ["company_name", "category"],
        },
      ],
      limit: 50,
    });
    const [offerings] = await pool.query(query, params);
    return sanitizeResults(offerings.map(enrichOffering));
  } catch (error) {
    console.error("Error searching offerings:", error);
    throw error;
  }
};

/**
 * Get offerings by company
 * @param {string} companyName - Company name to search for
 * @returns {Promise<Array>} Offerings from that company
 */
export const getOfferingsByCompany = async (companyName) => {
  try {
    const { query, params } = buildSafeQuery({
      table: "Offering",
      joins: [
        {
          type: "JOIN",
          table: "Companies",
          on: "Offering.company_id = Companies.company_id",
          selectFields: ["company_name", "category"],
        },
      ],
      where: {
        "Companies.company_name": { like: companyName },
      },
    });

    const [offerings] = await pool.query(query, params);

    return sanitizeResults(offerings);
  } catch (error) {
    console.error("Error fetching offerings by company:", error);
    throw error;
  }
};

/**
 * Get feedback for a specific entity (project, company, or offering)
 * IMPORTANT: Returns anonymized feedback (no user identification)
 * @param {string} entityType - Type of entity ('project', 'company', 'offering')
 * @param {number} entityId - ID of the entity
 * @returns {Promise<Array>} Anonymized feedback array
 */
export const getFeedbackForEntity = async (entityType, entityId) => {
  try {
    const { query, params } = buildSafeQuery({
      table: "Feedback",
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      orderBy: "created_at DESC",
    });

    const [feedback] = await pool.query(query, params);

    // CRITICAL: Remove user_id to anonymize feedback
    return sanitizeResults(feedback, ["user_id"]);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    throw error;
  }
};

/**
 * Get average rating for an entity
 * @param {string} entityType - Type of entity
 * @param {number} entityId - ID of the entity
 * @returns {Promise<Object>} Rating statistics
 */
export const getAverageRating = async (entityType, entityId) => {
  try {
    const { query, params } = buildAggregationQuery({
      table: "Feedback",
      aggregation: "AVG",
      field: "rating",
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
    });

    const [result] = await pool.query(query, params);

    // Also get count
    const countQuery = buildAggregationQuery({
      table: "Feedback",
      aggregation: "COUNT",
      field: "*",
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
    });

    const [countResult] = await pool.query(countQuery.query, countQuery.params);

    return {
      averageRating: result[0]?.avg_value || 0,
      feedbackCount: countResult[0]?.count_value || 0,
      entityType,
      entityId,
    };
  } catch (error) {
    console.error("Error calculating average rating:", error);
    throw error;
  }
};

/**
 * Get booth information with assigned project or company
 * @param {number} boothNumber - Booth number to search for
 * @returns {Promise<Object|null>} Booth details with assignment
 */
export const getBoothInfo = async (boothNumber) => {
  try {
    const { query, params } = buildSafeQuery({
      table: "Booths",
      where: {
        booth_number: boothNumber,
      },
    });

    const [booths] = await pool.query(query, params);

    if (booths.length === 0) return null;

    const booth = booths[0];

    // Get assigned project if any
    if (booth.assigned_to_project) {
      const [projects] = await pool.query(
        `SELECT project_id, title, description FROM Projects WHERE booth = ?`,
        [booth.booth_id]
      );

      if (projects.length > 0) {
        booth.assignedProject = projects[0];
      }
    }

    // Get assigned company if any
    if (booth.assigned_to_company) {
      const [companies] = await pool.query(
        `SELECT company_id, company_name, category, description 
         FROM Companies WHERE booth_id = ?`,
        [booth.booth_id]
      );

      if (companies.length > 0) {
        booth.assignedCompany = sanitizeResults(companies[0]);
      }
    }

    return booth;
  } catch (error) {
    console.error("Error fetching booth info:", error);
    throw error;
  }
};

/**
 * Search students by skills
 * @param {string} skill - Skill to search for
 * @returns {Promise<Array>} Students with that skill
 */
export const searchStudentsBySkill = async (skill) => {
  try {
    const { query, params } = buildSearchQuery({
      table: "Students",
      searchFields: ["Students.skills", "Students.major"],
      keyword: skill,
      joins: [
        {
          type: "JOIN",
          table: "Users",
          on: "Students.user_id = Users.user_id",
          selectFields: ["name"],
        },
      ],
      limit: 50,
    });
    const [students] = await pool.query(query, params);
    return sanitizeResults(students.map(parseStudentSkills), ["email", "user_id"]);
  } catch (error) {
    console.error("Error searching students by skill:", error);
    throw error;
  }
};

/**
 * Get student by ID with their projects
 * @param {number} studentId - Student ID
 * @returns {Promise<Object|null>} Student with projects
 */
export const getStudentWithProjects = async (studentId) => {
  try {
    const { query, params } = buildQueryFromPattern("studentsWithName", {
      where: { "Students.student_id": studentId },
    });
    const [students] = await pool.query(query, params);
    
    if (students.length === 0) return null;

    const student = parseStudentSkills(students[0]);

    // Get student's projects
    const [projectMembers] = await pool.query(
      `SELECT project_id FROM ProjectMembers WHERE student_id = ?`,
      [studentId]
    );

    let projects = [];
    if (projectMembers.length > 0) {
      const projectIds = projectMembers.map((pm) => pm.project_id);
      const placeholders = projectIds.map(() => "?").join(",");

      const [projectResults] = await pool.query(
        `SELECT project_id, title, description, status, github_link, video_url 
         FROM Projects WHERE project_id IN (${placeholders})`,
        projectIds
      );

      projects = projectResults;
    }

    return sanitizeResults({
      ...student,
      projects,
      projectCount: projects.length,
    }, ["email", "user_id"]);
  } catch (error) {
    console.error("Error fetching student with projects:", error);
    throw error;
  }
};

/**
 * Get company by ID with their offerings
 * @param {number} companyId - Company ID
 * @returns {Promise<Object|null>} Company with offerings
 */
export const getCompanyWithOfferings = async (companyId) => {
  try {
    // Get company details
    const { query, params } = buildQueryFromPattern("companiesWithDetails", {
      where: { "Companies.company_id": companyId },
    });

    const [companies] = await pool.query(query, params);

    if (companies.length === 0) return null;

    const company = companies[0];

    // Get company's offerings
    const [offerings] = await pool.query(
      `SELECT offering_id, name, description, price 
       FROM Offering WHERE company_id = ?`,
      [companyId]
    );

    return sanitizeResults({
      ...company,
      offerings,
      offeringCount: offerings.length,
    }, ["email", "user_id"]);
  } catch (error) {
    console.error("Error fetching company with offerings:", error);
    throw error;
  }
};

/**
 * Get projects by major/field of study
 * @param {string} major - Major to search for
 * @returns {Promise<Array>} Projects by students in that major
 */
export const getProjectsByMajor = async (major) => {
  try {
    const [projects] = await pool.query(
      `SELECT DISTINCT p.*, 
              GROUP_CONCAT(DISTINCT s.major) as majors,
              GROUP_CONCAT(DISTINCT u.name) as student_names
       FROM Projects p
       JOIN ProjectMembers pm ON p.project_id = pm.project_id
       JOIN Students s ON pm.student_id = s.student_id
       JOIN Users u ON s.user_id = u.user_id
       WHERE LOWER(s.major) LIKE LOWER(?)
       GROUP BY p.project_id
       ORDER BY p.created_at DESC`,
      [`%${major}%`]
    );

    return sanitizeResults(projects);
  } catch (error) {
    console.error("Error fetching projects by major:", error);
    throw error;
  }
};

/**
 * Get companies by category
 * @param {string} category - Category to filter by
 * @returns {Promise<Array>} Companies in that category
 */
export const getCompaniesByCategory = async (category) => {
  try {
    const { query, params } = buildQueryFromPattern("companiesWithDetails", {
      where: { "Companies.category": { like: category } },
      orderBy: "Companies.company_name ASC",
    });

    const [companies] = await pool.query(query, params);

    return sanitizeResults(companies, ["email", "user_id"]);
  } catch (error) {
    console.error("Error fetching companies by category:", error);
    throw error;
  }
};

/**
 * Get enhanced statistics with detailed breakdowns
 * @returns {Promise<Object>} Comprehensive statistics
 */
export const getEnhancedStatistics = async () => {
  try {
    // Get basic counts
    const stats = await getStatistics();

    // Get offerings count
    const offeringsQuery = buildAggregationQuery({
      table: "Offering",
      aggregation: "COUNT",
      field: "*",
    });
    const [offeringCount] = await pool.query(
      offeringsQuery.query,
      offeringsQuery.params
    );

    // Get feedback count
    const feedbackQuery = buildAggregationQuery({
      table: "Feedback",
      aggregation: "COUNT",
      field: "*",
    });
    const [feedbackCount] = await pool.query(
      feedbackQuery.query,
      feedbackQuery.params
    );

    // Get booths count
    const boothsQuery = buildAggregationQuery({
      table: "Booths",
      aggregation: "COUNT",
      field: "*",
    });
    const [boothCount] = await pool.query(
      boothsQuery.query,
      boothsQuery.params
    );

    // Get projects by status
    const [projectsByStatus] = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM Projects 
       GROUP BY status`
    );

    // Get companies by category
    const [companiesByCategory] = await pool.query(
      `SELECT category, COUNT(*) as count 
       FROM Companies 
       GROUP BY category 
       ORDER BY count DESC`
    );

    // Get average ratings
    const [avgProjectRating] = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count 
       FROM Feedback 
       WHERE entity_type = 'project'`
    );

    const [avgCompanyRating] = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count 
       FROM Feedback 
       WHERE entity_type = 'company'`
    );

    return {
      ...stats,
      totalOfferings: offeringCount[0]?.count_value || 0,
      totalFeedback: feedbackCount[0]?.count_value || 0,
      totalBooths: boothCount[0]?.count_value || 0,
      projectsByStatus: projectsByStatus.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      companiesByCategory: companiesByCategory.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {}),
      averageProjectRating: avgProjectRating[0]?.avg_rating || 0,
      projectRatingCount: avgProjectRating[0]?.count || 0,
      averageCompanyRating: avgCompanyRating[0]?.avg_rating || 0,
      companyRatingCount: avgCompanyRating[0]?.count || 0,
    };
  } catch (error) {
    console.error("Error fetching enhanced statistics:", error);
    throw error;
  }
};
