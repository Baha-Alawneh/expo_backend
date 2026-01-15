/**
 * Query Analyzer - Intelligent NLP-based query parser
 * Analyzes user questions to determine intent and extract relevant keywords
 */

/**
 * Check if a query is out-of-scope (not related to the TEDI-Najah Expo project)
 * @param {string} query - User's question
 * @returns {boolean} True if out-of-scope, false if valid project-related query
 */
export const isOutOfScope = (query) => {
  const lowerQuery = query.toLowerCase().trim();

  // Out-of-scope indicators (general knowledge, math, world facts, etc.)
  const outOfScopeIndicators = [
    // Math and calculations (very specific patterns) - English & Arabic
    /\bwhat (?:is|are|equals?) \d+\s*[\+\-\*\/\^]\s*\d+/i,
    /كم|ما هو|احسب.*\d+\s*[\+\-\*\/\^]\s*\d+/i,
    /\bcalculate\b.*\d+/i,
    /\bsquare root of \d+/i,
    /\bsolve.*equation/i,
    /الجذر التربيعي/i,
    /احسب|حساب.*معادلة/i,

    // General world knowledge (specific patterns) - English & Arabic
    /\bcapital of\b/i,
    /عاصمة|عاصمه/i,
    /\bpresident of\b/i,
    /رئيس.*دولة|رئيس.*بلد/i,
    /\bpopulation of\b/i,
    /عدد سكان/i,
    /\bwho (?:is|was) (?:the )?\w+(?! (?:student|company|developer))/i,
    /\bwho invented\b/i,
    /من اخترع|من اكتشف/i,
    /\bwho discovered\b/i,
    /\bwhen (?:did|was|were).*(?:born|died|invented|discovered)/i,
    /متى.*(?:ولد|توفي|اخترع|اكتشف)/i,

    // Science and general facts - English & Arabic
    /\bsolar system\b/i,
    /المجموعة الشمسية|النظام الشمسي/i,
    /\batom.*proton.*neutron/i,
    /\bperiodic table/i,
    /الجدول الدوري/i,

    // Entertainment (specific) - English & Arabic
    /\b(?:movie|film).*(?:actor|actress|director)/i,
    /\bwho won.*(?:oscar|grammy|award)/i,
    /\bnetflix.*(?:show|series)/i,
    /فيلم.*ممثل/i,
    /مسلسل.*نتفليكس/i,

    // Sports (specific) - English & Arabic
    /\bworld cup.*won/i,
    /كأس العالم.*فاز/i,
    /\bolympics.*medal/i,
    /الأولمبياد.*ميدالية/i,
    /\b(?:football|basketball|soccer) team/i,
    /فريق.*(?:كرة القدم|كرة السلة)/i,

    // Food and cooking - English & Arabic
    /\brecipe for\b/i,
    /وصفة.*(?:طبخ|طعام)/i,
    /\bhow to cook\b/i,
    /كيف.*(?:طبخ|اطبخ)/i,

    // Weather - English & Arabic
    /\bweather (?:today|tomorrow|forecast)/i,
    /\btemperature in\b/i,
    /الطقس.*(?:اليوم|غدا)/i,
    /درجة الحرارة في/i,

    // Philosophy and general advice - English & Arabic
    /\bmeaning of life\b/i,
    /معنى الحياة/i,
  ];

  // Check if query has CLEAR out-of-scope indicators
  const hasOutOfScopeIndicator = outOfScopeIndicators.some((pattern) =>
    pattern.test(lowerQuery)
  );

  // If it has a clear out-of-scope indicator, reject it
  if (hasOutOfScopeIndicator) {
    return true;
  }

  // Otherwise, allow the query to proceed
  // (Let the system and OpenAI handle determining if it's relevant)
  return false;
};

/**
 * Analyze user query to determine intent and extract keywords
 * @param {string} query - User's question
 * @returns {Object} Analysis result with intent, keywords, and metadata
 */
export const analyzeQuery = (query) => {
  const lowerQuery = query.toLowerCase().trim();

  // Initialize result object
  const result = {
    originalQuery: query,
    intent: "general", // general, project_search, company_search, student_search, statistics, offering_search, feedback_search, booth_search
    keywords: [],
    requiresDatabase: false,
    requiresDataset: false,
    datasetTopic: null, // For targeted dataset searches
    searchType: null, // null, 'all', 'specific', 'student', 'keyword'
    entities: {
      projectNames: [],
      studentNames: [],
      companyNames: [],
      offeringNames: [],
      skills: [],
      majors: [],
      categories: [],
      boothNumbers: [],
    },
  };

  // Extract potential names (capitalized words or quoted strings)
  const namePattern = /["']([^"']+)["']|([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const matches = [...query.matchAll(namePattern)];
  const potentialNames = matches.map((m) => m[1] || m[2]).filter(Boolean);

  // Intent detection patterns
  const intentPatterns = {
    // Project-related queries
    project_search: [
      /project/i,
      /projects/i,
      /portfolio/i,
      /work/i,
      /built/i,
      /created/i,
      /developed/i,
      /github/i,
      /video/i,
      /demo/i,
    ],

    // Company-related queries
    company_search: [
      /company/i,
      /companies/i,
      /business/i,
      /booth/i,
      /vendor/i,
      /sponsor/i,
      /organization/i,
    ],

    // Offering-related queries
    offering_search: [
      /offering/i,
      /offerings/i,
      /product/i,
      /products/i,
      /service/i,
      /services/i,
      /sell/i,
      /selling/i,
      /price/i,
      /pricing/i,
      /what.*company.*offer/i,
    ],

    // Feedback and ratings queries
    feedback_search: [
      /feedback/i,
      /rating/i,
      /ratings/i,
      /review/i,
      /reviews/i,
      /comment/i,
      /comments/i,
      /rated/i,
    ],

    // Booth location queries
    booth_search: [
      /booth/i,
      /location/i,
      /where is/i,
      /find.*booth/i,
      /booth number/i,
      /assigned to/i,
    ],

    // Student-related queries
    student_search: [
      /student/i,
      /students/i,
      /developer/i,
      /participant/i,
      /team member/i,
      /by/i,
      /major/i,
      /skill/i,
    ],

    // Statistics queries
    statistics: [
      /how many/i,
      /count/i,
      /number of/i,
      /total/i,
      /statistics/i,
      /stats/i,
      /overview/i,
    ],
  };

  // Dataset-specific patterns (system/feature questions)
  const datasetPatterns = {
    authentication: [
      /authentication/i,
      /auth/i,
      /login/i,
      /sign in/i,
      /sign up/i,
      /register/i,
      /jwt/i,
      /token/i,
      /password/i,
      /verification/i,
      /verify/i,
    ],
    roles: [
      /role/i,
      /permission/i,
      /access/i,
      /admin/i,
      /what can.*do/i,
      /user type/i,
    ],
    features: [
      /feature/i,
      /functionality/i,
      /capabilities/i,
      /what does.*do/i,
      /how does.*work/i,
      /how to/i,
    ],
    api: [/api/i, /endpoint/i, /route/i, /request/i, /backend/i],
    database: [/database/i, /model/i, /schema/i, /table/i, /mysql/i],
    mobile: [
      /mobile/i,
      /app/i,
      /expo/i,
      /react native/i,
      /navigation/i,
      /screen/i,
    ],
    security: [
      /security/i,
      /authorization/i,
      /rate limit/i,
      /validation/i,
      /cors/i,
    ],
    files: [
      /file/i,
      /upload/i,
      /s3/i,
      /storage/i,
      /aws/i,
      /image/i,
      /photo/i,
      /cv/i,
      /pdf/i,
    ],
    chat: [/chat/i, /messaging/i, /firebase/i, /conversation/i, /message/i],
  };

  // Check for dataset topics first
  for (const [topic, patterns] of Object.entries(datasetPatterns)) {
    if (patterns.some((pattern) => pattern.test(lowerQuery))) {
      result.requiresDataset = true;
      result.datasetTopic = topic;
      // Don't break - might also need database
    }
  }

  // Detect intent - Check entity-specific patterns BEFORE generic statistics
  // This ensures "how many companies" gets company_search intent, not just statistics
  const hasCompanyContext = /company|companies|business|firm/i.test(lowerQuery);
  const hasProjectContext = /project|projects|work|works/i.test(lowerQuery);
  const hasStudentContext = /student|students/i.test(lowerQuery);
  const hasOfferingContext = /offering|offerings|service|services|product|products/i.test(lowerQuery);
  const isCountQuery = /how many|count|number of|total|statistics/i.test(lowerQuery);
  
  // Flag to prevent searchType from being overwritten
  let searchTypeLocked = false;
  
  // Check for general company/project/student listing queries
  const isGeneralListQuery = /(?:companies?|projects?|students?|offerings?)\s+(?:participating|in|at|available|enrolled|registered)/i.test(lowerQuery) ||
                            /(?:list|show|tell|give).*(?:all|the)\s*(?:companies?|projects?|students?)/i.test(lowerQuery);
  
  // If it's a count query OR general list query with specific entity context, prioritize entity intent
  if ((isCountQuery || isGeneralListQuery) && hasCompanyContext) {
    result.intent = "company_search";
    result.requiresDatabase = true;
    result.searchType = "all"; // We need all companies to count/list them
    searchTypeLocked = true; // Lock searchType to prevent overwriting
  } else if ((isCountQuery || isGeneralListQuery) && hasProjectContext) {
    result.intent = "project_search";
    result.requiresDatabase = true;
    result.searchType = "all";
    searchTypeLocked = true;
  } else if ((isCountQuery || isGeneralListQuery) && hasStudentContext) {
    result.intent = "student_search";
    result.requiresDatabase = true;
    result.searchType = "all";
    searchTypeLocked = true;
  } else if ((isCountQuery || isGeneralListQuery) && hasOfferingContext) {
    result.intent = "offering_search";
    result.requiresDatabase = true;
    result.searchType = "all";
    searchTypeLocked = true;
  } else {
    // Standard intent detection
    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some((pattern) => pattern.test(lowerQuery))) {
        result.intent = intent;
        result.requiresDatabase = true;
        break;
      }
    }
  }

  // If no specific database intent detected but dataset topic found, keep as general
  if (!result.requiresDatabase && result.requiresDataset) {
    result.intent = "general";
  }

  // Detect search type with improved logic (skip if searchType already locked)
  if (!searchTypeLocked) {
    // Check for "by student" queries first
    if (
      /\bby\b|\bcreated by\b|\bmade by\b|\bfrom\b|\bauthored by\b/i.test(
        lowerQuery
      )
    ) {
      result.searchType = "student";
      result.entities.studentNames = potentialNames;
    }
    // Check for topic/keyword-specific queries (must come before general checks)
    // But exclude "tell me about THE projects" (general request)
    else if (
      /related to|regarding|concerning|on|involving|for|with/i.test(lowerQuery) ||
      (/\babout\b/i.test(lowerQuery) &&
        !/tell.*about\s+the\s+projects?/i.test(lowerQuery))
    ) {
      result.searchType = "keyword";
    }
    // Check for explicit "all" requests
    else if (/\ball\b|\bevery\b|\blist\b|\\bshow me all/i.test(lowerQuery)) {
      result.searchType = "all";
    }
    // Check for general questions that should return all (e.g., "What projects do you have?")
    // BUT only if they don't contain technical terms that would indicate a specific topic
    else if (result.intent === "project_search") {
      // Quick check for common technical terms to avoid false "all" classification
      const quickTechCheck =
        /\b(web|mobile|app|ios|android|react|angular|vue|python|java|javascript|node|ai|ml|robot|robotic|robotics|automation|blockchain|game|unity|cloud|aws|database|sql|frontend|backend|development)\b/i;
      const hasTechnicalTerms = quickTechCheck.test(lowerQuery);

      // General patterns that should return ALL projects (only if no technical terms)
      const isGeneralRequest =
        /what.*(?:projects?|works?).*(?:have|available|exist)/i.test(
          lowerQuery
        ) ||
        /(?:do you have|are there|got any).*projects?/i.test(lowerQuery) ||
        /show.*projects?(?!\s+(?:about|related|involving|on|for|with))/i.test(
          lowerQuery
        ) ||
        /tell.*about\s+the\s+projects?/i.test(lowerQuery) ||
        /give.*projects?/i.test(lowerQuery);

      if (isGeneralRequest && !hasTechnicalTerms) {
        result.searchType = "all";
      } else if (hasTechnicalTerms) {
        // Has technical terms, use keyword search
        result.searchType = "keyword";
      }
      // If neither, will be caught by final else if below
    }
    // Check for specific project names
    else if (potentialNames.length > 0 && !/related to|about/i.test(lowerQuery)) {
      result.searchType = "specific";
      if (result.intent === "project_search") {
        result.entities.projectNames = potentialNames;
      } else if (result.intent === "company_search") {
        result.entities.companyNames = potentialNames;
      }
    }
    // If project_search intent but no clear type matched, check if meaningful keywords exist
    else if (result.intent === "project_search") {
      const genericWords = ["project", "projects", "work", "works", "portfolio"];
      const meaningfulKeywords = result.keywords.filter(
        (keyword) => !genericWords.includes(keyword.toLowerCase())
      );

      // Check if query contains technical terms/skills
      const hasTechnicalTerms =
        result.entities.skills && result.entities.skills.length > 0;

      // If we have technical terms or meaningful keywords that aren't just pronouns, use keyword search
      const nonPronouns = meaningfulKeywords.filter(
        (kw) => !["you", "any", "there"].includes(kw)
      );

      if (hasTechnicalTerms || nonPronouns.length > 0) {
        result.searchType = "keyword";
      } else {
        result.searchType = "all";
      }
    } else {
      result.searchType = "keyword";
    }
  }

  // Extract keywords (meaningful words, excluding stop words)
  const stopWords = [
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "about",
    "tell",
    "me",
    "what",
    "when",
    "where",
    "who",
    "which",
    "how",
    "show",
    "give",
    "find",
    "get",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
  ];

  const words = lowerQuery
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));

  // Technical terms for skill detection (consolidated)
  const technicalTerms = new Set([
    "react", "node", "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", "php", "ruby", "swift", "kotlin",
    "angular", "vue", "django", "flask", "spring", "express", "nextjs", "gatsby", "svelte",
    "mobile", "ios", "android", "flutter", "expo",
    "web", "frontend", "backend", "fullstack", "api", "rest", "graphql",
    "ai", "ml", "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "robot", "robotic", "robotics", "automation", "autonomous", "iot", "embedded", "arduino",
    "database", "sql", "mysql", "postgresql", "mongodb", "redis", "data", "analytics",
    "cloud", "aws", "azure", "docker", "kubernetes", "devops",
    "security", "cybersecurity", "authentication", "encryption",
    "game", "unity", "unreal", "3d", "vr", "ar", "blockchain", "crypto"
  ]);

  result.keywords = [...new Set(words)];

  // Extract skills (any keyword that matches technical terms)
  result.entities.skills = result.keywords.filter(keyword =>
    Array.from(technicalTerms).some(term => 
      keyword.toLowerCase().includes(term.toLowerCase()) || 
      term.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  return result;
};

/**
 * Determine which database queries to execute based on analysis
 * @param {Object} analysis - Result from analyzeQuery
 * @returns {Object} Query plan with database operations
 */
export const createQueryPlan = (analysis) => {
  const plan = {
    operations: [],
    datasetSearch: null,
    needsDatabase: analysis.requiresDatabase,
    needsDataset: analysis.requiresDataset,
    fallbackToAI: !analysis.requiresDatabase && !analysis.requiresDataset,
  };

  // Add dataset search if needed
  if (analysis.requiresDataset) {
    plan.datasetSearch = {
      topic: analysis.datasetTopic,
      keywords: analysis.keywords,
    };
  }

  if (!analysis.requiresDatabase) {
    return plan;
  }

  // Based on intent and search type, determine operations
  switch (analysis.intent) {
    case "project_search":
      if (analysis.searchType === "all") {
        plan.operations.push({ type: "getAllProjects", params: {} });
      } else if (analysis.searchType === "student") {
        if (analysis.entities.studentNames.length > 0) {
          analysis.entities.studentNames.forEach((name) => {
            plan.operations.push({
              type: "getProjectsByStudent",
              params: { studentName: name },
            });
          });
        } else {
          // No student name found, return all projects
          plan.operations.push({ type: "getAllProjects", params: {} });
        }
      } else if (analysis.searchType === "specific") {
        // Search by specific project names
        const searchTerms = analysis.entities.projectNames;
        if (searchTerms.length > 0) {
          searchTerms.forEach((term) => {
            plan.operations.push({
              type: "searchProjects",
              params: { keyword: term },
            });
          });
        } else {
          plan.operations.push({ type: "getAllProjects", params: {} });
        }
      } else if (analysis.searchType === "keyword") {
        // Filter out generic words that won't help search
        const genericWords = [
          "project",
          "projects",
          "work",
          "works",
          "portfolio",
          "there",
          "any",
          "some",
          "related",
        ];

        // Prioritize technical terms/skills over other keywords
        const technicalKeywords = analysis.entities.skills || [];
        const otherKeywords = analysis.keywords.filter(
          (keyword) =>
            !genericWords.includes(keyword.toLowerCase()) &&
            !technicalKeywords.includes(keyword)
        );

        // Combine: technical terms first, then other meaningful keywords
        const meaningfulKeywords = [...technicalKeywords, ...otherKeywords];

        if (meaningfulKeywords.length > 0) {
          // Use top meaningful keywords for search
          const searchTerms = meaningfulKeywords.slice(0, 3);

          // Remove duplicates and search
          const uniqueTerms = [...new Set(searchTerms)];
          uniqueTerms.forEach((term) => {
            plan.operations.push({
              type: "searchProjects",
              params: { keyword: term },
            });
          });
        } else {
          // No meaningful keywords, return all projects
          plan.operations.push({ type: "getAllProjects", params: {} });
        }
      } else {
        // Fallback: return all projects
        plan.operations.push({ type: "getAllProjects", params: {} });
      }
      break;

    case "company_search":
      if (analysis.searchType === "all") {
        plan.operations.push({ type: "getAllCompanies", params: {} });
      } else if (analysis.entities.categories.length > 0) {
        // Search by category
        analysis.entities.categories.forEach((category) => {
          plan.operations.push({
            type: "getCompaniesByCategory",
            params: { category },
          });
        });
      } else {
        const searchTerms = [
          ...analysis.entities.companyNames,
          ...analysis.keywords.slice(0, 3),
        ];
        searchTerms.forEach((term) => {
          plan.operations.push({
            type: "searchCompanies",
            params: { keyword: term },
          });
        });
      }
      break;

    case "offering_search":
      if (analysis.searchType === "all") {
        plan.operations.push({ type: "getAllOfferings", params: {} });
      } else if (analysis.entities.companyNames.length > 0) {
        // Get offerings by company
        analysis.entities.companyNames.forEach((companyName) => {
          plan.operations.push({
            type: "getOfferingsByCompany",
            params: { companyName },
          });
        });
      } else {
        // Search offerings by keyword
        const searchTerms = [
          ...analysis.entities.offeringNames,
          ...analysis.keywords.slice(0, 3),
        ];
        searchTerms.forEach((term) => {
          plan.operations.push({
            type: "searchOfferings",
            params: { keyword: term },
          });
        });
      }
      break;

    case "feedback_search":
      // Feedback queries - will need entity type and ID specified
      plan.operations.push({ type: "getEnhancedStatistics", params: {} });
      break;

    case "booth_search":
      if (analysis.entities.boothNumbers.length > 0) {
        analysis.entities.boothNumbers.forEach((boothNumber) => {
          plan.operations.push({
            type: "getBoothInfo",
            params: { boothNumber },
          });
        });
      } else {
        // General booth query - return statistics
        plan.operations.push({ type: "getEnhancedStatistics", params: {} });
      }
      break;

    case "student_search":
      if (analysis.searchType === "all") {
        plan.operations.push({ type: "getAllStudents", params: {} });
      } else if (analysis.entities.skills.length > 0) {
        // Search students by skill
        analysis.entities.skills.forEach((skill) => {
          plan.operations.push({
            type: "searchStudentsBySkill",
            params: { skill },
          });
        });
      } else if (analysis.entities.majors.length > 0) {
        // Get projects by major (indirect student search)
        analysis.entities.majors.forEach((major) => {
          plan.operations.push({
            type: "getProjectsByMajor",
            params: { major },
          });
        });
      } else {
        plan.operations.push({ type: "getAllStudents", params: {} });
      }
      break;

    case "statistics":
      plan.operations.push({ type: "getEnhancedStatistics", params: {} });
      break;

    default:
      // General query - try to find relevant data
      plan.operations.push({ type: "getEnhancedStatistics", params: {} });
      if (analysis.keywords.length > 0) {
        plan.operations.push({
          type: "searchProjects",
          params: { keyword: analysis.keywords[0] },
        });
      }
  }

  return plan;
};

/**
 * Format user-friendly explanation of what was found
 * @param {Object} analysis - Query analysis
 * @param {Object} dbResults - Database results
 * @returns {string} Human-readable summary
 */
export const formatResultsSummary = (analysis, dbResults) => {
  let summary = "";

  if (!dbResults || Object.keys(dbResults).length === 0) {
    return "No relevant data found in the database.";
  }

  // Count total results
  let totalProjects = 0;
  let totalCompanies = 0;
  let totalStudents = 0;

  Object.values(dbResults).forEach((result) => {
    if (Array.isArray(result)) {
      totalProjects += result.filter((r) => r.project_id).length;
      totalCompanies += result.filter((r) => r.company_id).length;
      totalStudents += result.filter((r) => r.student_id).length;
    }
  });

  if (totalProjects > 0) {
    summary += `Found ${totalProjects} project${
      totalProjects > 1 ? "s" : ""
    }. `;
  }
  if (totalCompanies > 0) {
    summary += `Found ${totalCompanies} company/companies. `;
  }
  if (totalStudents > 0) {
    summary += `Found ${totalStudents} student${
      totalStudents > 1 ? "s" : ""
    }. `;
  }

  if (!summary) {
    summary = "Retrieved statistics and general information.";
  }

  return summary.trim();
};
