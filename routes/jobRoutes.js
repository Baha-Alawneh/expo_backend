import express from "express";
import {
  createJobOfferController,
  getAllJobOffersController,
  getCompanyJobOffersController,
  getJobOfferByIdController,
  updateJobOfferController,
  deleteJobOfferController,
  toggleJobStatusController,
  applyToJobController,
  getJobApplicationsController,
  getMyApplicationsController,
  getCompanyApplicationsController,
  checkApplicationStatusController,
  downloadCVController
} from "../controllers/jobController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// ==================== JOB OFFERS ROUTES ====================

// Public routes
router.get("/jobs/all", authenticateToken, getAllJobOffersController);
router.get("/jobs/:job_id", authenticateToken, getJobOfferByIdController);

// Company routes - Job management
router.post("/jobs", authenticateToken, createJobOfferController);
router.get("/jobs/company/my-jobs", authenticateToken, getCompanyJobOffersController);
router.put("/jobs/:job_id", authenticateToken, updateJobOfferController);
router.delete("/jobs/:job_id", authenticateToken, deleteJobOfferController);
router.patch("/jobs/:job_id/toggle-status", authenticateToken, toggleJobStatusController);

// ==================== JOB APPLICATIONS ROUTES ====================

// Student routes - Apply to jobs
router.post("/jobs/:job_id/apply", (req, res, next) => {
  console.log('=== Raw Request Debug ===');
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  console.log('Raw body:', req.rawBody);
  console.log('=========================');
  next();
}, authenticateToken, applyToJobController);
router.get("/applications/my-applications", authenticateToken, getMyApplicationsController);
router.get("/jobs/:job_id/check-application", authenticateToken, checkApplicationStatusController);

// Company routes - Review applications
router.get("/jobs/:job_id/applications", authenticateToken, getJobApplicationsController);
router.get("/applications/company/all", authenticateToken, getCompanyApplicationsController);

// CV Download
router.get("/applications/:application_id/download-cv", authenticateToken, downloadCVController);

export default router;
