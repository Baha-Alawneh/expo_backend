import {
  DATABASE_SCHEMA,
  getSafeFields,
  isRestrictedTable,
  JOIN_PATTERNS,
  validateQuerySecurity,
} from "../config/databaseSchema.js";

/**
 * Secure Query Builder
 * Generates safe, read-only SQL queries based on schema definitions
 * Enforces security rules and prevents exposure of restricted data
 */

/**
 * Build a safe SELECT query with automatic security filtering
 * @param {Object} options - Query options
 * @param {string} options.table - Table name
 * @param {Array<string>} options.fields - Fields to select (optional, uses safe fields by default)
 * @param {Object} options.where - WHERE conditions (key-value pairs)
 * @param {Array<Object>} options.joins - JOIN definitions
 * @param {string} options.orderBy - ORDER BY clause
 * @param {number} options.limit - LIMIT clause
 * @returns {Object} { query: string, params: Array }
 */
export const buildSafeQuery = (options) => {
  const { table, fields, where, joins, orderBy, limit } = options;

  // Security check: prevent querying restricted tables directly
  if (isRestrictedTable(table)) {
    throw new Error(
      `Security violation: Cannot query restricted table '${table}'`
    );
  }

  // Get safe fields for this table
  const safeFields = fields || getSafeFields(table);

  if (safeFields.length === 0) {
    throw new Error(`No safe fields available for table '${table}'`);
  }

  // Build SELECT clause
  let selectClause = "";

  if (joins && joins.length > 0) {
    // When using joins, prefix table name to avoid ambiguity
    const mainTableFields = safeFields.map(
      (field) => `${table}.${field}`
    );
    selectClause = mainTableFields.join(", ");

    // Add fields from joined tables
    joins.forEach((join) => {
      if (join.selectFields && join.selectFields.length > 0) {
        const joinFields = join.selectFields.map(
          (field) => `${join.table}.${field}`
        );
        selectClause += ", " + joinFields.join(", ");
      }
    });
  } else {
    selectClause = safeFields.join(", ");
  }

  // Build JOIN clause
  let joinClause = "";
  if (joins && joins.length > 0) {
    joinClause = joins
      .map((join) => `${join.type} ${join.table} ON ${join.on}`)
      .join(" ");
  }

  // Build WHERE clause
  let whereClause = "";
  let params = [];

  if (where && Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map((key) => {
      const value = where[key];

      // Handle different comparison types
      if (typeof value === "object" && value !== null) {
        if (value.like) {
          params.push(`%${value.like}%`);
          return `LOWER(${key}) LIKE LOWER(?)`;
        } else if (value.in && Array.isArray(value.in)) {
          const placeholders = value.in.map(() => "?").join(",");
          params.push(...value.in);
          return `${key} IN (${placeholders})`;
        } else if (value.gt !== undefined) {
          params.push(value.gt);
          return `${key} > ?`;
        } else if (value.gte !== undefined) {
          params.push(value.gte);
          return `${key} >= ?`;
        } else if (value.lt !== undefined) {
          params.push(value.lt);
          return `${key} < ?`;
        } else if (value.lte !== undefined) {
          params.push(value.lte);
          return `${key} <= ?`;
        }
      } else {
        params.push(value);
        return `${key} = ?`;
      }
    });

    whereClause = "WHERE " + conditions.join(" AND ");
  }

  // Build ORDER BY clause
  let orderByClause = "";
  if (orderBy) {
    orderByClause = `ORDER BY ${orderBy}`;
  }

  // Build LIMIT clause
  let limitClause = "";
  if (limit) {
    limitClause = `LIMIT ${parseInt(limit)}`;
  }

  // Construct final query
  const query = `
    SELECT ${selectClause}
    FROM ${table}
    ${joinClause}
    ${whereClause}
    ${orderByClause}
    ${limitClause}
  `.trim().replace(/\s+/g, " ");

  // Security validation
  validateQuerySecurity(query, null);

  return { query, params };
};

/**
 * Build a query using a predefined JOIN pattern from schema
 * @param {string} patternName - Name of the pattern from JOIN_PATTERNS
 * @param {Object} options - Additional options (where, orderBy, limit)
 * @returns {Object} { query: string, params: Array }
 */
export const buildQueryFromPattern = (patternName, options = {}) => {
  const pattern = JOIN_PATTERNS[patternName];

  if (!pattern) {
    throw new Error(`Unknown join pattern: ${patternName}`);
  }

  const { where, orderBy, limit } = options;

  // Use pattern configuration
  const queryOptions = {
    table: pattern.from,
    joins: pattern.joins,
    where,
    orderBy,
    limit,
  };

  // If pattern has excludeFields, we'll filter them out after query
  return buildSafeQuery(queryOptions);
};

/**
 * Sanitize query results to remove any restricted fields
 * @param {Array|Object} results - Query results
 * @param {Array<string>} excludeFields - Fields to exclude
 * @returns {Array|Object} Sanitized results
 */
export const sanitizeResults = (results, excludeFields = []) => {
  // Default restricted fields to always exclude
  const defaultRestricted = [
    "password_hash",
    "password",
    "firebase_uid",
    "last_firebase_sync",
    "firebase_synced_at",
  ];

  const allRestricted = [...defaultRestricted, ...excludeFields];

  const sanitizeRow = (row) => {
    const sanitized = { ...row };
    allRestricted.forEach((field) => {
      delete sanitized[field];
    });
    return sanitized;
  };

  if (Array.isArray(results)) {
    return results.map(sanitizeRow);
  } else if (results && typeof results === "object") {
    return sanitizeRow(results);
  }

  return results;
};

/**
 * Build aggregation queries (COUNT, SUM, AVG, etc.)
 * @param {Object} options - Aggregation options
 * @param {string} options.table - Table name
 * @param {string} options.aggregation - Aggregation type (COUNT, SUM, AVG, MIN, MAX)
 * @param {string} options.field - Field to aggregate (use '*' for COUNT)
 * @param {Object} options.where - WHERE conditions
 * @param {string} options.groupBy - GROUP BY field
 * @returns {Object} { query: string, params: Array }
 */
export const buildAggregationQuery = (options) => {
  const { table, aggregation, field, where, groupBy } = options;

  // Security check
  if (isRestrictedTable(table)) {
    throw new Error(
      `Security violation: Cannot query restricted table '${table}'`
    );
  }

  // Build aggregation clause
  const aggField = field === "*" ? "*" : field;
  const selectClause = groupBy
    ? `${groupBy}, ${aggregation}(${aggField}) as ${aggregation.toLowerCase()}_value`
    : `${aggregation}(${aggField}) as ${aggregation.toLowerCase()}_value`;

  // Build WHERE clause
  let whereClause = "";
  let params = [];

  if (where && Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map((key) => {
      params.push(where[key]);
      return `${key} = ?`;
    });
    whereClause = "WHERE " + conditions.join(" AND ");
  }

  // Build GROUP BY clause
  let groupByClause = "";
  if (groupBy) {
    groupByClause = `GROUP BY ${groupBy}`;
  }

  const query = `
    SELECT ${selectClause}
    FROM ${table}
    ${whereClause}
    ${groupByClause}
  `.trim().replace(/\s+/g, " ");

  return { query, params };
};

/**
 * Build a search query across multiple fields with LIKE
 * @param {Object} options - Search options
 * @param {string} options.table - Table name
 * @param {Array<string>} options.searchFields - Fields to search in
 * @param {string} options.keyword - Search keyword
 * @param {Array<Object>} options.joins - JOIN definitions
 * @param {string} options.orderBy - ORDER BY clause
 * @param {number} options.limit - LIMIT clause
 * @returns {Object} { query: string, params: Array }
 */
export const buildSearchQuery = (options) => {
  const { table, searchFields, keyword, joins, orderBy, limit } = options;

  if (!searchFields || searchFields.length === 0) {
    throw new Error("Search fields are required");
  }

  // Security check
  if (isRestrictedTable(table)) {
    throw new Error(
      `Security violation: Cannot search restricted table '${table}'`
    );
  }

  // Get safe fields
  const safeFields = getSafeFields(table);

  // Build SELECT clause
  let selectClause = "";

  if (joins && joins.length > 0) {
    const mainTableFields = safeFields.map(
      (field) => `${table}.${field}`
    );
    selectClause = mainTableFields.join(", ");

    joins.forEach((join) => {
      if (join.selectFields && join.selectFields.length > 0) {
        const joinFields = join.selectFields.map(
          (field) => `${join.table}.${field}`
        );
        selectClause += ", " + joinFields.join(", ");
      }
    });
  } else {
    selectClause = safeFields.join(", ");
  }

  // Build JOIN clause
  let joinClause = "";
  if (joins && joins.length > 0) {
    joinClause = joins
      .map((join) => `${join.type} ${join.table} ON ${join.on}`)
      .join(" ");
  }

  // Build WHERE clause with LIKE conditions
  const searchTerm = `%${keyword}%`;
  const params = [];

  const searchConditions = searchFields.map((field) => {
    params.push(searchTerm);
    return `LOWER(${field}) LIKE LOWER(?)`;
  });

  const whereClause = "WHERE " + searchConditions.join(" OR ");

  // Build ORDER BY clause with relevance scoring
  let orderByClause = "";
  if (orderBy) {
    orderByClause = `ORDER BY ${orderBy}`;
  } else {
    // Default: order by relevance (field match priority)
    const relevanceCase = searchFields.map((field, index) => {
      params.push(searchTerm);
      return `WHEN LOWER(${field}) LIKE LOWER(?) THEN ${index + 1}`;
    });

    orderByClause = `ORDER BY CASE ${relevanceCase.join(" ")} ELSE ${
      searchFields.length + 1
    } END`;
  }

  // Build LIMIT clause
  let limitClause = "";
  if (limit) {
    limitClause = `LIMIT ${parseInt(limit)}`;
  }

  const query = `
    SELECT ${selectClause}
    FROM ${table}
    ${joinClause}
    ${whereClause}
    ${orderByClause}
    ${limitClause}
  `.trim().replace(/\s+/g, " ");

  // Security validation
  validateQuerySecurity(query, null);

  return { query, params };
};

export default {
  buildSafeQuery,
  buildQueryFromPattern,
  sanitizeResults,
  buildAggregationQuery,
  buildSearchQuery,
};
