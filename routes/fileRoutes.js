import express from "express";
import { upload } from "../config/multer.js";
import {
  handleFileUpload,
  getSignedUrl,
  deleteFile,
} from "../controllers/fileController.js";

const router = express.Router();

// Upload single file
router.post("/upload", upload.single("file"), handleFileUpload);

// Upload multiple files (max 5)
router.post("/upload-multiple", upload.array("files", 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const filesData = req.files.map((file) => ({
      key: file.key,
      location: file.location,
      bucket: file.bucket,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully!",
      data: filesData,
    });
  } catch (error) {
    console.error("Multiple file upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading files",
      error: error.message,
    });
  }
});

router.get("/file/:key", getSignedUrl);
router.delete("/file/:key", deleteFile);

export default router;
