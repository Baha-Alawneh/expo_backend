import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

class Border {
  /**
   * Create a new border
   * @param {Object} borderData - Border data
   * @returns {Promise<Object>} Created border
   */
  static async create(borderData) {
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
      color,
      is_static = false
    } = borderData;

    const border_id = uuidv4();

    const query = `
      INSERT INTO borders (
        border_id, type, orientation, x1, y1, x2, y2, 
        length, thickness, stroke_style, color, is_static
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      border_id,
      type,
      orientation,
      x1,
      y1,
      x2,
      y2,
      length,
      thickness,
      strokeStyle,
      color,
      is_static
    ];

    const [result] = await pool.execute(query, values);
    
    // Fetch the created border
    const [rows] = await pool.execute(
      'SELECT * FROM borders WHERE border_id = ?',
      [border_id]
    );
    
    return rows[0];
  }

  /**
   * Get all borders
   * @returns {Promise<Array>} Array of borders
   */
  static async getAll() {
    const query = 'SELECT * FROM borders ORDER BY created_at ASC';
    const [rows] = await pool.execute(query);
    return rows;
  }

  /**
   * Get border by ID
   * @param {string} border_id - Border UUID
   * @returns {Promise<Object>} Border object
   */
  static async getById(border_id) {
    const query = 'SELECT * FROM borders WHERE border_id = ?';
    const [rows] = await pool.execute(query, [border_id]);
    return rows[0];
  }

  /**
   * Update border
   * @param {string} border_id - Border UUID
   * @param {Object} updates - Border updates
   * @returns {Promise<Object>} Updated border
   */
  static async update(border_id, updates) {
    const allowedFields = ['type', 'orientation', 'x1', 'y1', 'x2', 'y2', 'length', 'thickness', 'stroke_style', 'color'];
    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key === 'strokeStyle' ? 'stroke_style' : key;
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(border_id);
    const query = `
      UPDATE borders
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE border_id = ?
    `;

    await pool.execute(query, values);
    
    // Fetch the updated border
    const [rows] = await pool.execute(
      'SELECT * FROM borders WHERE border_id = ?',
      [border_id]
    );
    
    return rows[0];
  }

  /**
   * Delete border
   * @param {string} border_id - Border UUID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(border_id) {
    // Prevent deletion of static borders
    const border = await this.getById(border_id);
    if (border && border.is_static) {
      throw new Error('Cannot delete static borders');
    }

    const query = 'DELETE FROM borders WHERE border_id = ?';
    const [result] = await pool.execute(query, [border_id]);
    return result.affectedRows > 0;
  }

  /**
   * Check if border collides with booth
   * @param {Object} border - Border coordinates
   * @param {Object} booth - Booth coordinates
   * @returns {boolean} True if collision detected
   */
  static checkCollision(border, booth) {
    const padding = 15; // 15px padding
    
    // Expand booth bounds with padding
    const boothLeft = booth.x - padding;
    const boothRight = booth.x + booth.width + padding;
    const boothTop = booth.y - padding;
    const boothBottom = booth.y + booth.height + padding;

    // Check if border intersects booth
    if (border.orientation === 'horizontal') {
      const y = border.y1;
      const xMin = Math.min(border.x1, border.x2);
      const xMax = Math.max(border.x1, border.x2);
      
      return (y >= boothTop && y <= boothBottom) && 
             (xMax >= boothLeft && xMin <= boothRight);
    } else {
      const x = border.x1;
      const yMin = Math.min(border.y1, border.y2);
      const yMax = Math.max(border.y1, border.y2);
      
      return (x >= boothLeft && x <= boothRight) && 
             (yMax >= boothTop && yMin <= boothBottom);
    }
  }
}

export default Border;
