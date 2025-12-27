import * as Booth from "../models/Booth.js";

/**
 * GET /booths
 * Get all booths with optional filters
 */
export const getAllBooths = async (req, res) => {
  try {
    const { layout_mode, zone_type, is_custom, unassigned } = req.query;

    const filters = {};
    if (layout_mode) filters.layout_mode = layout_mode;
    if (zone_type) filters.zone_type = zone_type;
    if (is_custom !== undefined) filters.is_custom = is_custom === 'true';
    if (unassigned === 'true') filters.unassigned = true;

    const booths = await Booth.findAll(filters);

    res.json({
      success: true,
      data: booths,
      count: booths.length
    });
  } catch (error) {
    console.error('Error fetching booths:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booths',
      error: error.message
    });
  }
};

/**
 * GET /booths/:id
 * Get single booth by ID
 */
export const getBoothById = async (req, res) => {
  try {
    const { id } = req.params;

    const booth = await Booth.findById(id);

    if (!booth) {
      return res.status(404).json({
        success: false,
        message: 'Booth not found'
      });
    }

    res.json({
      success: true,
      data: booth
    });
  } catch (error) {
    console.error('Error fetching booth:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booth',
      error: error.message
    });
  }
};

/**
 * POST /booths
 * Create new booth (Admin only)
 */
export const createBooth = async (req, res) => {
  try {
    const {
      booth_number,
      location_x,
      location_y,
      width,
      height,
      zone_type,
      shape_type,
      rotation,
      is_custom,
      layout_mode,
      booth_metadata
    } = req.body;

    // Validation
    if (!booth_number) {
      return res.status(400).json({
        success: false,
        message: 'Booth number is required'
      });
    }

    if (location_x === undefined || location_y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates (location_x, location_y) are required'
      });
    }

    // Create booth
    const newBooth = await Booth.create({
      booth_number,
      location_x,
      location_y,
      width,
      height,
      zone_type,
      shape_type,
      rotation,
      is_custom,
      layout_mode,
      booth_metadata
    });

    res.status(201).json({
      success: true,
      data: newBooth,
      message: 'Booth created successfully'
    });
  } catch (error) {
    console.error('Error creating booth:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating booth',
      error: error.message
    });
  }
};

/**
 * PUT /booths/:id
 * Update booth properties (Admin only)
 */
export const updateBooth = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if booth exists
    const existingBooth = await Booth.findById(id);
    if (!existingBooth) {
      return res.status(404).json({
        success: false,
        message: 'Booth not found'
      });
    }

    // Update booth
    const updatedBooth = await Booth.update(id, updates);

    res.json({
      success: true,
      data: updatedBooth,
      message: 'Booth updated successfully'
    });
  } catch (error) {
    console.error('Error updating booth:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booth',
      error: error.message
    });
  }
};

/**
 * DELETE /booths/:id
 * Delete booth (Admin only)
 */
export const deleteBooth = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await Booth.deleteBooth(id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting booth:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Cannot delete assigned booth')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error deleting booth',
      error: error.message
    });
  }
};

/**
 * PUT /booths/:id/assign
 * Assign booth to project or company (Admin only)
 */
export const assignBooth = async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, companyId } = req.body;

    // Validation - must assign to either project or company, not both
    if (!projectId && !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Either projectId or companyId must be provided'
      });
    }

    if (projectId && companyId) {
      return res.status(400).json({
        success: false,
        message: 'Booth can only be assigned to either a project OR a company, not both'
      });
    }

    // Check if booth exists
    const existingBooth = await Booth.findById(id);
    if (!existingBooth) {
      return res.status(404).json({
        success: false,
        message: 'Booth not found'
      });
    }

    // Assign to project or company
    let updatedBooth;
    if (projectId) {
      updatedBooth = await Booth.assignToProject(id, projectId);
    } else {
      updatedBooth = await Booth.assignToCompany(id, companyId);
    }

    res.json({
      success: true,
      data: updatedBooth,
      message: `Booth assigned to ${projectId ? 'project' : 'company'} successfully`
    });
  } catch (error) {
    console.error('Error assigning booth:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error assigning booth',
      error: error.message
    });
  }
};

/**
 * PUT /booths/:id/unassign
 * Unassign booth (Admin only)
 */
export const unassignBooth = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if booth exists
    const existingBooth = await Booth.findById(id);
    if (!existingBooth) {
      return res.status(404).json({
        success: false,
        message: 'Booth not found'
      });
    }

    const updatedBooth = await Booth.unassign(id);

    res.json({
      success: true,
      data: updatedBooth,
      message: 'Booth unassigned successfully'
    });
  } catch (error) {
    console.error('Error unassigning booth:', error);
    res.status(500).json({
      success: false,
      message: 'Error unassigning booth',
      error: error.message
    });
  }
};

/**
 * GET /booths/next-custom-number
 * Get next available custom booth number (C-1, C-2, etc.)
 */
export const getNextCustomBoothNumber = async (req, res) => {
  try {
    const nextNumber = await Booth.getNextCustomBoothNumber();

    res.json({
      success: true,
      data: { next_booth_number: nextNumber }
    });
  } catch (error) {
    console.error('Error getting next custom booth number:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting next custom booth number',
      error: error.message
    });
  }
};
