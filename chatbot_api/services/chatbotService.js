const { analyzeIntent, generateResponse } = require('../utils/gemini');
const QueryBuilder = require('../utils/queryBuilder');
const expoInfo = require('../data/expo_info.json');
const faqs = require('../data/faqs.json');
const databaseSchema = require('../data/database_schema.json');

console.log(`🤖 Using AI Provider: Google Gemini (Cloud)`);

/**
 * Main Chatbot Service - Coordinates all chatbot operations
 */
class ChatbotService {
  
  /**
   * Process a user message and return an appropriate response
   */
  static async processMessage(userMessage) {
    try {
      console.log(`\n📩 Processing: "${userMessage}"`);

      // Analyze user intent with Gemini AI
      const intentResult = await analyzeIntent(userMessage);
      
      if (!intentResult.success) {
        console.error('Intent analysis failed:', intentResult.error);
        return this.getErrorResponse('I had trouble understanding your question. Please try rephrasing it.');
      }

      const { intent, entities, needsDatabase, category } = intentResult.data;
      console.log(`🎯 Intent: ${intent}, Category: ${category}, Needs DB: ${needsDatabase}`);

      // Step 2: Check if question is out of scope
      if (category === 'out_of_scope' || intent === 'out_of_scope') {
        return this.getOutOfScopeResponse();
      }

      // Step 3: Handle general questions from static data
      if (!needsDatabase || category === 'general') {
        return await this.handleStaticDataQuery(userMessage, intent, category);
      }

      // Step 4: Handle database queries
      return await this.handleDatabaseQuery(userMessage, intent, entities, category);

    } catch (error) {
      console.error('❌ Chatbot processing error:', error);
      return this.getErrorResponse('I encountered an error processing your request. Please try again.');
    }
  }

  /**
   * Handle queries that can be answered from static data (FAQs, expo info)
   */
  static async handleStaticDataQuery(userMessage, intent, category) {
    try {
      // Search FAQs first
      const faqAnswer = this.searchFAQs(userMessage);
      if (faqAnswer) {
        console.log('✓ Answered from FAQs');
        return {
          success: true,
          message: faqAnswer,
          source: 'faq',
          data: null
        };
      }

      // Return expo general information
      let data = null;
      
      if (userMessage.toLowerCase().includes('what') && userMessage.toLowerCase().includes('expo')) {
        data = expoInfo.expo_overview;
      } else if (userMessage.toLowerCase().includes('feature')) {
        data = expoInfo.features;
      } else if (userMessage.toLowerCase().includes('role') || userMessage.toLowerCase().includes('user')) {
        data = expoInfo.user_types;
      } else if (userMessage.toLowerCase().includes('booth') && userMessage.toLowerCase().includes('zone')) {
        data = expoInfo.booth_zones;
      } else {
        data = expoInfo.expo_overview;
      }

      const responseResult = await generateResponse(data, userMessage, { isStaticData: true });
      
      return {
        success: true,
        message: responseResult.success ? responseResult.data : this.formatStaticData(data),
        source: 'static_data',
        data: data
      };

    } catch (error) {
      console.error('Static data query error:', error);
      return this.getErrorResponse('I found some information but had trouble formatting it.');
    }
  }

  /**
   * Handle queries that require database access
   */
  static async handleDatabaseQuery(userMessage, intent, entities, category) {
    try {
      let queryResult = null;

      // Route to appropriate query based on category and intent
      switch (category) {
        case 'projects':
          queryResult = await this.handleProjectQuery(intent, entities, userMessage);
          break;
        
        case 'companies':
          queryResult = await this.handleCompanyQuery(intent, entities, userMessage);
          break;
        
        case 'students':
          queryResult = await this.handleStudentQuery(intent, entities);
          break;
        
        case 'booths':
          queryResult = await this.handleBoothQuery(intent, entities);
          break;
        
        case 'offerings':
          queryResult = await this.handleOfferingQuery(intent, entities);
          break;
        
        default:
          // Try global search
          const searchTerm = this.extractSearchTerm(userMessage);
          queryResult = await QueryBuilder.globalSearch(searchTerm);
      }

      if (!queryResult || !queryResult.success) {
        return this.getErrorResponse('I had trouble accessing the database. Please try again.');
      }

      // Generate natural language response from database results using Gemini
      const resultCount = Array.isArray(queryResult.data) 
        ? queryResult.data.length 
        : (queryResult.data?.count || 0);
      console.log(`✅ Found ${resultCount} results`);
      
      const responseResult = await generateResponse(queryResult.data, userMessage, {
        isStaticData: false,
        category: category,
        intent: intent,
        count: resultCount
      });

      const responseMessage = responseResult.success 
        ? responseResult.data 
        : this.formatDatabaseResults(queryResult.data, category);

      return {
        success: true,
        message: responseMessage,
        source: 'database',
        data: queryResult.data,
        metadata: {
          count: resultCount,
          category: category,
          intent: intent
        }
      };

    } catch (error) {
      console.error('Database query error:', error);
      return this.getErrorResponse('I had trouble retrieving the information from the database.');
    }
  }

  /**
   * Handle project-related queries
   */
  static async handleProjectQuery(intent, entities, userMessage = '') {
    // Check if user is asking for count/number
    const isCountQuery = intent.includes('count') || 
                         intent.includes('number') || 
                         intent === 'statistics' ||
                         userMessage.toLowerCase().includes('how many') ||
                         userMessage.toLowerCase().includes('number of') ||
                         userMessage.toLowerCase().includes('count');
    
    if (isCountQuery) {
      const filters = {
        status: entities.status || 'approved'
      };
      
      if (entities.type) {
        filters.type = entities.type;
      }
      
      const countResult = await QueryBuilder.getProjectCount(filters);
      
      if (countResult.success) {
        return {
          success: true,
          data: {
            count: countResult.data[0]?.count || 0,
            type: filters.type,
            status: filters.status,
            message: `There are ${countResult.data[0]?.count || 0} ${filters.status} projects${filters.type ? ` of type ${filters.type}` : ''} in the expo.`
          }
        };
      }
      return countResult;
    }

    const filters = {
      status: 'approved', // Only show approved projects by default
      limit: entities.limit || 20
    };
    
    if (entities.type) {
      filters.type = entities.type;
    }
    
    if (entities.search) {
      filters.search = entities.search;
    }

    return await QueryBuilder.getProjects(filters);
  }

  /**
   * Handle company-related queries
   */
  static async handleCompanyQuery(intent, entities, userMessage = '') {
    // Check if user is asking for count/number
    const isCountQuery = intent.includes('count') || 
                         intent.includes('number') || 
                         intent === 'statistics' ||
                         userMessage.toLowerCase().includes('how many') ||
                         userMessage.toLowerCase().includes('number of') ||
                         userMessage.toLowerCase().includes('count');
    
    if (isCountQuery) {
      const type = entities.type || null;
      const countResult = await QueryBuilder.getCompanyCount(type);
      
      if (countResult.success) {
        return {
          success: true,
          data: {
            count: countResult.data[0]?.count || 0,
            type: type,
            message: `There are ${countResult.data[0]?.count || 0} companies${type ? ` of type ${type}` : ''} in the expo.`
          }
        };
      }
      return countResult;
    }

    const filters = {
      limit: entities.limit || 20
    };
    
    if (entities.type) {
      filters.type = entities.type;
    }
    
    if (entities.search) {
      filters.search = entities.search;
    }

    return await QueryBuilder.getCompanies(filters);
  }

  /**
   * Handle student-related queries
   */
  static async handleStudentQuery(intent, entities) {
    const filters = {
      limit: entities.limit || 20
    };
    
    if (entities.major) {
      filters.major = entities.major;
    }
    
    if (entities.search) {
      filters.search = entities.search;
    }

    return await QueryBuilder.getStudents(filters);
  }

  /**
   * Handle booth-related queries
   */
  static async handleBoothQuery(intent, entities) {
    const filters = {
      limit: entities.limit || 20
    };
    
    if (entities.zone_type) {
      filters.zone_type = entities.zone_type;
    }
    
    if (entities.booth_number) {
      filters.booth_number = entities.booth_number;
    }
    
    if (entities.assigned !== undefined && entities.assigned !== null) {
      filters.assigned = entities.assigned;
    }

    return await QueryBuilder.getBooths(filters);
  }

  /**
   * Handle offering-related queries
   */
  static async handleOfferingQuery(intent, entities) {
    const filters = {
      status: 'approved', // Only show approved offerings
      limit: entities.limit || 20
    };
    
    if (entities.companyId) {
      filters.companyId = entities.companyId;
    }
    
    if (entities.search) {
      filters.search = entities.search;
    }

    return await QueryBuilder.getOfferings(filters);
  }

  /**
   * Search through FAQs for matching answers
   */
  static searchFAQs(question) {
    const lowerQuestion = question.toLowerCase();
    
    // Search general FAQs
    for (const faq of faqs.general_faqs) {
      if (lowerQuestion.includes(faq.question.toLowerCase()) ||
          this.similarityMatch(lowerQuestion, faq.question.toLowerCase())) {
        return faq.answer;
      }
    }

    // Search technical FAQs
    for (const faq of faqs.technical_faqs) {
      if (lowerQuestion.includes(faq.question.toLowerCase()) ||
          this.similarityMatch(lowerQuestion, faq.question.toLowerCase())) {
        return faq.answer;
      }
    }

    return null;
  }

  /**
   * Simple similarity matching for FAQ questions
   */
  static similarityMatch(question, faqQuestion) {
    const questionWords = question.split(' ').filter(w => w.length > 3);
    const faqWords = faqQuestion.split(' ').filter(w => w.length > 3);
    
    let matches = 0;
    for (const word of questionWords) {
      if (faqWords.some(fw => fw.includes(word) || word.includes(fw))) {
        matches++;
      }
    }

    return matches >= 3; // At least 3 matching words
  }

  /**
   * Extract search terms from user message
   */
  static extractSearchTerm(message) {
    // Remove common question words
    const cleanMessage = message
      .toLowerCase()
      .replace(/\b(what|where|when|who|how|show|tell|find|get|list|about|me|the|a|an|is|are)\b/g, '')
      .trim();
    
    return cleanMessage || message;
  }

  /**
   * Format static data into readable text
   */
  static formatStaticData(data) {
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  }

  /**
   * Format database results into readable text (fallback)
   */
  static formatDatabaseResults(data, category) {
    if (Array.isArray(data) && data.length === 0) {
      return `I couldn't find any ${category} matching your criteria.`;
    }

    if (Array.isArray(data)) {
      return `I found ${data.length} result(s) in the ${category} category.`;
    }

    return 'Here is the information I found.';
  }

  /**
   * Get out of scope response
   */
  static getOutOfScopeResponse() {
    return {
      success: true,
      message: "I'm sorry, but I can only answer questions related to the University Expo project. I can help you with information about projects, companies, students, booths, offerings, and general expo details. Please ask me something about the expo!",
      source: 'system',
      data: null
    };
  }

  /**
   * Get error response
   */
  static getErrorResponse(message) {
    return {
      success: false,
      message: message,
      source: 'error',
      data: null
    };
  }
}

module.exports = ChatbotService;
