import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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

// Handle file upload response
export const handleFileUpload = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    res.status(200).json({
      success: true,
      message: "File uploaded successfully!",
      data: {
        key: req.file.key, // path in S3
        location: req.file.location,
        bucket: req.file.bucket,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    });
  }
};

// Generate signed URL for file access
export const getSignedUrl = async (req, res) => {
  try {
    const key = req.params.key;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "File key is required",
      });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrlSDK(s3, command, { expiresIn: 60 * 5 }); // 5 minutes

    res.status(200).json({
      success: true,
      url: url,
    });
  } catch (error) {
    console.error("Signed URL generation error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating signed URL",
      error: error.message,
    });
  }
};

// Delete file from S3
export const deleteFile = async (req, res) => {
  try {
    const key = req.params.key;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "File key is required",
      });
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    await s3.send(command);

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("File deletion error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: error.message,
    });
  }
};
