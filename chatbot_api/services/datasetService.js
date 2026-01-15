/**
 * Dataset Service
 *
 * This service loads and searches the static knowledge base (chatbot_dataset.json)
 * containing general information about the system, features, authentication, etc.
 *
 * The dataset complements the live database by providing:
 * - System architecture and technical details
 * - Authentication and authorization explanations
 * - Feature descriptions and how-to guides
 * - API endpoint documentation
 * - Mobile app functionality details
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage for the dataset
let knowledgeBase = [];

/**
 * Load the dataset from JSON file into memory
 * This is called once when the server starts
 */
export function loadDataset() {
  try {
    const datasetPath = path.join(__dirname, "../chatbot_dataset.json");
    const fileContent = fs.readFileSync(datasetPath, "utf-8");
    knowledgeBase = JSON.parse(fileContent);

    console.log(`✅ Loaded ${knowledgeBase.length} knowledge base entries`);
    return true;
  } catch (error) {
    console.error("❌ Error loading knowledge base:", error.message);
    return false;
  }
}

/**
 * Search the dataset by keywords
 * Returns relevant entries based on keyword matching in topic and content
 *
 * @param {string[]} keywords - Array of keywords to search for
 * @param {number} maxResults - Maximum number of results to return (default: 5)
 * @returns {Array} Array of matching knowledge base entries
 */
export function searchDataset(keywords = [], maxResults = 5) {
  if (!keywords || keywords.length === 0) {
    return [];
  }

  // Convert keywords to lowercase for case-insensitive search
  // Filter out undefined, null, or non-string values
  const lowerKeywords = keywords
    .filter((k) => k && typeof k === 'string')
    .map((k) => k.toLowerCase());

  // Return empty if no valid keywords after filtering
  if (lowerKeywords.length === 0) {
    return [];
  }

  // Score each entry based on keyword matches
  const scoredEntries = knowledgeBase.map((entry) => {
    let score = 0;
    // Safety checks for undefined fields
    const topicLower = (entry.topic || '').toLowerCase();
    const contentLower = (entry.content || '').toLowerCase();
    const categoryLower = (entry.category || '').toLowerCase();

    // Check each keyword
    lowerKeywords.forEach((keyword) => {
      // Topic match (highest weight)
      if (topicLower.includes(keyword)) {
        score += 10;
      }

      // Category match (high weight)
      if (categoryLower.includes(keyword)) {
        score += 5;
      }

      // Content match (medium weight)
      if (contentLower.includes(keyword)) {
        score += 3;
      }
    });

    return { entry, score };
  });

  // Filter entries with score > 0 and sort by score (descending)
  const relevantEntries = scoredEntries
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.entry);

  return relevantEntries;
}

/**
 * Search dataset by category
 * Useful for retrieving all entries in a specific category
 *
 * @param {string} category - Category to filter by
 * @returns {Array} Array of entries in the specified category
 */
export function searchByCategory(category) {
  if (!category) {
    return [];
  }

  const categoryLower = category.toLowerCase();
  return knowledgeBase.filter(
    (entry) => entry.category.toLowerCase() === categoryLower
  );
}

/**
 * Get all available categories in the dataset
 * Useful for understanding what topics are covered
 *
 * @returns {Array} Array of unique category names
 */
export function getCategories() {
  const categories = new Set(knowledgeBase.map((entry) => entry.category));
  return Array.from(categories);
}

/**
 * Search for entries related to specific topics
 * More targeted search for common question types
 *
 * @param {string} topicType - Type of topic (authentication, roles, features, etc.)
 * @returns {Array} Relevant entries
 */
export function searchByTopic(topicType) {
  const topicMappings = {
    authentication: [
      "authentication",
      "login",
      "jwt",
      "token",
      "password",
      "verification",
    ],
    roles: ["role", "student", "company", "visitor", "admin", "permissions"],
    features: ["features", "functionality", "capabilities"],
    database: ["database", "mysql", "model", "table", "query"],
    api: ["api", "endpoint", "route", "request", "response"],
    mobile: ["mobile", "app", "react native", "expo", "navigation"],
    security: ["security", "authorization", "rate limit", "validation"],
    files: ["file", "s3", "upload", "storage", "aws"],
    chat: ["chat", "firebase", "messaging", "conversation"],
  };

  const keywords = topicMappings[topicType.toLowerCase()] || [topicType];
  return searchDataset(keywords, 3);
}

/**
 * Get a summary of the knowledge base
 * Useful for statistics and debugging
 *
 * @returns {Object} Summary information
 */
export function getDatasetSummary() {
  const categories = getCategories();
  const categoryCounts = {};

  categories.forEach((cat) => {
    categoryCounts[cat] = knowledgeBase.filter(
      (e) => e.category === cat
    ).length;
  });

  return {
    totalEntries: knowledgeBase.length,
    categories: categories,
    categoryCounts: categoryCounts,
  };
}

/**
 * Format dataset entries for inclusion in AI prompts
 * Converts entries to readable text format
 *
 * @param {Array} entries - Dataset entries to format
 * @returns {string} Formatted text
 */
export function formatEntriesForPrompt(entries) {
  if (!entries || entries.length === 0) {
    return "";
  }

  return entries
    .map(
      (entry, index) =>
        `[Knowledge ${index + 1}] ${entry.topic}\n${entry.content}`
    )
    .join("\n\n");
}

export default {
  loadDataset,
  searchDataset,
  searchByCategory,
  searchByTopic,
  getCategories,
  getDatasetSummary,
  formatEntriesForPrompt,
};
