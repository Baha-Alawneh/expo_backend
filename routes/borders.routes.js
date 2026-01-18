import express from 'express';
import * as borderController from '../controllers/borderController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Border Routes
 * All routes require authentication
 * Write operations (POST, PUT, DELETE) require admin privileges
 */

// Get all borders
router.get('/', authenticateToken, borderController.getAllBorders);

// Get single border by ID
router.get('/:id', authenticateToken, borderController.getBorderById);

// Create new border (admin only)
router.post('/', authenticateToken, requireAdmin, borderController.createBorder);

// Check collision with booths (admin only)
router.post('/check-collision', authenticateToken, requireAdmin, borderController.checkCollision);

// Update border (admin only)
router.put('/:id', authenticateToken, requireAdmin, borderController.updateBorder);

// Delete border (admin only)
router.delete('/:id', authenticateToken, requireAdmin, borderController.deleteBorder);

export default router;
