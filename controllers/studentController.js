import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
dotenv.config();

import * as Student from "../models/Student.js";

// Configure S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

export const getStudentController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const student = await Student.getStudentById(user_id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    // Generate signed URLs for photo and CV if they exist
    if (student.photo_name) {
      try {
        const photoCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: student.photo_name,
        });
        student.photo_url = await getSignedUrlSDK(s3, photoCommand, {
          expiresIn: 60 * 60,
        }); // 1 hour
      } catch (error) {
        console.error("Error generating photo URL:", error);
        student.photo_url = null;
      }
    }

    if (student.cv_name) {
      try {
        const cvCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: student.cv_name,
        });
        student.cv_url = await getSignedUrlSDK(s3, cvCommand, {
          expiresIn: 60 * 60,
        }); // 1 hour
      } catch (error) {
        console.error("Error generating CV URL:", error);
        student.cv_url = null;
      }
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching student" });
  }
};

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

export const uploadStudentFilesController = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Debug logging
    console.log("=== Upload Request Debug ===");
    console.log("User ID:", user_id);
    console.log("req.files:", req.files);
    console.log("req.file:", req.file);
    console.log("req.body:", req.body);
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("===========================");

    // Check if student exists
    const student = await Student.getStudentById(user_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    let photo_name = undefined;
    let cv_name = undefined;

    // Handle uploaded files
    if (req.files) {
      if (req.files.photo && req.files.photo[0]) {
        photo_name = req.files.photo[0].key;
        console.log("Photo uploaded with key:", photo_name);

        // Delete old photo from S3 if it exists
        if (student.photo_name) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: student.photo_name,
            });
            await s3.send(deleteCommand);
          } catch (error) {
            console.error("Error deleting old photo:", error);
          }
        }
      }

      if (req.files.cv && req.files.cv[0]) {
        cv_name = req.files.cv[0].key;
        console.log("CV uploaded with key:", cv_name);

        // Delete old CV from S3 if it exists
        if (student.cv_name) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: student.cv_name,
            });
            await s3.send(deleteCommand);
          } catch (error) {
            console.error("Error deleting old CV:", error);
          }
        }
      }
    }

    console.log(
      "Attempting to update DB with photo_name:",
      photo_name,
      "cv_name:",
      cv_name
    );

    // Check if any files were uploaded
    if (photo_name === undefined && cv_name === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "No files were uploaded. Please select a photo and/or CV to upload.",
      });
    }

    // Update database with new file names
    const updatedStudent = await Student.updateStudentFiles(
      user_id,
      photo_name,
      cv_name
    );

    console.log("Database updated successfully:", updatedStudent);

    // Generate signed URLs for response
    const response = { ...updatedStudent };
    if (updatedStudent.photo_name) {
      const photoCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: updatedStudent.photo_name,
      });
      response.photo_url = await getSignedUrlSDK(s3, photoCommand, {
        expiresIn: 60 * 60,
      });
    }
    if (updatedStudent.cv_name) {
      const cvCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: updatedStudent.cv_name,
      });
      response.cv_url = await getSignedUrlSDK(s3, cvCommand, {
        expiresIn: 60 * 60,
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
      error: error.message,
    });
  }
};

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
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const fileKey = fileType === "photo" ? student.photo_name : student.cv_name;

    if (!fileKey) {
      return res.status(404).json({
        success: false,
        message: `No ${fileType} found for this student`,
      });
    }

    // Delete from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    });
    await s3.send(deleteCommand);

    // Update database
    const updatedStudent = await Student.updateStudentFiles(
      user_id,
      fileType === "photo" ? null : undefined,
      fileType === "cv" ? null : undefined
    );

    res.json({
      success: true,
      message: `${
        fileType.charAt(0).toUpperCase() + fileType.slice(1)
      } deleted successfully`,
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: error.message,
    });
  }
};
