import * as Project from "../models/Project.js";
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
    const project = await Project.getProjectByStudentId(student.student_id);

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

// GET /projects/:project_id - Get project by project_id
export const getProjectByIdController = async (req, res) => {
  try {
    const { project_id } = req.params;
    if (!project_id)
      return res
        .status(400)
        .json({ success: false, message: "Project ID is required" });

    const project = await Project.getProjectById(project_id);

    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });

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
    console.error("Error fetching project by ID:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project",
    });
  }
};

// 1. Get all projects
export const getAllProjectsController = async (req, res) => {
  try {
    const projects = await Project.getAllProjects();

    if (!projects || projects.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "No projects found" });

    // Generate signed URLs for each project's photos
    for (const project of projects) {
      // فك JSON لو كان نص
      if (
        project.project_photos &&
        typeof project.project_photos === "string"
      ) {
        try {
          project.project_photos = JSON.parse(project.project_photos);
        } catch (err) {
          console.error("Error parsing project_photos JSON:", err);
          project.project_photos = [];
        }
      }

      if (
        Array.isArray(project.project_photos) &&
        project.project_photos.length > 0
      ) {
        const signedUrls = await Promise.all(
          project.project_photos.map(async (imageKey) => {
            try {
              const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: imageKey,
              });
              return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
            } catch (err) {
              console.error("Error generating signed URL:", imageKey, err);
              return null;
            }
          })
        );
        project.project_photos = signedUrls.filter(Boolean);
      }
    }

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching all projects",
    });
  }
};

// 2. Get all projects except current user's project
export const getAllExceptMyProjectController = async (req, res) => {
  // try {
  //   const { user_id } = req.params;

  //   if (!user_id)
  //     return res
  //       .status(400)
  //       .json({ success: false, message: "User ID is required" });

  //   const student = await getStudentById(user_id);
  //   if (!student)
  //     return res
  //       .status(404)
  //       .json({ success: false, message: "Student not found" });

  //   const projects = await getProjectsExceptStudentId(student.student_id);

  //   if (!projects || projects.length === 0)
  //     return res
  //       .status(404)
  //       .json({ success: false, message: "No other projects found" });

  //   // Generate signed URLs for each project's photos
  //   for (const project of projects) {
  //     // فك JSON لو كان نص
  //     if (
  //       project.project_photos &&
  //       typeof project.project_photos === "string"
  //     ) {
  //       try {
  //         project.project_photos = JSON.parse(project.project_photos);
  //       } catch (err) {
  //         console.error("Error parsing project_photos JSON:", err);
  //         project.project_photos = [];
  //       }
  //     }

  //     if (
  //       Array.isArray(project.project_photos) &&
  //       project.project_photos.length > 0
  //     ) {
  //       const signedUrls = await Promise.all(
  //         project.project_photos.map(async (imageKey) => {
  //           try {
  //             const command = new GetObjectCommand({
  //               Bucket: process.env.S3_BUCKET_NAME,
  //               Key: imageKey,
  //             });
  //             return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
  //           } catch (err) {
  //             console.error("Error generating signed URL:", imageKey, err);
  //             return null;
  //           }
  //         })
  //       );
  //       project.project_photos = signedUrls.filter(Boolean);
  //     }
  //   }

  //   res.json({ success: true, data: projects });
  // } catch (error) {
  //   console.error("Error fetching projects except mine:", error);
  //   res.status(500).json({
  //     success: false,
  //     message: "Error fetching projects except mine",
  //   });
  // }
  try {
    const projects = await getAllProjects();

    if (!projects || projects.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "No projects found" });

    // Generate signed URLs for each project's photos
    for (const project of projects) {
      // فك JSON لو كان نص
      if (
        project.project_photos &&
        typeof project.project_photos === "string"
      ) {
        try {
          project.project_photos = JSON.parse(project.project_photos);
        } catch (err) {
          console.error("Error parsing project_photos JSON:", err);
          project.project_photos = [];
        }
      }

      if (
        Array.isArray(project.project_photos) &&
        project.project_photos.length > 0
      ) {
        const signedUrls = await Promise.all(
          project.project_photos.map(async (imageKey) => {
            try {
              const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: imageKey,
              });
              return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
            } catch (err) {
              console.error("Error generating signed URL:", imageKey, err);
              return null;
            }
          })
        );
        project.project_photos = signedUrls.filter(Boolean);
      }
    }

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error("Error fetching all projects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching all projects",
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

    const existingProject = await Project.getProjectByStudentId(student.student_id);
    if (existingProject) {
      throw new Error("Student already has a project. Use update instead.");
    }
    const project = await Project.createProject(student.student_id, data);
    let message = "Project created successfully";
    if (data.partner_email && !project.partnerExists) {
      message += ",(Partner email not found, project created only for you)";
    }

    res.status(201).json({
      success: true,
      message,
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
    const project = await Project.updateProject(student.student_id, data);
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
        project.project_photos.map(async (photo) => {
          // If photo is an object, get the key property; if it's a URL, extract the key from the URL
          let key = photo;
          if (typeof photo === "object" && photo.key) {
            key = photo.key;
          } else if (typeof photo === "object" && photo.fileName) {
            // Optional: parse fileName or uri to get the S3 key if needed
            key = decodeURIComponent(photo.fileName.split("?")[0]);
          } else if (typeof photo === "string" && photo.startsWith("http")) {
            // Extract the S3 key from the URL
            const url = new URL(photo);
            key = decodeURIComponent(url.pathname.substring(1));
          }
          const del = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
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

// ================================================
// =============== BOOTH ASSIGNMENT ===============
// ================================================

// Get unassigned projects
export const getUnassignedProjectsController = async (req, res) => {
  try {
    const projects = await Project.getUnassignedProjects();
    res.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("Error fetching unassigned projects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unassigned projects",
    });
  }
};

// Assign booth to project
export const assignBoothToProjectController = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { booth } = req.body;

    if (!project_id || !booth) {
      return res.status(400).json({
        success: false,
        message: "project_id and booth are required",
      });
    }

    await Project.assignBoothToProject(project_id, booth);

    res.json({
      success: true,
      message: "Booth assigned to project successfully",
    });
  } catch (error) {
    console.error("Error assigning booth to project:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning booth to project",
    });
  }
};

// Unassign booth from project
export const unassignBoothFromProjectController = async (req, res) => {
  try {
    const { project_id } = req.params;

    await Project.unassignBoothFromProject(project_id);

    res.json({
      success: true,
      message: "Booth unassigned from project successfully",
    });
  } catch (error) {
    console.error("Error unassigning booth from project:", error);
    res.status(500).json({
      success: false,
      message: "Error unassigning booth from project",
    });
  }
};
