import express from "express";
import {
  getDashboardStats,
  getPendingProjects,
  getProjectsByStatus,
  updateProjectStatus,
  getPendingOfferings,
  getPendingCompanies,
  getCompaniesByStatus,
  getOfferingsByStatus,
  updateOfferingStatus,
  updateCompanyStatus,
  sendNotification,
  getAllUsers,
  getUserRegistrations,
  getTopRatedProjects,
  getTopRatedOfferings,
  getTopRatedCompanies,
} from "../controllers/adminController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authenticateToken);

// Dashboard Statistics
router.get("/dashboard/stats", getDashboardStats);

// Pending Projects
router.get("/projects/pending", getPendingProjects);
router.get("/projects/status/:status", getProjectsByStatus);
router.patch("/projects/:project_id/status", updateProjectStatus);

// Pending Companies (new company approval workflow)
router.get("/companies/pending", getPendingCompanies);
router.get("/companies/status/:status", getCompaniesByStatus);
router.patch("/companies/:company_id/status", updateCompanyStatus);

// Pending Offerings (deprecated - redirects to companies)
router.get("/offerings/pending", getPendingOfferings);
router.get("/offerings/status/:status", getOfferingsByStatus);
router.patch("/offerings/:offering_id/status", updateOfferingStatus);

// Notifications
router.post("/notifications/send", sendNotification);
router.get("/users", getAllUsers);

// Analytics
router.get("/analytics/user-registrations", getUserRegistrations);
router.get("/analytics/top-projects", getTopRatedProjects);
router.get("/analytics/top-offerings", getTopRatedOfferings);
router.get("/analytics/top-companies", getTopRatedCompanies);

export default router;
