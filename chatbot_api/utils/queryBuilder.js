const { executeQuery } = require('./db');
const databaseSchema = require('../data/database_schema.json');

/**
 * Query builder for common expo database queries
 */
class QueryBuilder {
  
  /**
   * Get approved projects with optional filters
   */
  static async getProjects(filters = {}) {
    let query = `
      SELECT 
        p.project_id,
        p.title,
        p.description,
        p.type,
        p.status,
        p.video_url,
        p.github_link,
        p.booth,
        p.created_at,
        b.booth_number,
        b.zone_type,
        GROUP_CONCAT(DISTINCT u.name SEPARATOR ', ') as team_members
      FROM Projects p
      LEFT JOIN Booths b ON p.project_id = b.assigned_to_project
      LEFT JOIN ProjectMembers pm ON p.project_id = pm.project_id
      LEFT JOIN Students s ON pm.student_id = s.student_id
      LEFT JOIN Users u ON s.user_id = u.user_id
    `;

    const conditions = [];
    const params = [];

    // Default to approved projects only
    const status = filters.status || 'approved';
    conditions.push('p.status = ?');
    params.push(String(status));

    if (filters.type && filters.type !== null && filters.type !== undefined) {
      conditions.push('p.type = ?');
      params.push(String(filters.type));
    }

    if (filters.search && filters.search !== null && filters.search !== undefined) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      const searchTerm = String(filters.search);
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY p.project_id ORDER BY p.created_at DESC LIMIT ?';
    const limit = parseInt(filters.limit) || 20;
    params.push(String(limit));

    return await executeQuery(query, params);
  }

  /**
   * Get companies with optional filters
   */
  static async getCompanies(filters = {}) {
    let query = `
      SELECT 
        c.company_id,
        c.company_name,
        c.description,
        c.type,
        c.phone,
        c.website_url,
        c.address,
        c.profile_image,
        b.booth_number,
        b.zone_type,
        b.location_x,
        b.location_y,
        u.email
      FROM Companies c
      LEFT JOIN Booths b ON c.booth_id = b.booth_id
      LEFT JOIN Users u ON c.user_id = u.user_id
    `;

    const conditions = [];
    const params = [];

    if (filters.type && filters.type !== null && filters.type !== undefined) {
      conditions.push('c.type = ?');
      params.push(String(filters.type));
    }

    if (filters.search && filters.search !== null && filters.search !== undefined) {
      conditions.push('(c.company_name LIKE ? OR c.description LIKE ?)');
      const searchTerm = String(filters.search);
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.company_name LIMIT ?';
    const limit = parseInt(filters.limit) || 20;
    params.push(String(limit));

    return await executeQuery(query, params);
  }

  /**
   * Get approved offerings from companies
   */
  static async getOfferings(filters = {}) {
    let query = `
      SELECT 
        o.offering_id,
        o.name,
        o.description,
        o.price,
        o.status,
        o.created_at,
        c.company_name,
        c.type as company_type
      FROM Offering o
      JOIN Companies c ON o.company_id = c.company_id
    `;

    const conditions = [];
    const params = [];

    // Default to approved offerings
    const status = filters.status || 'approved';
    conditions.push('o.status = ?');
    params.push(String(status));

    if (filters.companyId && filters.companyId !== null && filters.companyId !== undefined) {
      conditions.push('o.company_id = ?');
      params.push(String(filters.companyId));
    }

    if (filters.search && filters.search !== null && filters.search !== undefined) {
      conditions.push('(o.name LIKE ? OR o.description LIKE ?)');
      const searchTerm = String(filters.search);
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC LIMIT ?';
    const limit = parseInt(filters.limit) || 20;
    params.push(String(limit));

    return await executeQuery(query, params);
  }

  /**
   * Get students with optional filters
   */
  static async getStudents(filters = {}) {
    let query = `
      SELECT 
        s.student_id,
        s.major,
        s.year_of_study,
        s.skills,
        s.bio,
        u.name,
        u.email
      FROM Students s
      JOIN Users u ON s.user_id = u.user_id
    `;

    const conditions = [];
    const params = [];

    if (filters.major && filters.major !== null && filters.major !== undefined) {
      conditions.push('s.major LIKE ?');
      const majorTerm = String(filters.major);
      params.push(`%${majorTerm}%`);
    }

    if (filters.search && filters.search !== null && filters.search !== undefined) {
      conditions.push('(u.name LIKE ? OR s.major LIKE ?)');
      const searchTerm = String(filters.search);
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY u.name LIMIT ?';
    const limit = parseInt(filters.limit) || 20;
    params.push(String(limit));

    return await executeQuery(query, params);
  }

  /**
   * Get booth information
   */
  static async getBooths(filters = {}) {
    let query = `
      SELECT 
        b.booth_id,
        b.booth_number,
        b.location_x,
        b.location_y,
        b.zone_type,
        b.shape_type,
        b.width,
        b.height,
        p.title as project_title,
        c.company_name
      FROM Booths b
      LEFT JOIN Projects p ON b.assigned_to_project = p.project_id
      LEFT JOIN Companies c ON b.assigned_to_company = c.company_id
    `;

    const conditions = [];
    const params = [];

    if (filters.zone_type && filters.zone_type !== null && filters.zone_type !== undefined) {
      conditions.push('b.zone_type = ?');
      params.push(String(filters.zone_type));
    }

    if (filters.booth_number && filters.booth_number !== null && filters.booth_number !== undefined) {
      conditions.push('b.booth_number = ?');
      params.push(String(filters.booth_number));
    }

    if (filters.assigned) {
      conditions.push('(b.assigned_to_project IS NOT NULL OR b.assigned_to_company IS NOT NULL)');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY b.booth_number LIMIT ?';
    const limit = parseInt(filters.limit) || 20;
    params.push(String(limit));

    return await executeQuery(query, params);
  }

  /**
   * Get feedback/ratings for an entity
   */
  static async getFeedback(entityId, entityType = null) {
    let query = `
      SELECT 
        f.feedback_id,
        f.rating,
        f.comment,
        f.created_at,
        u.name as user_name
      FROM Feedback f
      JOIN Users u ON f.user_id = u.user_id
      WHERE f.entity_id = ?
    `;

    const params = [String(entityId)];

    if (entityType) {
      query += ' AND f.entity_type = ?';
      params.push(String(entityType));
    }

    query += ' ORDER BY f.created_at DESC LIMIT 50';

    return await executeQuery(query, params);
  }

  /**
   * Get statistics - useful for general questions
   */
  static async getStatistics() {
    const stats = {};

    // Count approved projects (using parameterized query)
    const projectsResult = await executeQuery(
      "SELECT COUNT(*) as count, type FROM Projects WHERE status = ? GROUP BY type",
      ['approved']
    );
    stats.projects = projectsResult.data;

    // Count companies
    const companiesResult = await executeQuery(
      "SELECT COUNT(*) as count, type FROM Companies GROUP BY type"
    );
    stats.companies = companiesResult.data;

    // Count students
    const studentsResult = await executeQuery(
      "SELECT COUNT(*) as count FROM Students"
    );
    stats.totalStudents = studentsResult.data[0]?.count || 0;

    // Count total users
    const usersResult = await executeQuery(
      "SELECT COUNT(*) as count, role FROM Users GROUP BY role"
    );
    stats.users = usersResult.data;

    return { success: true, data: stats };
  }

  /**
   * Get count of companies
   */
  static async getCompanyCount(type = null) {
    let query = "SELECT COUNT(*) as count FROM Companies";
    const params = [];

    if (type) {
      query += " WHERE type = ?";
      params.push(String(type));
    }

    return await executeQuery(query, params);
  }

  /**
   * Get count of projects
   */
  static async getProjectCount(filters = {}) {
    let query = "SELECT COUNT(*) as count FROM Projects";
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(String(filters.status));
    } else {
      conditions.push('status = ?');
      params.push('approved');
    }

    if (filters.type) {
      conditions.push('type = ?');
      params.push(String(filters.type));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    return await executeQuery(query, params);
  }

  /**
   * Search across multiple entities
   */
  static async globalSearch(searchTerm) {
    const results = {
      projects: [],
      companies: [],
      students: []
    };

    // Search projects
    const projects = await this.getProjects({ search: searchTerm, limit: 5 });
    if (projects.success) results.projects = projects.data;

    // Search companies
    const companies = await this.getCompanies({ search: searchTerm, limit: 5 });
    if (companies.success) results.companies = companies.data;

    // Search students
    const students = await this.getStudents({ search: searchTerm, limit: 5 });
    if (students.success) results.students = students.data;

    return { success: true, data: results };
  }
}

module.exports = QueryBuilder;
