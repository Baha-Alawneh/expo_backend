import {
  getProjectByStudentId,
  createProject,
  updateProject,
} from "../models/Project.js";
import { getStudentById } from "../models/Student.js";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// Configure S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

// GET /myproject/:user_id
export const getProjectController = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });

    const student = await getStudentById(user_id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const project = await getProjectByStudentId(student.student_id);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "No project found for this student" });

    // Generate signed URLs for images
    if (
      project.project_photos &&
      Array.isArray(project.project_photos) &&
      project.project_photos.length > 0
    ) {
      const signedImageUrls = await Promise.all(
        project.project_photos.map(async (imageKey) => {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: imageKey,
            });
            return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
          } catch (err) {
            console.error("Error generating signed URL for:", imageKey, err);
            return null;
          }
        })
      );
      project.project_photos = signedImageUrls.filter(Boolean);
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project",
    });
  }
};

// POST /myproject/:user_id
export const postProjectController = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });

    const student = await getStudentById(user_id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const data = req.body;
    if (!data || !data.title)
      return res
        .status(400)
        .json({ success: false, message: "Project title is required" });

    const project = await createProject(student.student_id, data);
    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error creating project:", error);

    // Handle duplicate project error
    if (error.message.includes("already has a project")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating project",
    });
  }
};

// PUT /myproject/:user_id
export const updateProjectController = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });

    const student = await getStudentById(user_id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const data = req.body;
    const project = await updateProject(student.student_id, data);
    res.json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      success: false,
      message: "Error updating project",
    });
  }
};

// POST /myproject/:user_id/upload - Upload project images
export const uploadProjectImagesController = async (req, res) => {
  try {
    const { user_id } = req.params;
    if (!user_id)
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });

    const student = await getStudentById(user_id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const project = await getProjectByStudentId(student.student_id);
    if (!project)
      return res.status(404).json({
        success: false,
        message: "No project found. Please create a project first.",
      });

    if (!req.files || !req.files.images || req.files.images.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No images were uploaded." });

    const imageKeys = req.files.images.map((file) => file.key);

    // Delete old images with proper error handling
    if (project.project_photos?.length > 0) {
      const deletionResults = await Promise.allSettled(
        project.project_photos.map(async (oldKey) => {
          const del = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: oldKey,
          });
          return s3.send(del);
        })
      );

      // Log any deletion failures but don't stop the process
      deletionResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            "Error deleting old image:",
            project.project_photos[index],
            result.reason
          );
        }
      });
    }

    // Update database
    const updatedProject = await updateProject(student.student_id, {
      project_photos: imageKeys,
    });

    const signedUrls = await Promise.all(
      imageKeys.map(async (key) => {
        try {
          const cmd = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
          });
          return await getSignedUrlSDK(s3, cmd, { expiresIn: 3600 });
        } catch {
          return null;
        }
      })
    );

    res.json({
      success: true,
      message: "Project images uploaded successfully",
      data: {
        ...updatedProject,
        project_photos: signedUrls.filter(Boolean),
        image_keys: imageKeys,
      },
    });
  } catch (error) {
    console.error("Upload project images error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading project images",
    });
  }
};
