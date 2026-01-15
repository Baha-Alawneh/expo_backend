import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatbotRoutes from "./routes/chatbot.js";
import { loadDataset } from "./services/datasetService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/chatbot", chatbotRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Chatbot API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Expo Chatbot API 🤖",
    version: "1.0.0",
    endpoints: {
      chat: "POST /api/chatbot/chat - Send a question and get an answer",
      analyze:
        "POST /api/chatbot/analyze - Analyze a query without generating response",
      health: "GET /health - Check API health",
    },
    documentation: "See README.md for detailed usage instructions",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🤖 Chatbot API running on http://localhost:${PORT}`);
  console.log(`📡 Network access available`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/`);

  // Load knowledge base on startup
  console.log("\n📚 Loading knowledge base...");
  const loaded = loadDataset();
  if (!loaded) {
    console.warn(
      "⚠️  Warning: Knowledge base failed to load. System/feature questions may not work properly."
    );
  }
});
