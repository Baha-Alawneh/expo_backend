const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System context for the chatbot
const SYSTEM_CONTEXT = `You are an intelligent assistant for a University Expo Platform chatbot. Your role is to:

1. Understand user questions about the expo, projects, companies, students, booths, and offerings
2. Extract intent and entities from user questions
3. Determine if a question requires database queries or can be answered from static data
4. ONLY answer questions related to the expo project - politely decline questions outside this scope

When analyzing a user question, return a JSON response with:
{
  "intent": "the type of query - e.g., 'list_projects', 'find_company', 'get_booth_info', 'general_info', 'out_of_scope'",
  "entities": {
    "entity_type": "value extracted from question",
    "filters": ["any filters like status, type, etc."]
  },
  "needsDatabase": true/false,
  "category": "projects|companies|students|booths|offerings|general|out_of_scope"
}

Example intents:
- list_projects: Show me approved projects → needsDatabase: TRUE
- count_projects: How many projects are there? → needsDatabase: TRUE
- count_companies: What is the number of companies? → needsDatabase: TRUE
- find_company: Tell me about companies offering internships → needsDatabase: TRUE
- get_booth_info: Where is booth B12 located? → needsDatabase: TRUE
- student_info: Show me students studying computer science → needsDatabase: TRUE
- offering_info: What services are companies offering? → needsDatabase: TRUE
- project_details: Tell me about a specific project → needsDatabase: TRUE
- general_info: What is this expo about? → needsDatabase: FALSE (use static data)
- general_info: When is the expo? → needsDatabase: FALSE (use static data)
- out_of_scope: Questions not related to expo → needsDatabase: FALSE

CRITICAL RULES:
- ANY question about counting, listing, finding, or getting information about projects, companies, students, booths, or offerings MUST have needsDatabase: true
- Questions with "how many", "number of", "count", "show", "list", "find", "tell me about" ALWAYS need database
- ONLY general expo information (what/when/where is the expo) uses needsDatabase: false
- Only extract information actually present in the user's question. Don't assume values.`;

/**
 * Analyze user question to extract intent and entities
 */
async function analyzeIntent(userQuestion) {
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      
      const prompt = `${SYSTEM_CONTEXT}

User Question: "${userQuestion}"

Analyze this question and return ONLY a JSON response (no markdown, no extra text) with the structure specified above.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean up response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Handle empty responses - retry once
      if (!text) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log('Empty response, retrying...');
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw new Error('Empty response from AI after retries');
      }
      
      const analysis = JSON.parse(text);
      return { success: true, data: analysis };
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error('Intent analysis error:', error.message);
        return {
          success: false,
          error: error.message,
          fallback: {
            intent: 'general_info',
            needsDatabase: false,
            category: 'general'
          }
        };
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

/**
 * Generate a natural language response from structured data
 */
async function generateResponse(data, userQuestion, context = {}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    let prompt = `You are a helpful assistant for a University Expo Platform. 

User asked: "${userQuestion}"

Data retrieved: ${JSON.stringify(data, null, 2)}

Generate a friendly, informative response based on this data. Keep it conversational and natural.
${context.isStaticData ? 'This is general information about the expo.' : 'This is live data from the database.'}

${data.length === 0 ? 'The data shows no results were found. Politely inform the user.' : ''}

Provide the response as plain text (no JSON, no markdown).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { success: true, data: response.text() };
  } catch (error) {
    console.error('Response generation error:', error.message);
    return {
      success: false,
      error: error.message,
      fallback: 'I found some information but had trouble formatting it. Please try rephrasing your question.'
    };
  }
}

/**
 * Generate SQL query from natural language
 */
async function generateSQLQuery(intent, entities, schema) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    const prompt = `You are a SQL query generator for the Expo database.

Intent: ${intent}
Entities: ${JSON.stringify(entities)}
Database Schema: ${JSON.stringify(schema, null, 2)}

Generate a safe, optimized SQL query to fulfill this intent.

RULES:
1. Only use tables and columns from the provided schema
2. Always use proper JOINs when accessing related tables
3. For approved items, add: WHERE status = 'approved'
4. Limit results to 20 unless specified otherwise
5. Use parameterized queries (use ? for values)
6. Return ONLY the SQL query (no explanation, no markdown)

Return JSON:
{
  "query": "SELECT ...",
  "params": [values for ? placeholders]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const queryData = JSON.parse(text);
    return { success: true, data: queryData };
  } catch (error) {
    console.error('SQL generation error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  analyzeIntent,
  generateResponse,
  generateSQLQuery
};
