import express from "express";
import { upload } from "../config/multer.js";
import { authenticateToken } from "../middleware/auth.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Configure S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

/**
 * Upload file/image for chat
 * POST /api/chats/:chatId/upload
 */
router.post(
  "/:chatId/upload",
  authenticateToken,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { chatId } = req.params;

      console.log("📤 Chat file upload request:");
      console.log("  chatId:", chatId);
      console.log("  userId:", req.user?.userId);
      console.log("  files:", JSON.stringify(req.files, null, 2));
      console.log("  body:", req.body);

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: "Chat ID is required",
        });
      }

      // Check if file, image, or audio was uploaded
      const file =
        req.files?.file?.[0] || req.files?.image?.[0] || req.files?.audio?.[0];

      if (!file) {
        console.log("❌ No file uploaded in request");
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      console.log("📎 File details:");
      console.log("  originalname:", file.originalname);
      console.log("  mimetype:", file.mimetype);
      console.log("  size:", file.size);
      console.log("  key:", file.key);

      // Generate signed URL for the uploaded file (valid for 7 days)
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: file.key,
      });

      const signedUrl = await getSignedUrlSDK(s3, command, {
        expiresIn: 7 * 24 * 60 * 60 // 7 days, // 7 days
      });

      // Determine file type
      const isImage = file.mimetype.startsWith("image/");
      const isAudio = file.mimetype.startsWith("audio/");
      const fileType = isImage ? "image" : isAudio ? "audio" : "file";

      console.log("✅ File uploaded successfully");
      console.log("  type:", fileType);
      console.log("  url:", signedUrl);

      return res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        data: {
          url: signedUrl,
          type: fileType,
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          key: file.key,
        },
      });
    } catch (error) {
      console.error("❌ Error uploading chat file:", error);

      // Handle multer-specific errors
      if (error.message === "Unexpected field") {
        console.error(
          "Multer unexpected field error - received fields:",
          Object.keys(req.files || {})
        );
        return res.status(400).json({
          success: false,
          message: "Invalid file field. Expected 'file', 'image', or 'audio'",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to upload file",
        error: error.message,
      });
    }
  }
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error) {
    console.error("Multer error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "File upload error",
    });
  }
  next();
});

export default router;
