import express from 'express';
import {
  getAllBooths,
  getBoothById,
  createBooth,
  updateBooth,
  deleteBooth,
  assignBooth,
  unassignBooth,
  getNextCustomBoothNumber
} from '../controllers/boothController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// Public Routes (Anyone can view booths)
// ============================================

// Get all booths with optional filters
// Query params: ?layout_mode=default&zone_type=engineering&unassigned=true
router.get('/booths', getAllBooths);

// Get single booth by ID
router.get('/booths/:id', getBoothById);

// ============================================
// Admin-Only Routes (Create, Update, Delete, Assign)
// ============================================

// Create new booth
router.post('/booths', authenticateToken, authorizeRole('admin'), createBooth);

// Update booth properties (location, size, zone, etc.)
router.put('/booths/:id', authenticateToken, authorizeRole('admin'), updateBooth);

// Delete booth
router.delete('/booths/:id', authenticateToken, authorizeRole('admin'), deleteBooth);

// Assign booth to project or company
router.put('/booths/:id/assign', authenticateToken, authorizeRole('admin'), assignBooth);

// Unassign booth
router.put('/booths/:id/unassign', authenticateToken, authorizeRole('admin'), unassignBooth);

// Get next available custom booth number (C-1, C-2, ...)
router.get('/booths-util/next-custom-number', authenticateToken, authorizeRole('admin'), getNextCustomBoothNumber);

export default router;
