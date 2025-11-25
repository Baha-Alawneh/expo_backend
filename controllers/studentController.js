import dotenv from "dotenv";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import * as Student from "../models/Student.js";

dotenv.config();

// ✅ Configure AWS S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

// ================================================
// =============== GET STUDENT =====================
// ================================================
export const getStudentController = async (req, res) => {
  try {
    const { user_id, email } = req.params;

    // Fetch student by user_id or email
    let student;
    if (email) {
      student = await Student.getStudentByEmail(email);
    } else if (user_id) {
      student = await Student.getStudentById(user_id);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "user_id or email is required" });
    }

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    // Generate signed URLs for photo and CV if they exist
    if (student.photo_name) {
      const photoCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: student.photo_name,
      });
      student.photo_url = await getSignedUrlSDK(s3, photoCommand, {
        expiresIn: 3600,
      });
    }

    if (student.cv_name) {
      const cvCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: student.cv_name,
      });
      student.cv_url = await getSignedUrlSDK(s3, cvCommand, {
        expiresIn: 3600,
      });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching student" });
  }
};

// ================================================
// =============== UPDATE STUDENT =================
// ================================================
export const updateStudentController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const data = req.body;
    const updatedStudent = await Student.updateStudentById(user_id, data);
    res.json({ success: true, data: updatedStudent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating student" });
  }
};

// ================================================
// =============== UPLOAD FILES ====================
// ================================================
export const uploadStudentFilesController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const student = await Student.getStudentById(user_id);

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    let photo_name, cv_name;
    const deletionPromises = [];

    // Check and upload files
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        photo_name = req.files.photo[0].key;
        // Delete old photo if exists
        if (student.photo_name) {
          deletionPromises.push(
            s3
              .send(
                new DeleteObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: student.photo_name,
                })
              )
              .catch((err) => {
                console.error("Error deleting old photo:", err);
                throw new Error("Failed to delete old photo from storage");
              })
          );
        }
      }

      if (req.files.cv && req.files.cv[0]) {
        cv_name = req.files.cv[0].key;
        // Delete old CV if exists
        if (student.cv_name) {
          deletionPromises.push(
            s3
              .send(
                new DeleteObjectCommand({
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: student.cv_name,
                })
              )
              .catch((err) => {
                console.error("Error deleting old CV:", err);
                throw new Error("Failed to delete old CV from storage");
              })
          );
        }
      }
    }

    if (!photo_name && !cv_name)
      return res.status(400).json({
        success: false,
        message: "No files were uploaded",
      });

    // Wait for all deletions to complete before updating database
    if (deletionPromises.length > 0) {
      await Promise.all(deletionPromises);
    }

    const updatedStudent = await Student.updateStudentFiles(
      user_id,
      photo_name,
      cv_name
    );

    // Add signed URLs
    const response = { ...updatedStudent };
    if (updatedStudent.photo_name) {
      const photoCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: updatedStudent.photo_name,
      });
      response.photo_url = await getSignedUrlSDK(s3, photoCommand, {
        expiresIn: 3600,
      });
    }

    if (updatedStudent.cv_name) {
      const cvCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: updatedStudent.cv_name,
      });
      response.cv_url = await getSignedUrlSDK(s3, cvCommand, {
        expiresIn: 3600,
      });
    }

    res.json({
      success: true,
      message: "Files uploaded successfully",
      data: response,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading files",
    });
  }
};

// ================================================
// =============== DELETE FILES ====================
// ================================================
export const deleteStudentFileController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { fileType } = req.body; // 'photo' or 'cv'

    if (!fileType || !["photo", "cv"].includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Must be 'photo' or 'cv'",
      });
    }

    const student = await Student.getStudentById(user_id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const fileKey = fileType === "photo" ? student.photo_name : student.cv_name;
    if (!fileKey) {
      return res.status(404).json({
        success: false,
        message: `No ${fileType} found for this student`,
      });
    }

    // Delete from S3 with error handling
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileKey,
        })
      );
    } catch (s3Error) {
      console.error("S3 deletion error:", s3Error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete file from storage",
      });
    }

    // Update database only after successful S3 deletion
    const updatedStudent = await Student.updateStudentFiles(
      user_id,
      fileType === "photo" ? null : undefined,
      fileType === "cv" ? null : undefined
    );

    res.json({
      success: true,
      message: `${fileType} deleted successfully`,
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
    });
  }
};

// ================================================
// =============== GENERATE SIGNED URL =============
// ================================================
export const getSignedUrlController = async (req, res) => {
  try {
    const { key } = req.params;

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

    const url = await getSignedUrlSDK(s3, command, { expiresIn: 3600 }); // Standardized to 1 hour

    res.status(200).json({ success: true, url });
  } catch (error) {
    console.error("Signed URL error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating signed URL",
    });
  }
};
