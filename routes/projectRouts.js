import express from "express";
import {
  getProjectController,
  updateProjectController,
  postProjectController,
  uploadProjectImagesController,
  getAllProjectsController,
  getAllExceptMyProjectController,
} from "../controllers/projectController.js";
import { upload } from "../config/multer.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { validateProjectData } from "../middleware/validation.js";
import { uploadRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Admin route - get all projects
router.get(
  "/",
  authenticateToken,
  getAllProjectsController
);

router.get(
  "/myproject/:user_id",
  authenticateToken,
  getProjectController
);
router.post(
  "/myproject/:user_id",
  authenticateToken,
  authorizeUser,
  validateProjectData,
  postProjectController
);
router.put(
  "/myproject/:user_id",
  authenticateToken,
  authorizeUser,
  validateProjectData,
  updateProjectController
);

// Upload project images
router.post(
  "/myproject/:user_id/upload",
  authenticateToken,
  authorizeUser,
  uploadRateLimiter,
  upload.fields([{ name: "images", maxCount: 10 }]),
  uploadProjectImagesController
);

// Get all projects
router.get("/all", authenticateToken, getAllProjectsController);

// Get all projects except current user's
router.get(
  "/all/except/:user_id",
  authenticateToken,
  authorizeUser,
  getAllExceptMyProjectController
);

export default router;
