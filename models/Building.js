import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Building Model
 * Manages campus building data in the database
 */
class Building {
  /**
   * Get all buildings
   */
  static async getAll() {
    const query = 'SELECT * FROM buildings ORDER BY name';
    const [rows] = await pool.execute(query);
    return rows;
  }

  /**
   * Get a single building by ID
   */
  static async getById(buildingId) {
    const query = 'SELECT * FROM buildings WHERE building_id = ?';
    const [rows] = await pool.execute(query, [buildingId]);
    return rows[0];
  }

  /**
   * Create a new building
   */
  static async create(buildingData) {
    const { name, building_number, description, x, y, width, height, color, strokeColor, labelColor } = buildingData;
    
    const building_id = uuidv4();
    
    const query = `
      INSERT INTO buildings (building_id, name, building_number, description, x, y, width, height, color, stroke_color, label_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(query, [
      building_id,
      name,
      building_number || null,
      description || null,
      x,
      y,
      width,
      height,
      color || '#e5e7eb',
      strokeColor || '#6b7280',
      labelColor || '#374151'
    ]);
    
    return await Building.getById(building_id);
  }

  /**
   * Update a building's position and dimensions
   */
  static async update(buildingId, updateData) {
    const { x, y, width, height } = updateData;
    
    const query = `
      UPDATE buildings 
      SET x = ?, y = ?, width = ?, height = ?
      WHERE building_id = ?
    `;
    
    const [result] = await pool.execute(query, [x, y, width, height, buildingId]);
    
    if (result.affectedRows === 0) {
      throw new Error('Building not found');
    }
    
    return await Building.getById(buildingId);
  }

  /**
   * Batch update building positions and dimensions
   * @param {Array} updates - Array of {building_id, x, y, width, height}
   * @returns {Promise<number>} Number of buildings updated
   */
  static async batchUpdatePositions(updates) {
    if (!updates || updates.length === 0) return 0;
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const update of updates) {
        await connection.execute(
          'UPDATE buildings SET x = ?, y = ?, width = ?, height = ? WHERE building_id = ?',
          [update.x, update.y, update.width, update.height, update.building_id]
        );
      }
      
      await connection.commit();
      return updates.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a building
   */
  static async delete(buildingId) {
    const query = 'DELETE FROM buildings WHERE building_id = ?';
    const [result] = await pool.execute(query, [buildingId]);
    
    if (result.affectedRows === 0) {
      throw new Error('Building not found');
    }
    
    return { message: 'Building deleted successfully' };
  }
}

export default Building;
