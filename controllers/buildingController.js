import Building from '../models/Building.js';

/**
 * Get all buildings
 */
export const getAllBuildings = async (req, res) => {
  try {
    const buildings = await Building.getAll();
    
    // Transform database format to frontend format
    const formattedBuildings = buildings.map(building => ({
      id: building.building_id,
      name: building.name,
      number: building.building_number,
      description: building.description,
      x: building.x,
      y: building.y,
      width: building.width,
      height: building.height,
      color: building.color,
      strokeColor: building.stroke_color,
      labelColor: building.label_color
    }));
    
    res.status(200).json(formattedBuildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ message: 'Failed to fetch buildings', error: error.message });
  }
};

/**
 * Get a single building by ID
 */
export const getBuildingById = async (req, res) => {
  try {
    const { id } = req.params;
    const building = await Building.getById(id);
    
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }
    
    // Transform database format to frontend format
    const formattedBuilding = {
      id: building.building_id,
      name: building.name,
      number: building.building_number,
      description: building.description,
      x: building.x,
      y: building.y,
      width: building.width,
      height: building.height,
      color: building.color,
      strokeColor: building.stroke_color,
      labelColor: building.label_color
    };
    
    res.status(200).json(formattedBuilding);
  } catch (error) {
    console.error('Error fetching building:', error);
    res.status(500).json({ message: 'Failed to fetch building', error: error.message });
  }
};

/**
 * Create a new building (Admin only)
 */
export const createBuilding = async (req, res) => {
  try {
    const { name, building_number, description, x, y, width, height, color, strokeColor, labelColor } = req.body;
    
    // Validation
    if (!name || x === undefined || y === undefined || width === undefined || height === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, x, y, width, height' 
      });
    }
    
    if (width < 50 || height < 50) {
      return res.status(400).json({ 
        message: 'Building dimensions must be at least 50x50 pixels' 
      });
    }
    
    const newBuilding = await Building.create({
      name,
      building_number,
      description,
      x,
      y,
      width,
      height,
      color,
      strokeColor,
      labelColor
    });
    
    console.log('✅ Building created in DB:', newBuilding);
    
    // Transform database format to frontend format
    const formattedBuilding = {
      id: newBuilding.building_id,
      name: newBuilding.name,
      number: newBuilding.building_number,
      description: newBuilding.description,
      x: newBuilding.x,
      y: newBuilding.y,
      width: newBuilding.width,
      height: newBuilding.height,
      color: newBuilding.color,
      strokeColor: newBuilding.stroke_color,
      labelColor: newBuilding.label_color
    };
    
    console.log('📤 Sending to frontend:', formattedBuilding);
    res.status(201).json(formattedBuilding);
  } catch (error) {
    console.error('Error creating building:', error);
    res.status(500).json({ message: 'Failed to create building', error: error.message });
  }
};

/**
 * Update a building's position and dimensions (Admin only)
 */
export const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y, width, height } = req.body;
    
    // Validation
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      return res.status(400).json({ 
        message: 'Missing required fields: x, y, width, height' 
      });
    }
    
    if (width < 50 || height < 50) {
      return res.status(400).json({ 
        message: 'Building dimensions must be at least 50x50 pixels' 
      });
    }
    
    const updatedBuilding = await Building.update(id, { x, y, width, height });
    
    // Transform database format to frontend format
    const formattedBuilding = {
      id: updatedBuilding.building_id,
      name: updatedBuilding.name,
      number: updatedBuilding.building_number,
      description: updatedBuilding.description,
      x: updatedBuilding.x,
      y: updatedBuilding.y,
      width: updatedBuilding.width,
      height: updatedBuilding.height,
      color: updatedBuilding.color,
      strokeColor: updatedBuilding.stroke_color,
      labelColor: updatedBuilding.label_color
    };
    
    res.status(200).json(formattedBuilding);
  } catch (error) {
    console.error('Error updating building:', error);
    
    if (error.message === 'Building not found') {
      return res.status(404).json({ message: 'Building not found' });
    }
    
    res.status(500).json({ message: 'Failed to update building', error: error.message });
  }
};

/**
 * Batch update building positions (Admin only)
 */
export const batchUpdateBuildings = async (req, res) => {
  try {
    const { buildings } = req.body;
    
    if (!buildings || !Array.isArray(buildings) || buildings.length === 0) {
      return res.status(400).json({ message: 'buildings array is required' });
    }
    
    const updatedCount = await Building.batchUpdatePositions(buildings);
    
    res.status(200).json({ 
      message: `Successfully updated ${updatedCount} buildings`,
      count: updatedCount 
    });
  } catch (error) {
    console.error('Error batch updating buildings:', error);
    res.status(500).json({ message: 'Failed to batch update buildings', error: error.message });
  }
};

/**
 * Delete a building (Admin only)
 */
export const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await Building.delete(id);
    
    res.status(200).json({ 
      message: result.message 
    });
  } catch (error) {
    console.error('Error deleting building:', error);
    
    if (error.message === 'Building not found') {
      return res.status(404).json({ message: 'Building not found' });
    }
    
    res.status(500).json({ message: 'Failed to delete building', error: error.message });
  }
};
