import express from "express";
import {
  getAllCompaniesController,
  getApprovedCompaniesController,
  getCompanyController,
  getCompanyByIdController,
  getCompanyStatusController,
  updateCompanyController,
  uploadCompanyFileController,
  deleteCompanyFileController,
  getOfferingController,
  getOfferingByCompanyIdController,
  createOfferingController,
  updateOfferingController,
  deleteOfferingController,
  getUnassignedCompaniesController,
  assignBoothToCompanyController,
  unassignBoothFromCompanyController,
  getAllOfferingsController,
  uploadOfferingImagesController,
} from "../controllers/companyController.js";
import { upload } from "../config/multer.js";
import { authenticateToken, authorizeUser } from "../middleware/auth.js";
import { uploadRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Get all companies (for Companies tab)
router.get("/", authenticateToken, getAllCompaniesController);

// Get approved companies only (for Explore tab)
router.get("/approved", authenticateToken, getApprovedCompaniesController);

// Get company status by user_id
router.get("/status/:user_id", authenticateToken, getCompanyStatusController);

// Get company by company_id
router.get(
  "/:company_id",
  authenticateToken,
  getCompanyByIdController
);

// Get company profile by user_id
router.get("/profile/:user_id", authenticateToken, getCompanyController);

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

// Get all offerings (with optional sorting)
router.get("/offerings/all", authenticateToken, getAllOfferingsController);

// Offering routes
router.get(
  "/offering/:user_id",
  authenticateToken,
  authorizeUser,
  getOfferingController
);

// Get all offerings by company_id (public - for viewing other companies' offerings)
router.get(
  "/:company_id/offerings",
  authenticateToken,
  getOfferingController
);

// Get single offering by company_id (deprecated - use above for all offerings)
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
  "/offering/:user_id/:offering_id",
  authenticateToken,
  authorizeUser,
  updateOfferingController
);

router.delete(
  "/offering/:user_id/:offering_id",
  authenticateToken,
  authorizeUser,
  deleteOfferingController
);

// Booth assignment routes
router.get("/unassigned", authenticateToken, getUnassignedCompaniesController);
router.patch("/:company_id/assign-booth", authenticateToken, assignBoothToCompanyController);
router.patch("/:company_id/unassign-booth", authenticateToken, unassignBoothFromCompanyController);
// Upload offering images
router.post(
  "/offering/:user_id/:offering_id/upload",
  authenticateToken,
  authorizeUser,
  uploadRateLimiter,
  upload.fields([{ name: "images", maxCount: 10 }]),
  uploadOfferingImagesController
);

export default router;
