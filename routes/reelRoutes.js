import express from "express";
import {
  createReelController,
  getAllReelsController,
  getUserReelsController,
  getReelByIdController,
  deleteReelController,
  updateReelDescriptionController,
} from "../controllers/reelController.js";
import { upload } from "../config/multer.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { uploadRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Get all reels (public feed) - accessible to all authenticated users
router.get("/", authenticateToken, getAllReelsController);

// Get a specific reel by ID
router.get("/:reel_id", authenticateToken, getReelByIdController);

// Get reels by user ID
router.get("/user/:user_id", authenticateToken, getUserReelsController);

// Create a new reel (upload video)
router.post(
  "/:user_id/upload",
  authenticateToken,
  authorizeUser,
  uploadRateLimiter,
  upload.single("video"),
  createReelController
);

// Update reel description
router.put(
  "/:reel_id/description",
  authenticateToken,
  updateReelDescriptionController
);

// Delete a reel
router.delete("/:reel_id", authenticateToken, deleteReelController);

export default router;
