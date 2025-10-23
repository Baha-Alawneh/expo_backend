import pool from "./config/db.js";

const checkColumns = async () => {
  try {
    const [columns] = await pool.execute(
      `SHOW COLUMNS FROM Students LIKE 'photo_name'`
    );

    const [cvColumns] = await pool.execute(
      `SHOW COLUMNS FROM Students LIKE 'cv_name'`
    );

    console.log("Photo column exists:", columns.length > 0);
    console.log("CV column exists:", cvColumns.length > 0);

    if (columns.length > 0) {
      console.log("Photo column details:", columns[0]);
    }
    if (cvColumns.length > 0) {
      console.log("CV column details:", cvColumns[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

checkColumns();
