import pool from "./config/db.js";

async function runMigration() {
  try {
    console.log("Running database migration...");

    // Check if demo_link column exists
    const [demoLinkCheck] = await pool.execute(
      `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE table_schema = ? 
      AND table_name = 'Projects' 
      AND column_name = 'demo_link'
    `,
      [process.env.MYSQL_DATABASE || "expo"]
    );

    if (demoLinkCheck[0].count === 0) {
      console.log("Adding demo_link column...");
      await pool.execute(`
        ALTER TABLE Projects 
        ADD COLUMN demo_link VARCHAR(500) DEFAULT NULL
      `);
      console.log("✓ demo_link column added successfully");
    } else {
      console.log("✓ demo_link column already exists");
    }

    // Check if images column exists
    const [imagesCheck] = await pool.execute(
      `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE table_schema = ? 
      AND table_name = 'Projects' 
      AND column_name = 'images'
    `,
      [process.env.MYSQL_DATABASE || "expo"]
    );

    if (imagesCheck[0].count === 0) {
      console.log("Adding images column...");
      await pool.execute(`
        ALTER TABLE Projects 
        ADD COLUMN images TEXT DEFAULT NULL
      `);
      console.log("✓ images column added successfully");
    } else {
      console.log("✓ images column already exists");
    }

    // Check if status column exists
    const [statusCheck] = await pool.execute(
      `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE table_schema = ? 
      AND table_name = 'Projects' 
      AND column_name = 'status'
    `,
      [process.env.MYSQL_DATABASE || "expo"]
    );

    if (statusCheck[0].count === 0) {
      console.log("Adding status column...");
      await pool.execute(`
        ALTER TABLE Projects 
        ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
      `);
      console.log("✓ status column added successfully");

      // Set existing projects to 'pending' if they have NULL status
      await pool.execute(`
        UPDATE Projects SET status = 'pending' WHERE status IS NULL
      `);
      console.log("✓ Existing projects set to 'pending' status");
    } else {
      console.log("✓ status column already exists");
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
