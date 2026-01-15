import express from "express";
import {
  analyzeQuery,
  createQueryPlan,
  formatResultsSummary,
  isOutOfScope,
} from "../services/queryAnalyzer.js";
import * as dbService from "../services/databaseService.js";
import * as datasetService from "../services/datasetService.js";
import {
  generateResponse,
  generateSimpleResponse,
} from "../services/openaiService.js";

const router = express.Router();

/**
 * POST /api/chatbot/chat
 * Main chatbot endpoint - receives a question and returns an intelligent answer
 *
 * Request body:
 * {
 *   "question": "string - User's question",
 *   "useOpenAI": "boolean (optional) - Whether to use OpenAI or fallback response"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "question": "Original question",
 *   "answer": "Generated answer",
 *   "analysis": { intent, keywords, etc. },
 *   "databaseResults": { results from queries },
 *   "metadata": { processing info }
 * }
 */
router.post("/chat", async (req, res) => {
  try {
    const { question, useOpenAI = true } = req.body;

    // Validate input
    if (
      !question ||
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Question is required and must be a non-empty string",
      });
    }

    const startTime = Date.now();

    // Step 0: Check if query is out-of-scope
    console.log("🔍 Checking query scope...");
    if (isOutOfScope(question)) {
      console.log("❌ Query is out-of-scope");
      
      // Detect if the question is in Arabic
      const isArabic = /[\u0600-\u06FF]/.test(question);
      
      const rejectionMessage = isArabic
        ? "عذراً، لا أستطيع الإجابة على هذا السؤال لأنني روبوت محادثة مصمم خصيصاً لمعرض تيدي-النجاح. يمكنني مساعدتك في:\n\n• مشاريع الطلاب وملفاتهم\n• الشركات وعروضها\n• مميزات وخصائص المنصة\n• التسجيل والدخول والمحادثات\n• التنقل وكيفية استخدام النظام\n\nمن فضلك اسألني شيئاً متعلقاً بمنصة المعرض!"
        : "I'm sorry, I can't answer this question because I'm a chatbot designed specifically for TEDI-Najah Expo. I can help you with information about:\n\n• Student projects and portfolios\n• Companies and their offerings\n• Expo features and system functionality\n• Authentication, chat, and other platform features\n• Navigation and how to use the system\n\nPlease ask me something related to the expo platform!";
      
      return res.json({
        success: true,
        question: question,
        answer: rejectionMessage,
        analysis: {
          intent: "out_of_scope",
          isOutOfScope: true,
        },
        metadata: {
          processingTime: Date.now() - startTime,
          outOfScope: true,
        },
      });
    }

    // Step 1: Analyze the query
    console.log("📝 Analyzing query:", question);
    const analysis = analyzeQuery(question);
    console.log("🔍 Analysis:", JSON.stringify(analysis, null, 2));

    // Step 2: Create query plan
    const queryPlan = createQueryPlan(analysis);
    console.log("📋 Query plan:", JSON.stringify(queryPlan, null, 2));

    // Step 3: Search knowledge base (dataset)
    let datasetResults = [];

    if (queryPlan.needsDataset && queryPlan.datasetSearch) {
      console.log("📚 Searching knowledge base...");

      if (queryPlan.datasetSearch.topic) {
        // Search by specific topic
        datasetResults = datasetService.searchByTopic(
          queryPlan.datasetSearch.topic
        );
      } else if (
        queryPlan.datasetSearch.keywords &&
        queryPlan.datasetSearch.keywords.length > 0
      ) {
        // Search by keywords - filter out any undefined values
        const validKeywords = queryPlan.datasetSearch.keywords.filter(
          (k) => k && typeof k === 'string'
        );
        
        if (validKeywords.length > 0) {
          datasetResults = datasetService.searchDataset(validKeywords, 3);
        }
      }

      console.log(`✅ Found ${datasetResults.length} knowledge base entries`);
    }

    // Step 4: Execute database queries
    let databaseResults = {};

    if (queryPlan.needsDatabase && queryPlan.operations.length > 0) {
      console.log("🗄️  Executing database queries...");

      for (const operation of queryPlan.operations) {
        try {
          let result = null;

          switch (operation.type) {
            case "getAllProjects":
              result = await dbService.getAllProjects();
              break;
            case "searchProjects":
              result = await dbService.searchProjects(operation.params.keyword);
              break;
            case "getProjectsByStudent":
              result = await dbService.getProjectsByStudent(
                operation.params.studentName
              );
              break;
            case "getProjectsByMajor":
              result = await dbService.getProjectsByMajor(
                operation.params.major
              );
              break;
            case "getAllCompanies":
              result = await dbService.getAllCompanies();
              break;
            case "searchCompanies":
              result = await dbService.searchCompanies(
                operation.params.keyword
              );
              break;
            case "getCompaniesByCategory":
              result = await dbService.getCompaniesByCategory(
                operation.params.category
              );
              break;
            case "getAllStudents":
              result = await dbService.getAllStudents();
              break;
            case "searchStudentsBySkill":
              result = await dbService.searchStudentsBySkill(
                operation.params.skill
              );
              break;
            case "getAllOfferings":
              result = await dbService.getAllOfferings();
              break;
            case "searchOfferings":
              result = await dbService.searchOfferings(
                operation.params.keyword
              );
              break;
            case "getOfferingsByCompany":
              result = await dbService.getOfferingsByCompany(
                operation.params.companyName
              );
              break;
            case "getBoothInfo":
              result = await dbService.getBoothInfo(
                operation.params.boothNumber
              );
              break;
            case "getStatistics":
              result = await dbService.getStatistics();
              break;
            case "getEnhancedStatistics":
              result = await dbService.getEnhancedStatistics();
              break;
            default:
              console.warn("Unknown operation type:", operation.type);
          }

          if (result !== null) {
            databaseResults[operation.type] = result;
          }
        } catch (error) {
          console.error(`Error executing ${operation.type}:`, error);
          // Continue with other operations even if one fails
        }
      }

      console.log("✅ Database queries completed");
    }

    // Step 5: Generate response with both sources
    console.log("🤖 Generating response...");
    let responseData;

    if (useOpenAI) {
      responseData = await generateResponse(
        question,
        databaseResults,
        datasetResults,
        analysis
      );
    } else {
      responseData = generateSimpleResponse(
        question,
        databaseResults,
        datasetResults
      );
    }

    // Step 6: Format summary
    const resultsSummary = formatResultsSummary(analysis, databaseResults);

    const processingTime = Date.now() - startTime;

    // Return complete response
    res.json({
      success: true,
      question: question,
      answer: responseData.answer,
      analysis: {
        intent: analysis.intent,
        requiresDatabase: analysis.requiresDatabase,
        requiresDataset: analysis.requiresDataset,
        datasetTopic: analysis.datasetTopic,
        searchType: analysis.searchType,
        keywords: analysis.keywords,
        entities: analysis.entities,
      },
      databaseResults: databaseResults,
      datasetResults: datasetResults.map((entry) => ({
        topic: entry.topic,
        category: entry.category,
        contentPreview: entry.content.substring(0, 150) + "...",
      })),
      resultsSummary: resultsSummary,
      metadata: {
        processingTime: `${processingTime}ms`,
        responseSource: responseData.source,
        model: responseData.model || "none",
        databaseResultsCount: Object.keys(databaseResults).length,
        datasetResultsCount: datasetResults.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    res.status(500).json({
      success: false,
      message: "Error processing your question",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * POST /api/chatbot/analyze
 * Analyze a query without generating a full response (useful for debugging)
 *
 * Request body:
 * {
 *   "question": "string - User's question"
 * }
 */
router.post("/analyze", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const analysis = analyzeQuery(question);
    const queryPlan = createQueryPlan(analysis);

    res.json({
      success: true,
      question: question,
      analysis: analysis,
      queryPlan: queryPlan,
    });
  } catch (error) {
    console.error("Error analyzing query:", error);
    res.status(500).json({
      success: false,
      message: "Error analyzing query",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/chatbot/stats
 * Get database statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await dbService.getStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
    });
  }
});

export default router;
