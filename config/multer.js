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
        req.params.user_id ||
        req.body.userId ||
        req.user?.userId ||
        req.user?.id ||
        "guest";

      // Determine folder based on file type and field name
      let folder = "misc";
      if (file.mimetype.startsWith("image/")) {
        if (file.fieldname === "photo") {
          folder = "student-photos";
        } else if (file.fieldname === "images") {
          // Check the route to determine if it's project or offering images
          if (req.path && req.path.includes('/offering/')) {
            folder = "offering-images";
          } else {
            folder = "project-images";
          }
        } else if (file.fieldname === "image") {
          folder = "chat-images";
        } else if (file.fieldname === "profile_image") {
          folder = "company-profiles";
        } else {
          folder = "images";
        }
      } else if (
        file.mimetype.startsWith("audio/") ||
        file.fieldname === "audio"
      ) {
        folder = "chat-audio";
      } else if (file.mimetype === "application/pdf") {
        folder = file.fieldname === "cv" ? "student-cvs" : "pdfs";
      } else if (file.fieldname === "file") {
        folder = "chat-files";
      }

      const fileName = `${folder}/${userId}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit (increased for audio files)
  },
  fileFilter: function (req, file, cb) {
    // For chat files and audio, allow any file type
    if (
      file.fieldname === "file" ||
      file.fieldname === "image" ||
      file.fieldname === "audio"
    ) {
      cb(null, true);
      return;
    }

    // For other fields (photo, cv, etc), be more restrictive
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ];

    if (
      file.mimetype.startsWith("image/") ||
      allowedTypes.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only images and common document types are allowed."
        ),
        false
      );
    }
  },
});

export default upload;
