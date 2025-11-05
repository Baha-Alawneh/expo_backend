import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// Configure S3 Client (AWS SDK v3)
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

// Configure multer for file uploads
export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: "private", // files are private
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const userId =
        req.params.user_id || req.body.userId || req.user?.id || "guest";

      // Determine folder based on file type and field name
      let folder = "misc";
      if (file.mimetype.startsWith("image/")) {
        if (file.fieldname === "photo") {
          folder = "student-photos";
        } else if (file.fieldname === "images") {
          folder = "project-images";
        } else {
          folder = "images";
        }
      } else if (file.mimetype === "application/pdf") {
        folder = file.fieldname === "cv" ? "student-cvs" : "pdfs";
      }

      const fileName = `${folder}/${userId}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images and PDFs only
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf"
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only images and PDFs are allowed."),
        false
      );
    }
  },
});

export default upload;
