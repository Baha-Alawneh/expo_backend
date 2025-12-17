import express from "express";
import {
  getProjectFeedbackController,
  getOfferingFeedbackController,
  getUserProjectFeedbackController,
  getUserOfferingFeedbackController,
  createOrUpdateProjectFeedbackController,
  createOrUpdateOfferingFeedbackController,
  deleteFeedbackController,
} from "../controllers/feedbackController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get all feedback for a project (public)
router.get("/project/:project_id", getProjectFeedbackController);

// Get all feedback for an offering (public)
router.get("/offering/:offering_id", getOfferingFeedbackController);

// Get current user's feedback for a project (authenticated)
router.get(
  "/user/project/:project_id",
  authenticateToken,
  getUserProjectFeedbackController
);

// Get current user's feedback for an offering (authenticated)
router.get(
  "/user/offering/:offering_id",
  authenticateToken,
  getUserOfferingFeedbackController
);

// Create or update feedback for a project (authenticated)
router.post(
  "/project/:project_id",
  authenticateToken,
  createOrUpdateProjectFeedbackController
);

// Create or update feedback for an offering (authenticated)
router.post(
  "/offering/:offering_id",
  authenticateToken,
  createOrUpdateOfferingFeedbackController
);

// Delete feedback (authenticated)
router.delete("/:feedback_id", authenticateToken, deleteFeedbackController);

export default router;
