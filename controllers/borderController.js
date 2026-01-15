import Border from '../models/Border.js';

/**
 * Border Controller
 * Handles border CRUD operations
 */

/**
 * Get all borders
 * @route GET /api/v1/borders
 */
export const getAllBorders = async (req, res) => {
  try {
    const borders = await Border.getAll();
    
    res.status(200).json({
      success: true,
      count: borders.length,
      data: borders
    });
  } catch (error) {
    console.error('Error fetching borders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch borders',
      error: error.message
    });
  }
};

/**
 * Get single border by ID
 * @route GET /api/v1/borders/:id
 */
export const getBorderById = async (req, res) => {
  try {
    const { id } = req.params;
    const border = await Border.getById(id);

    if (!border) {
      return res.status(404).json({
        success: false,
        message: 'Border not found'
      });
    }

    res.status(200).json({
      success: true,
      data: border
    });
  } catch (error) {
    console.error('Error fetching border:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch border',
      error: error.message
    });
  }
};

/**
 * Create new border
 * @route POST /api/v1/borders
 * @access Admin only
 */
export const createBorder = async (req, res) => {
  try {
    const {
      type,
      orientation,
      x1,
      y1,
      x2,
      y2,
      length,
      thickness,
      strokeStyle,
      color
    } = req.body;

    // Validate required fields
    if (!type || !orientation || x1 === undefined || y1 === undefined || 
        x2 === undefined || y2 === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, orientation, x1, y1, x2, y2'
      });
    }

    // Validate border type
    const validTypes = ['structural', 'zone', 'pathway'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid border type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate orientation
    const validOrientations = ['horizontal', 'vertical'];
    if (!validOrientations.includes(orientation)) {
      return res.status(400).json({
        success: false,
        message: `Invalid orientation. Must be one of: ${validOrientations.join(', ')}`
      });
    }

    const borderData = {
      type,
      orientation,
      x1: parseFloat(x1),
      y1: parseFloat(y1),
      x2: parseFloat(x2),
      y2: parseFloat(y2),
      length: length || Math.abs(orientation === 'horizontal' ? x2 - x1 : y2 - y1),
      thickness: thickness || (type === 'structural' ? 8 : type === 'zone' ? 6 : 4),
      strokeStyle: strokeStyle || (type === 'structural' ? 'solid' : type === 'zone' ? 'dashed' : 'dotted'),
      color: color || (type === 'structural' ? '#475569' : type === 'zone' ? '#3B82F6' : '#10B981')
    };

    const border = await Border.create(borderData);

    res.status(201).json({
      success: true,
      message: 'Border created successfully',
      data: border
    });
  } catch (error) {
    console.error('Error creating border:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create border',
      error: error.message
    });
  }
};

/**
 * Update border
 * @route PUT /api/v1/borders/:id
 * @access Admin only
 */
export const updateBorder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingBorder = await Border.getById(id);
    if (!existingBorder) {
      return res.status(404).json({
        success: false,
        message: 'Border not found'
      });
    }

    // Prevent updating static borders
    if (existingBorder.is_static) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify static borders'
      });
    }

    const updatedBorder = await Border.update(id, updates);

    res.status(200).json({
      success: true,
      message: 'Border updated successfully',
      data: updatedBorder
    });
  } catch (error) {
    console.error('Error updating border:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update border',
      error: error.message
    });
  }
};

/**
 * Delete border
 * @route DELETE /api/v1/borders/:id
 * @access Admin only
 */
export const deleteBorder = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Border.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Border not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Border deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting border:', error);
    
    if (error.message === 'Cannot delete static borders') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete border',
      error: error.message
    });
  }
};

/**
 * Check border collision with booths
 * @route POST /api/v1/borders/check-collision
 * @access Admin only
 */
export const checkCollision = async (req, res) => {
  try {
    const { border, booths } = req.body;

    if (!border || !booths) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: border, booths'
      });
    }

    const collisions = booths.filter(booth => 
      Border.checkCollision(border, booth)
    );

    res.status(200).json({
      success: true,
      hasCollision: collisions.length > 0,
      collisions: collisions.map(b => ({ 
        booth_number: b.booth_number,
        booth_id: b.booth_id 
      }))
    });
  } catch (error) {
    console.error('Error checking collision:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check collision',
      error: error.message
    });
  }
};
