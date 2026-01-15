import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * OpenAI Service - Integrates with OpenAI GPT-4 API
 * Generates intelligent responses combining database results with AI knowledge
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Reusable prompt sections
const LANGUAGE_AND_SCOPE_INSTRUCTIONS = `LANGUAGE INSTRUCTION:
- Detect the language of the user's question
- If the question is in Arabic, respond in Arabic
- If the question is in English, respond in English
- Maintain natural, fluent language in the response

CRITICAL SCOPE RESTRICTION:
- You MUST ONLY answer questions related to the TEDI-Najah Expo system, its features, students, companies, projects, and platform functionality.
- You MUST NOT answer general knowledge questions, math problems, world facts, or any topic unrelated to this expo platform.
- If asked anything outside the expo scope in English, respond: "I'm sorry, I can only assist with questions about the TEDI-Najah Expo platform."
- If asked anything outside the expo scope in Arabic, respond: "عذراً، يمكنني المساعدة فقط في الأسئلة المتعلقة بمنصة معرض تيدي-النجاح."`;

/**
 * Create a prompt that combines user question with database results and dataset knowledge
 * @param {string} userQuestion - Original user question
 * @param {Object} dbResults - Results from database queries
 * @param {Array} datasetResults - Relevant entries from knowledge base
 * @param {Object} analysis - Query analysis result
 * @returns {string} Formatted prompt for GPT-4
 */
export const createPrompt = (
  userQuestion,
  dbResults,
  datasetResults,
  analysis
) => {
  let prompt = "";

  // Check if we have database results
  const hasDbResults =
    dbResults &&
    Object.values(dbResults).some(
      (result) => result && (Array.isArray(result) ? result.length > 0 : true)
    );

  const hasDatasetResults = datasetResults && datasetResults.length > 0;

  if (hasDbResults || hasDatasetResults) {
    // We have results - instruct GPT to use them
    prompt = `You are a helpful bilingual assistant (English and Arabic) for the TEDI-Najah Expo platform that connects students, companies, and visitors.

${LANGUAGE_AND_SCOPE_INSTRUCTIONS}

User Question: "${userQuestion}"`;

    if (hasDatasetResults) {
      prompt += `

System Knowledge Base:
${datasetResults
  .map((entry, i) => `[${i + 1}] ${entry.topic}:\n${entry.content}`)
  .join("\n\n")}`;
    }

    if (hasDbResults) {
      prompt += `

Live Database Results:
${JSON.stringify(dbResults, null, 2)}`;
    }

    prompt += `

Instructions:
1. LANGUAGE: Respond in the SAME language as the user's question (Arabic or English).
2. Answer the user's question using ONLY the knowledge base and database results provided above.
3. For system/technical questions (authentication, features, how-to), prioritize the System Knowledge Base.
4. For current data (specific projects, students, companies), prioritize the Live Database Results.
5. Be specific and reference actual data (project names, student names, technical details, etc.).
6. Format your response in a clear, conversational way in the appropriate language.
7. Combine information from both sources when relevant to give a complete answer.
8. CRITICAL: If the question seems unrelated to the expo platform (math, general knowledge, world facts), respond with the appropriate rejection message:
   - English: "I'm sorry, I can only assist with questions about the TEDI-Najah Expo platform."
   - Arabic: "عذراً، يمكنني المساعدة فقط في الأسئلة المتعلقة بمنصة معرض تيدي-النجاح."
9. Stay strictly within the expo platform scope - do not provide information about topics outside the system.
10. Use natural, fluent language appropriate to the user's language preference.

Answer:`;
  } else {
    // No results - inform user and provide general knowledge
    prompt = `You are a helpful bilingual assistant (English and Arabic) for the TEDI-Najah Expo platform that connects students, companies, and visitors.

${LANGUAGE_AND_SCOPE_INSTRUCTIONS}

User Question: "${userQuestion}"

Search Result: No matching data found in our current database or knowledge base.

Instructions:
1. Check if the question is related to the expo platform. If NOT, respond with the appropriate rejection message based on the language.
2. If it IS related but no data was found, politely inform the user that the specific information is not currently available.
3. Suggest what they might find in the expo platform (students' projects, company profiles, system features).
4. Provide helpful general information related to their question if appropriate and within expo scope.
5. Be friendly and encouraging.
6. NEVER answer questions about math, world facts, general knowledge, or topics outside the expo platform.
7. Match the response language to the question language.

Example (English): "I couldn't find that specific information in our current system. However, our platform typically features student projects in various categories, company profiles, authentication features, and more. Would you like to know about available features or explore current projects?"

Example (Arabic): "لم أتمكن من العثور على هذه المعلومات في نظامنا الحالي. ومع ذلك، تتضمن منصتنا عادةً مشاريع الطلاب في فئات مختلفة، وملفات الشركات، ومميزات التسجيل والدخول، والمزيد. هل ترغب في معرفة المزيد عن المميزات المتاحة أو استكشاف المشاريع الحالية؟"

Answer:`;
  }

  return prompt;
};

/**
 * Call OpenAI GPT-4 API to generate a response
 * @param {string} userQuestion - User's original question
 * @param {Object} dbResults - Database query results
 * @param {Array} datasetResults - Knowledge base entries
 * @param {Object} analysis - Query analysis
 * @returns {Promise<Object>} API response with generated answer
 */
export const generateResponse = async (
  userQuestion,
  dbResults,
  datasetResults,
  analysis
) => {
  try {
    // Check if API key is configured
    if (!OPENAI_API_KEY || OPENAI_API_KEY === "your_openai_api_key_here") {
      console.warn(
        "⚠️  OpenAI API key not configured. Using fallback response."
      );
      return {
        success: true,
        answer: generateFallbackResponse(
          userQuestion,
          dbResults,
          datasetResults,
          analysis
        ),
        source: "fallback",
        model: "none",
      };
    }

    // Create the prompt
    const prompt = createPrompt(
      userQuestion,
      dbResults,
      datasetResults,
      analysis
    );

    // Call OpenAI API
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4", // or "gpt-4-turbo-preview" or "gpt-3.5-turbo" for lower cost
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant for an expo platform. Provide clear, accurate, and friendly responses based on the system knowledge base and live database.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const answer = response.data.choices[0].message.content.trim();

    return {
      success: true,
      answer: answer,
      source: "openai",
      model: response.data.model,
      usage: response.data.usage,
    };
  } catch (error) {
    console.error(
      "Error calling OpenAI API:",
      error.response?.data || error.message
    );

    // Fallback to generated response if OpenAI fails
    return {
      success: true,
      answer: generateFallbackResponse(
        userQuestion,
        dbResults,
        datasetResults,
        analysis
      ),
      source: "fallback",
      error: error.response?.data?.error || error.message,
    };
  }
};

/**
 * Generate a fallback response without OpenAI (for when API is not available)
 * @param {string} userQuestion - User's question
 * @param {Object} dbResults - Database results
 * @param {Array} datasetResults - Knowledge base entries
 * @param {Object} analysis - Query analysis
 * @returns {string} Fallback response
 */
const generateFallbackResponse = (
  userQuestion,
  dbResults,
  datasetResults,
  analysis
) => {
  // Check if we have results
  const hasDbResults =
    dbResults &&
    Object.values(dbResults).some(
      (result) => result && (Array.isArray(result) ? result.length > 0 : true)
    );

  const hasDatasetResults = datasetResults && datasetResults.length > 0;

  if (!hasDbResults && !hasDatasetResults) {
    return `I searched our database and knowledge base but couldn't find specific information matching your query: "${userQuestion}". 

Our platform contains:
- Student projects, company profiles, and exhibition information (live data)
- System documentation, authentication details, and feature explanations (knowledge base)

You can ask me about:
- Available projects and their details
- Companies participating in the expo
- Student information and their works
- General statistics about the expo
- How authentication works
- System features and capabilities
- API endpoints and technical details

Would you like to explore any of these areas?`;
  }

  // Format response from available sources
  let response = `Here's what I found:\n\n`;

  // Add dataset knowledge first (for context/features)
  if (hasDatasetResults) {
    response += `**System Information:**\n\n`;
    datasetResults.forEach((entry, index) => {
      response += `**${entry.topic}**\n`;
      response += `${entry.content}\n\n`;
    });
  }

  // Then add database results (for current data)
  if (hasDbResults) {
    if (hasDatasetResults) {
      response += `**Current Data:**\n\n`;
    }

    Object.entries(dbResults).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        // Handle project results
        if (value[0].project_id) {
          response += `**Projects** (${value.length} found):\n`;
          value.slice(0, 5).forEach((project, index) => {
            response += `${index + 1}. **${project.title}**\n`;
            if (project.description) {
              response += `   Description: ${project.description.substring(
                0,
                100
              )}${project.description.length > 100 ? "..." : ""}\n`;
            }
            if (project.studentNames) {
              response += `   By: ${project.studentNames}\n`;
            }
            if (project.github_link) {
              response += `   GitHub: ${project.github_link}\n`;
            }
            response += `\n`;
          });
          if (value.length > 5) {
            response += `   ... and ${value.length - 5} more projects.\n\n`;
          }
        }
        // Handle company results
        else if (value[0].company_id) {
          response += `**Companies** (${value.length} found):\n`;
          value.slice(0, 5).forEach((company, index) => {
            response += `${index + 1}. **${
              company.company_name || "Unnamed Company"
            }**\n`;
            if (company.category) {
              response += `   Category: ${company.category}\n`;
            }
            if (company.description) {
              response += `   Description: ${company.description.substring(
                0,
                100
              )}${company.description.length > 100 ? "..." : ""}\n`;
            }
            if (company.booth_id) {
              response += `   Booth: ${company.booth_id}\n`;
            }
            response += `\n`;
          });
          if (value.length > 5) {
            response += `   ... and ${value.length - 5} more companies.\n\n`;
          }
        }
        // Handle student results
        else if (value[0].student_id) {
          response += `**Students** (${value.length} found):\n`;
          value.slice(0, 5).forEach((student, index) => {
            response += `${index + 1}. **${student.name}**\n`;
            if (student.major) {
              response += `   Major: ${student.major}\n`;
            }
            if (student.skills && student.skills.length > 0) {
              response += `   Skills: ${student.skills.join(", ")}\n`;
            }
            response += `\n`;
          });
          if (value.length > 5) {
            response += `   ... and ${value.length - 5} more students.\n\n`;
          }
        }
      } else if (typeof value === "object" && value !== null) {
        // Handle statistics
        if (value.totalProjects !== undefined) {
          response += `**Expo Statistics:**\n`;
          response += `- Total Projects: ${value.totalProjects}\n`;
          response += `- Total Companies: ${value.totalCompanies}\n`;
          response += `- Total Students: ${value.totalStudents}\n`;
          response += `- Projects with GitHub: ${value.projectsWithGithub}\n`;
          response += `- Projects with Video: ${value.projectsWithVideo}\n\n`;
        }
      }
    });
  }

  return response.trim();
};

/**
 * Simple response generator for testing without OpenAI
 * @param {string} userQuestion - User's question
 * @param {Object} dbResults - Database results
 * @param {Array} datasetResults - Knowledge base entries
 * @returns {Object} Simple response
 */
export const generateSimpleResponse = (
  userQuestion,
  dbResults,
  datasetResults
) => {
  return {
    success: true,
    answer: generateFallbackResponse(
      userQuestion,
      dbResults,
      datasetResults,
      {}
    ),
    source: "simple",
  };
};
