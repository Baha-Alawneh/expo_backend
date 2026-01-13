import dotenv from "dotenv";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import Reel from "../models/Reel.js";

dotenv.config();

// Configure AWS S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

// Helper function to generate signed URLs
const generateSignedUrl = async (key) => {
  if (!key) return null;
  
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });
  
  return await getSignedUrlSDK(s3, command, { expiresIn: 3600 }); // 1 hour
};

// ================================================
// =============== CREATE REEL ====================
// ================================================
export const createReelController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { description } = req.body;

    // Check if video file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file is required",
      });
    }

    // Get video URL from uploaded file
    const video_url = req.file.key; // S3 key

    // Create reel in database
    const reelId = await Reel.createReel({
      user_id,
      video_url,
      description: description || "",
    });

    res.status(201).json({
      success: true,
      message: "Reel created successfully",
      data: {
        reel_id: reelId,
        video_url,
      },
    });
  } catch (error) {
    console.error("Error creating reel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create reel",
      error: error.message,
    });
  }
};

// ================================================
// =============== GET ALL REELS ==================
// ================================================
export const getAllReelsController = async (req, res) => {
  try {
    const reels = await Reel.getAllReels();

    // Generate signed URLs for videos and profile photos
    const reelsWithUrls = await Promise.all(
      reels.map(async (reel) => {
        const videoUrl = await generateSignedUrl(reel.video_url);
        
        // Generate signed URLs for profile photos
        let studentPhotoUrl = null;
        let companyPhotoUrl = null;
        let userPhotoUrl = null;
        
        if (reel.student_photo) {
          studentPhotoUrl = await generateSignedUrl(reel.student_photo);
          userPhotoUrl = studentPhotoUrl;
        }
        
        if (reel.company_photo) {
          companyPhotoUrl = await generateSignedUrl(reel.company_photo);
          if (!userPhotoUrl) {
            userPhotoUrl = companyPhotoUrl;
          }
        }

        console.log(`Reel ${reel.reel_id}: student=${!!studentPhotoUrl}, company=${!!companyPhotoUrl}, user=${!!userPhotoUrl}`);

        return {
          ...reel,
          video_url: videoUrl,
          user_photo: userPhotoUrl,
          student_photo: studentPhotoUrl,
          company_photo: companyPhotoUrl,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: reelsWithUrls,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reels",
      error: error.message,
    });
  }
};

// ================================================
// =============== GET USER REELS =================
// ================================================
export const getUserReelsController = async (req, res) => {
  try {
    const { user_id } = req.params;

    const reels = await Reel.getReelsByUserId(user_id);

    // Generate signed URLs for videos and profile photos
    const reelsWithUrls = await Promise.all(
      reels.map(async (reel) => {
        const videoUrl = await generateSignedUrl(reel.video_url);
        
        // Generate signed URLs for profile photos
        let studentPhotoUrl = null;
        let companyPhotoUrl = null;
        let userPhotoUrl = null;
        
        if (reel.student_photo) {
          studentPhotoUrl = await generateSignedUrl(reel.student_photo);
          userPhotoUrl = studentPhotoUrl;
        }
        
        if (reel.company_photo) {
          companyPhotoUrl = await generateSignedUrl(reel.company_photo);
          if (!userPhotoUrl) {
            userPhotoUrl = companyPhotoUrl;
          }
        }

        console.log(`User Reel ${reel.reel_id}: student=${!!studentPhotoUrl}, company=${!!companyPhotoUrl}, user=${!!userPhotoUrl}`);

        return {
          ...reel,
          video_url: videoUrl,
          user_photo: userPhotoUrl,
          student_photo: studentPhotoUrl,
          company_photo: companyPhotoUrl,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: reelsWithUrls,
    });
  } catch (error) {
    console.error("Error fetching user reels:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user reels",
      error: error.message,
    });
  }
};

// ================================================
// =============== GET REEL BY ID =================
// ================================================
export const getReelByIdController = async (req, res) => {
  try {
    const { reel_id } = req.params;

    const reel = await Reel.getReelById(reel_id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    // Generate signed URLs
    const videoUrl = await generateSignedUrl(reel.video_url);
    const photoUrl = await generateSignedUrl(
      reel.student_photo || reel.company_photo
    );

    res.status(200).json({
      success: true,
      data: {
        ...reel,
        video_url: videoUrl,
        user_photo: photoUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching reel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reel",
      error: error.message,
    });
  }
};

// ================================================
// =============== DELETE REEL ====================
// ================================================
export const deleteReelController = async (req, res) => {
  try {
    const { reel_id } = req.params;
    const user_id = req.user.userId; // From auth middleware

    // Get reel details first to get video key
    const reel = await Reel.getReelById(reel_id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: "Reel not found",
      });
    }

    // Check if user owns this reel
    if (reel.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this reel",
      });
    }

    // Delete from S3
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: reel.video_url,
      });
      await s3.send(deleteCommand);
    } catch (s3Error) {
      console.error("Error deleting video from S3:", s3Error);
      // Continue with database deletion even if S3 delete fails
    }

    // Delete from database
    const deleted = await Reel.deleteReel(reel_id, user_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Failed to delete reel",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reel deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting reel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete reel",
      error: error.message,
    });
  }
};

// ================================================
// =============== UPDATE REEL DESCRIPTION ========
// ================================================
export const updateReelDescriptionController = async (req, res) => {
  try {
    const { reel_id } = req.params;
    const { description } = req.body;
    const user_id = req.user.userId; // From auth middleware

    const updated = await Reel.updateReelDescription(reel_id, user_id, description);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Reel not found or you don't have permission to update it",
      });
    }

    res.status(200).json({
      success: true,
      message: "Reel description updated successfully",
    });
  } catch (error) {
    console.error("Error updating reel description:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update reel description",
      error: error.message,
    });
  }
};
