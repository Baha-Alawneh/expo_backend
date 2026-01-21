import dotenv from "dotenv";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import Reel from "../models/Reel.js";
import pool from "../config/db.js";

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
  
  return await getSignedUrlSDK(s3, command, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days // 1 hour
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

// ================================================
// ========== GET BOOTH INFO FOR REEL USER ========
// ================================================
export const getReelUserBoothController = async (req, res) => {
  try {
    const { reel_id } = req.params;

    // Optimized single query to get booth information
    const [rows] = await pool.execute(
      `SELECT 
        u.role,
        u.name as user_name,
        CASE 
          WHEN u.role = 'student' THEN p.booth
          WHEN u.role = 'company' THEN c.booth_id
          ELSE NULL
        END as booth_number,
        b.booth_id as booth_uuid,
        b.location_x,
        b.location_y,
        b.zone_type,
        b.width,
        b.height,
        b.rotation
      FROM Reels r
      JOIN Users u ON r.user_id = u.user_id
      LEFT JOIN Students s ON u.user_id = s.user_id AND u.role = 'student'
      LEFT JOIN ProjectMembers pm ON s.student_id = pm.student_id AND u.role = 'student'
      LEFT JOIN Projects p ON pm.project_id = p.project_id AND u.role = 'student'
      LEFT JOIN Companies c ON u.user_id = c.user_id AND u.role = 'company'
      LEFT JOIN Booths b ON (
        (u.role = 'student' AND b.booth_number = p.booth) OR
        (u.role = 'company' AND b.booth_number = c.booth_id)
      )
      WHERE r.reel_id = ?
      LIMIT 1`,
      [reel_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reel not found"
      });
    }

    const result = rows[0];
    
    // Debug logging
    console.log('🔍 Booth query result:', {
      role: result.role,
      user_name: result.user_name,
      booth_number: result.booth_number,
      booth_uuid: result.booth_uuid,
      has_booth_number: !!result.booth_number,
      has_booth_uuid: !!result.booth_uuid
    });

    // Check if user has a booth assigned
    if (!result.booth_number || !result.booth_uuid) {
      console.log('❌ No booth found - returning 404');
      return res.status(404).json({
        success: false,
        message: `This ${result.role} does not have a booth assigned yet`
      });
    }
    
    console.log('✅ Booth found - returning data');

    res.status(200).json({
      success: true,
      data: {
        role: result.role,
        user_name: result.user_name,
        booth_number: result.booth_number,
        booth_id: result.booth_uuid,
        location_x: result.location_x,
        location_y: result.location_y,
        zone_type: result.zone_type,
        width: result.width,
        height: result.height,
        rotation: result.rotation
      }
    });
  } catch (error) {
    console.error("Error getting booth info for reel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get booth information",
      error: error.message
    });
  }
};
