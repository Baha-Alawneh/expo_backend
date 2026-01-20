import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "JWT_SECRET",
  "MYSQL_HOST",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "MYSQL_DATABASE",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "S3_BUCKET_NAME",
  "EMAIL_USER",
  "EMAIL_PASS",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  process.exit(1);
}

import "./config/db.js"; // Import to test database connection
import userRoutes from "./routes/userRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import projectRoutes from "./routes/projectRouts.js";
import companyRoutes from "./routes/companyRoutes.js";
import boothRoutes from "./routes/boothRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import borderRoutes from "./routes/borders.routes.js";
import buildingRoutes from "./routes/buildings.routes.js";
import reelRoutes from "./routes/reelRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

const app = express();

// CORS configuration - restrict to specific origins in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*", // Set CORS_ORIGIN in .env for production
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parser with size limit
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API versioning
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1", boothRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/borders", borderRoutes);
app.use("/api/v1/buildings", buildingRoutes);
app.use("/api/v1/reels", reelRoutes);
app.use("/api/v1", jobRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Expo Backend API is running 🚀",
    version: "1.0.0",
    endpoints: {
      users: "/api/v1/users",
      students: "/api/v1/students",
      projects: "/api/v1/projects",
      companies: "/api/v1/companies",
      jobs: "/api/v1/jobs",
      feedback: "/api/v1/feedback",
      chats: "/api/v1/chats",
      admin: "/api/v1/admin",
      reels: "/api/v1/reels",
      health: "/health",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size exceeds the 10MB limit",
    });
  }

  // Multer file type error
  if (err.message && err.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network access available`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/`);
});
