import dotenv from "dotenv";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

dotenv.config();

console.log("=== Backend Configuration Test ===\n");

// Test 1: Environment Variables
console.log("1. Environment Variables:");
console.log("   PORT:", process.env.PORT || "Not set (using default 5000)");
console.log("   MYSQL_HOST:", process.env.MYSQL_HOST ? "✓ Set" : "✗ Not set");
console.log(
  "   MYSQL_DATABASE:",
  process.env.MYSQL_DATABASE ? "✓ Set" : "✗ Not set"
);
console.log("   JWT_SECRET:", process.env.JWT_SECRET ? "✓ Set" : "✗ Not set");
console.log(
  "   AWS_ACCESS_KEY_ID:",
  process.env.AWS_ACCESS_KEY_ID ? "✓ Set" : "✗ Not set"
);
console.log(
  "   AWS_SECRET_ACCESS_KEY:",
  process.env.AWS_SECRET_ACCESS_KEY ? "✓ Set" : "✗ Not set"
);
console.log("   AWS_REGION:", process.env.AWS_REGION || "✗ Not set");
console.log("   S3_BUCKET_NAME:", process.env.S3_BUCKET_NAME || "✗ Not set");
console.log();

// Test 2: AWS S3 Connection
console.log("2. Testing AWS S3 Connection...");
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

try {
  const command = new ListBucketsCommand({});
  const response = await s3.send(command);
  console.log("   ✓ Successfully connected to AWS S3");
  console.log("   ✓ Found", response.Buckets.length, "buckets");

  const bucketExists = response.Buckets.some(
    (bucket) => bucket.Name === process.env.S3_BUCKET_NAME
  );
  if (bucketExists) {
    console.log("   ✓ Bucket", process.env.S3_BUCKET_NAME, "exists");
  } else {
    console.log("   ✗ Bucket", process.env.S3_BUCKET_NAME, "not found");
    console.log(
      "   Available buckets:",
      response.Buckets.map((b) => b.Name).join(", ")
    );
  }
} catch (error) {
  console.log("   ✗ Failed to connect to AWS S3");
  console.log("   Error:", error.message);
}
console.log();

// Test 3: MySQL Connection
console.log("3. Testing MySQL Connection...");
try {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  await connection.query("SELECT 1");
  console.log("   ✓ Successfully connected to MySQL database");
  await connection.end();
} catch (error) {
  console.log("   ✗ Failed to connect to MySQL");
  console.log("   Error:", error.message);
}
console.log();

console.log("=== Test Complete ===");
console.log("\nIf all tests passed, you can start the server with:");
console.log("  npm run dev");
console.log("\nIf any tests failed, check your .env file configuration.");
