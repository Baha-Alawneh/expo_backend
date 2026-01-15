/**
 * Migration Script: Insert Default Border Lines into Database
 * 
 * This script extracts the hardcoded border lines from InteractiveMap.jsx
 * and inserts them into the borders table.
 * 
 * To run: node migrations/005_insert_default_borders.js
 */

const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

/**
 * Border lines extracted from InteractiveMap.jsx (lines 906-1020)
 * 
 * Booth positions are dynamic, but we can use approximate values based on:
 * - Default booth size: 60px × 60px (3m × 3m)
 * - Gap between booths: 4px
 * - Top left corner starts at (80, 80)
 */

const calculateBoothPositions = () => {
  const W = 60; // booth width
  const H = 60; // booth height
  const GAP = 4;
  const topLeftX = 80;
  const topLeftY = 80;

  // Calculate positions for key booths used in border drawing
  const booths = {
    // Top left group (96-107)
    '103': { x: topLeftX, y: topLeftY, width: W, height: H },
    '96': { x: topLeftX + 7 * (W + GAP), y: topLeftY, width: W, height: H },
    '107': { x: topLeftX, y: topLeftY + 4 * (H + GAP), width: W, height: H },
    
    // Bottom strips (1-12) - assuming at y: 906 based on mobile map data
    '1': { x: 391, y: 906, width: W, height: H },
    '6': { x: 711, y: 906, width: W, height: H },
    '7': { x: 917, y: 906, width: W, height: H },
    '12': { x: 1237, y: 906, width: W, height: H },
    
    // L-shaped section (13-23) - assuming positions from mobile map data
    '13': { x: 1734, y: 714, width: 62, height: H },
    '16': { x: 1926, y: 714, width: 60, height: H },
    '23': { x: 1928, y: 330, width: 60, height: H },
    
    // Top strip (24-31) - assuming at y: 100
    '24': { x: 1582, y: 100, width: W, height: H },
    '31': { x: 1134, y: 100, width: W, height: H }
  };

  return booths;
};

const generateBorders = () => {
  const booths = calculateBoothPositions();
  const borders = [];

  // ===== GROUP 1: Top Left Corner (Booths 96-107) =====
  const topEdge = booths['103'].y;
  const leftEdge = booths['103'].x;
  const rightEdge = booths['96'].x + booths['96'].width;
  const bottomEdge = booths['107'].y + booths['107'].height;

  borders.push(
    {
      description: 'Top-left group - Left vertical line',
      x1: leftEdge,
      y1: bottomEdge,
      x2: leftEdge,
      y2: topEdge,
      type: 'structural',
      orientation: 'vertical'
    },
    {
      description: 'Top-left group - Top horizontal line',
      x1: leftEdge,
      y1: topEdge,
      x2: rightEdge,
      y2: topEdge,
      type: 'structural',
      orientation: 'horizontal'
    },
    {
      description: 'Top-left group - Right vertical short line 1',
      x1: rightEdge,
      y1: topEdge,
      x2: rightEdge,
      y2: topEdge + booths['96'].height,
      type: 'structural',
      orientation: 'vertical'
    },
    {
      description: 'Top-left group - Right vertical short line 2 (up)',
      x1: rightEdge,
      y1: topEdge,
      x2: rightEdge,
      y2: topEdge - 2 * 20,
      type: 'structural',
      orientation: 'vertical'
    }
  );

  // ===== GROUP 2: Bottom Strips (Booths 1-12) =====
  const booth1TopEdge = booths['1'].y;
  const booth1BottomEdge = booths['1'].y + booths['1'].height;
  const horizontalExtension = 6.6 * 20; // 132px
  const verticalLength = 1.5 * 20; // 30px

  borders.push(
    {
      description: 'Bottom strip 1-6 - Bottom horizontal line',
      x1: booths['1'].x,
      y1: booth1BottomEdge,
      x2: booths['6'].x + booths['6'].width,
      y2: booth1BottomEdge,
      type: 'structural',
      orientation: 'horizontal'
    },
    {
      description: 'Bottom strip 7-12 - Bottom horizontal line',
      x1: booths['7'].x,
      y1: booth1BottomEdge,
      x2: booths['12'].x + booths['12'].width,
      y2: booth1BottomEdge,
      type: 'structural',
      orientation: 'horizontal'
    },
    {
      description: 'Bottom strip - Left horizontal extension',
      x1: booths['1'].x,
      y1: booth1TopEdge,
      x2: booths['1'].x - horizontalExtension,
      y2: booth1TopEdge,
      type: 'structural',
      orientation: 'horizontal'
    },
    {
      description: 'Bottom strip - Left vertical down',
      x1: booths['1'].x - horizontalExtension,
      y1: booth1TopEdge,
      x2: booths['1'].x - horizontalExtension,
      y2: booth1BottomEdge + verticalLength,
      type: 'structural',
      orientation: 'vertical'
    },
    {
      description: 'Bottom strip - Booth 6 vertical extension',
      x1: booths['6'].x + booths['6'].width,
      y1: booth1BottomEdge,
      x2: booths['6'].x + booths['6'].width,
      y2: booth1BottomEdge + verticalLength,
      type: 'structural',
      orientation: 'vertical'
    },
    {
      description: 'Bottom strip - Booth 7 vertical extension',
      x1: booths['7'].x,
      y1: booth1BottomEdge,
      x2: booths['7'].x,
      y2: booth1BottomEdge + verticalLength,
      type: 'structural',
      orientation: 'vertical'
    },
    {
      description: 'Bottom strip - Right horizontal extension',
      x1: booths['12'].x + booths['12'].width,
      y1: booth1TopEdge,
      x2: booths['12'].x + booths['12'].width + horizontalExtension,
      y2: booth1TopEdge,
      type: 'structural',
      orientation: 'horizontal'
    },
    {
      description: 'Bottom strip - Right vertical down',
      x1: booths['12'].x + booths['12'].width + horizontalExtension,
      y1: booth1TopEdge,
      x2: booths['12'].x + booths['12'].width + horizontalExtension,
      y2: booth1BottomEdge + verticalLength,
      type: 'structural',
      orientation: 'vertical'
    }
  );

  // ===== GROUP 3: L-Shaped Section (Booths 13-23) =====
  const leftEdge13 = booths['13'].x;
  const rightEdge16 = booths['16'].x + booths['16'].width;
  const bottomEdge13 = booths['13'].y + booths['13'].height;
  const topEdge23 = booths['23'].y;

  borders.push(
    {
      description: 'L-section 13-16 - Bottom horizontal line',
      x1: leftEdge13,
      y1: bottomEdge13,
      x2: rightEdge16,
      y2: bottomEdge13,
      type: 'structural',
      orientation: 'horizontal'
    },
    {
      description: 'L-section - Right vertical line',
      x1: rightEdge16,
      y1: topEdge23,
      x2: rightEdge16,
      y2: bottomEdge13,
      type: 'structural',
      orientation: 'vertical'
    },
    {
      description: 'L-section - Left vertical extension',
      x1: leftEdge13,
      y1: bottomEdge13,
      x2: leftEdge13,
      y2: booths['12'].y + booths['12'].height + 1.5 * 20,
      type: 'structural',
      orientation: 'vertical'
    }
  );

  // ===== GROUP 4: Top Strip (Booths 24-31) =====
  const leftEdge31 = booths['31'].x;
  const topEdge24 = booths['24'].y;
  const extendRight = booths['23'].x + booths['23'].width;
  const upDistance = 2 * 20; // 40px

  borders.push(
    {
      description: 'Top strip 24-31 - Top horizontal line',
      x1: leftEdge31,
      y1: topEdge24,
      x2: extendRight,
      y2: topEdge24,
      type: 'structural',
      orientation: 'horizontal'
    },
    {
      description: 'Top strip - Vertical line up from booth 31',
      x1: leftEdge31,
      y1: topEdge24,
      x2: leftEdge31,
      y2: topEdge24 - upDistance,
      type: 'structural',
      orientation: 'vertical'
    }
  );

  return borders;
};

const insertBorders = async () => {
  let connection;
  try {
    console.log('🚀 Starting border migration...\n');
    
    connection = await pool.getConnection();
    
    // Check if borders already exist
    const [existing] = await connection.query(
      "SELECT COUNT(*) as count FROM borders WHERE description LIKE 'Top-left group%' OR description LIKE 'Bottom strip%' OR description LIKE 'L-section%' OR description LIKE 'Top strip%'"
    );
    
    if (existing[0].count > 0) {
      console.log(`⚠️  Found ${existing[0].count} existing default borders.`);
      console.log('Do you want to delete them and re-insert? (manually edit this script to proceed)\n');
      
      // Uncomment the following lines to delete existing borders:
      // await connection.query("DELETE FROM borders WHERE description LIKE 'Top-left group%' OR description LIKE 'Bottom strip%' OR description LIKE 'L-section%' OR description LIKE 'Top strip%'");
      // console.log('✅ Deleted existing borders\n');
    }
    
    const borders = generateBorders();
    
    console.log(`📊 Generated ${borders.length} border lines:\n`);
    
    let inserted = 0;
    for (const border of borders) {
      const borderId = uuidv4();
      
      await connection.query(
        `INSERT INTO borders 
        (border_id, x1, y1, x2, y2, type, orientation, stroke_color, stroke_width, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          borderId,
          border.x1,
          border.y1,
          border.x2,
          border.y2,
          border.type,
          border.orientation,
          '#8B4513', // Brown color matching the hardcoded borders
          3, // Stroke width matching the hardcoded borders
          border.description
        ]
      );
      
      inserted++;
      console.log(`✅ ${inserted}. ${border.description}`);
      console.log(`   (${border.x1}, ${border.y1}) → (${border.x2}, ${border.y2})\n`);
    }
    
    console.log(`\n🎉 Successfully inserted ${inserted} border lines into database!`);
    console.log('\n📝 Next steps:');
    console.log('1. Remove or comment out the hardcoded border lines in InteractiveMap.jsx');
    console.log('2. The borders will now be loaded from the database');
    console.log('3. You can edit them using the admin interface\n');
    
  } catch (error) {
    console.error('❌ Error inserting borders:', error);
    throw error;
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
};

// Run the migration
if (require.main === module) {
  insertBorders()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { generateBorders, calculateBoothPositions };
