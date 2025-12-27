import * as Feedback from "../models/Feedback.js";

/**
 * GET /feedback/project/:project_id
 * Get all feedback for a specific project
 */
export const getProjectFeedbackController = async (req, res) => {
  try {
    const { project_id } = req.params;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const feedback = await Feedback.getFeedbackByProjectId(project_id);
    const ratingStats = await Feedback.getProjectAverageRating(project_id);

    res.json({
      success: true,
      data: {
        feedback,
        ...ratingStats,
      },
    });
  } catch (error) {
    console.error("Error fetching project feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message,
    });
  }
};

/**
 * GET /feedback/offering/:offering_id
 * Get all feedback for a specific offering
 */
export const getOfferingFeedbackController = async (req, res) => {
  try {
    const { offering_id } = req.params;

    if (!offering_id) {
      return res.status(400).json({
        success: false,
        message: "Offering ID is required",
      });
    }

    const feedback = await Feedback.getFeedbackByOfferingId(offering_id);
    const ratingStats = await Feedback.getOfferingAverageRating(offering_id);

    res.json({
      success: true,
      data: {
        feedback,
        ...ratingStats,
      },
    });
  } catch (error) {
    console.error("Error fetching offering feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message,
    });
  }
};

/**
 * GET /feedback/user/project/:project_id
 * Get current user's feedback for a specific project
 */
export const getUserProjectFeedbackController = async (req, res) => {
  try {
    const { project_id } = req.params;
    const user_id = req.user.userId; // From authenticateToken middleware (JWT uses userId)

    if (!project_id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const feedback = await Feedback.getUserFeedbackForProject(
      user_id,
      project_id
    );

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("Error fetching user project feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message,
    });
  }
};

/**
 * GET /feedback/user/offering/:offering_id
 * Get current user's feedback for a specific offering
 */
export const getUserOfferingFeedbackController = async (req, res) => {
  try {
    const { offering_id } = req.params;
    const user_id = req.user.userId; // From authenticateToken middleware (JWT uses userId)

    if (!offering_id) {
      return res.status(400).json({
        success: false,
        message: "Offering ID is required",
      });
    }

    const feedback = await Feedback.getUserFeedbackForOffering(
      user_id,
      offering_id
    );

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("Error fetching user offering feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching feedback",
      error: error.message,
    });
  }
};

/**
 * POST /feedback/project/:project_id
 * Create or update feedback for a project
 */
export const createOrUpdateProjectFeedbackController = async (req, res) => {
  try {
    const { project_id } = req.params;
    const user_id = req.user.userId; // From authenticateToken middleware (JWT uses userId)
    const { rating, comment } = req.body;

    console.log("📝 Submitting feedback:", {
      user_id,
      project_id,
      rating,
      comment: comment || "",
    });
    console.log("📝 Project ID type:", typeof project_id, "Value:", project_id);
    console.log("📝 Request body:", req.body);
    console.log("📝 Request params:", req.params);

    if (!project_id) {
      console.log("❌ Error: Project ID is missing");
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Verify project exists
    if (project_id === "undefined" || project_id === "null") {
      console.log("❌ Error: Invalid project ID string:", project_id);
      return res.status(400).json({
        success: false,
        message: "Invalid project ID - received: " + project_id,
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      console.log("❌ Error: Invalid rating:", rating);
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if user has already rated this project
    const existingFeedback = await Feedback.getUserFeedbackForProject(
      user_id,
      project_id
    );

    // Ensure comment is a string or null, normalize empty strings to null
    const safeComment = comment && typeof comment === 'string' && comment.trim() !== "" 
      ? comment.trim() 
      : null;

    let result;
    if (existingFeedback) {
      // Update existing feedback
      result = await Feedback.updateFeedback(existingFeedback.feedback_id, {
        rating,
        comment: safeComment,
      });
    } else {
      // Create new feedback
      result = await Feedback.createFeedback({
        user_id,
        entity_id: project_id,
        entity_type: "project",
        rating,
        comment: safeComment,
      });
    }

    console.log("✅ Feedback saved successfully");

    res.json({
      success: true,
      message: existingFeedback
        ? "Feedback updated successfully"
        : "Feedback created successfully",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error creating/updating project feedback:", error);
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
    });

    // Return more specific error messages
    let errorMessage = "Error saving feedback";
    let statusCode = 500;

    if (error.message.includes("not found")) {
      errorMessage = error.message;
      statusCode = 404;
    } else if (error.message.includes("must be between")) {
      errorMessage = error.message;
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
    });
  }
};

/**
 * POST /feedback/offering/:offering_id
 * Create or update feedback for an offering
 */
export const createOrUpdateOfferingFeedbackController = async (req, res) => {
  try {
    const { offering_id } = req.params;
    const user_id = req.user.userId; // From authenticateToken middleware (JWT uses userId)
    const { rating, comment } = req.body;

    if (!offering_id) {
      return res.status(400).json({
        success: false,
        message: "Offering ID is required",
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Check if user has already rated this offering
    const existingFeedback = await Feedback.getUserFeedbackForOffering(
      user_id,
      offering_id
    );

    // Ensure comment is a string or null, normalize empty strings to null
    const safeComment = comment && typeof comment === 'string' && comment.trim() !== "" 
      ? comment.trim() 
      : null;

    let result;
    if (existingFeedback) {
      // Update existing feedback
      result = await Feedback.updateFeedback(existingFeedback.feedback_id, {
        rating,
        comment: safeComment,
      });
    } else {
      // Create new feedback
      result = await Feedback.createFeedback({
        user_id,
        entity_id: offering_id,
        entity_type: "offer",
        rating,
        comment: safeComment,
      });
    }

    res.json({
      success: true,
      message: existingFeedback
        ? "Feedback updated successfully"
        : "Feedback created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating/updating offering feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error saving feedback",
      error: error.message,
    });
  }
};

/**
 * DELETE /feedback/:feedback_id
 * Delete feedback (only if user owns it)
 */
export const deleteFeedbackController = async (req, res) => {
  try {
    const { feedback_id } = req.params;
    const user_id = req.user.userId; // From authenticateToken middleware (JWT uses userId)

    if (!feedback_id) {
      return res.status(400).json({
        success: false,
        message: "Feedback ID is required",
      });
    }

    // Get feedback to check ownership
    const feedback = await Feedback.getFeedbackById(feedback_id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    // Check if user owns this feedback
    if (feedback.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own feedback",
      });
    }

    await Feedback.deleteFeedback(feedback_id);

    res.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting feedback",
      error: error.message,
    });
  }
};
