import express from "express";
import {
  getAllCompaniesController,
  getCompanyController,
  updateCompanyController,
  uploadCompanyFileController,
  deleteCompanyFileController,
  getOfferingController,
  getOfferingByCompanyIdController,
  createOfferingController,
  updateOfferingController,
} from "../controllers/companyController.js";
import { upload } from "../config/multer.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { uploadRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Get all companies (for Companies tab)
router.get("/", authenticateToken, getAllCompaniesController);

// Get company profile by user_id
router.get(
  "/profile/:user_id",
  authenticateToken,
  authorizeUser,
  getCompanyController
);

// Get company by email (for viewing other companies' profiles)
router.get("/email/:email", authenticateToken, getCompanyController);

// Update company profile
router.put(
  "/profile/:user_id",
  authenticateToken,
  authorizeUser,
  updateCompanyController
);

// Upload company profile image
router.post(
  "/profile/:user_id/upload",
  authenticateToken,
  authorizeUser,
  uploadRateLimiter,
  upload.fields([{ name: "profile_image", maxCount: 1 }]),
  uploadCompanyFileController
);

// Delete company profile image
router.delete(
  "/profile/:user_id/file",
  authenticateToken,
  authorizeUser,
  deleteCompanyFileController
);

// Offering routes
router.get(
  "/offering/:user_id",
  authenticateToken,
  authorizeUser,
  getOfferingController
);

// Get offering by company_id (public - for viewing other companies' offerings)
router.get(
  "/offering/company/:company_id",
  authenticateToken,
  getOfferingByCompanyIdController
);

router.post(
  "/offering/:user_id",
  authenticateToken,
  authorizeUser,
  createOfferingController
);

router.put(
  "/offering/:user_id",
  authenticateToken,
  authorizeUser,
  updateOfferingController
);

export default router;
