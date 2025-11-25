import express from "express";
import {
  getStudentController,
  updateStudentController,
  uploadStudentFilesController,
  deleteStudentFileController,
} from "../controllers/studentController.js";
import { upload } from "../config/multer.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { validateStudentUpdate } from "../middleware/validation.js";
import { uploadRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get(
  "/profile/:user_id",
  authenticateToken,
  authorizeUser,
  getStudentController
);

// Get student by email (for viewing other students' profiles)
router.get("/email/:email", authenticateToken, getStudentController);

router.put(
  "/profile/:user_id",
  authenticateToken,
  authorizeUser,
  validateStudentUpdate,
  updateStudentController
);

// Upload student photo and/or CV
router.post(
  "/profile/:user_id/upload",
  authenticateToken,
  authorizeUser,
  uploadRateLimiter,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "cv", maxCount: 1 },
  ]),
  uploadStudentFilesController
);

// Delete student photo or CV
router.delete(
  "/profile/:user_id/file",
  authenticateToken,
  authorizeUser,
  deleteStudentFileController
);

export default router;
