import express from 'express';
import { getAllBuildings, getBuildingById, createBuilding, updateBuilding, batchUpdateBuildings, deleteBuilding } from '../controllers/buildingController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/buildings - Get all buildings
 * Public route - anyone can view buildings
 */
router.get('/', authenticateToken, getAllBuildings);

/**
 * GET /api/buildings/:id - Get a specific building by ID
 * Public route - anyone can view a building
 */
router.get('/:id', authenticateToken, getBuildingById);

/**
 * POST /api/buildings - Create a new building
 * Protected route - Admin only
 */
router.post('/', authenticateToken, requireAdmin, createBuilding);

/**
 * PATCH /api/buildings/batch - Batch update building positions
 * Protected route - Admin only
 */
router.patch('/batch', authenticateToken, requireAdmin, batchUpdateBuildings);

/**
 * PUT /api/buildings/:id - Update a building's position and dimensions
 * Protected route - Admin only
 */
router.put('/:id', authenticateToken, requireAdmin, updateBuilding);

/**
 * DELETE /api/buildings/:id - Delete a building
 * Protected route - Admin only
 */
router.delete('/:id', authenticateToken, requireAdmin, deleteBuilding);

export default router;
