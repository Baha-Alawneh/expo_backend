import pool from "../config/db.js";
import { v4 as uuidv4 } from "uuid";
import firebaseApp from "../config/firebase.js";
import admin from "firebase-admin";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Get Dashboard Statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get project statistics
    const [projectStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_projects,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_projects,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_projects
      FROM Projects
    `);

    // Get company statistics (status now on Companies table)
    const [companyStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_companies,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_companies,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_companies,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_companies
      FROM Companies
    `);

    // Get offering count (no status - offerings shown for approved companies only)
    const [offeringCount] = await pool.execute(`
      SELECT COUNT(*) as total_offerings FROM Offering
    `);

    // Get student count
    const [studentCount] = await pool.execute(`
      SELECT COUNT(*) as total_students FROM Students
    `);

    // Get visitor count from Users table by role
    const [visitorCount] = await pool.execute(`
      SELECT COUNT(*) as total_visitors FROM Users WHERE role = 'visitor'
    `);

    // Get recent activity (last 7 days)
    const [recentProjects] = await pool.execute(`
      SELECT COUNT(*) as recent_projects 
      FROM Projects 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    const [recentOffers] = await pool.execute(`
      SELECT COUNT(*) as recent_offers 
      FROM Offering 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.status(200).json({
      success: true,
      data: {
        projects: {
          total: projectStats[0].total_projects,
          approved: projectStats[0].approved_projects,
          pending: projectStats[0].pending_projects,
          rejected: projectStats[0].rejected_projects,
        },
        companies: {
          total: companyStats[0].total_companies,
          approved: companyStats[0].approved_companies,
          pending: companyStats[0].pending_companies,
          rejected: companyStats[0].rejected_companies,
        },
        offerings: {
          total: offeringCount[0].total_offerings,
        },
        students: {
          total: studentCount[0].total_students,
        },
        visitors: {
          total: visitorCount[0].total_visitors,
        },
        recentActivity: {
          projects: recentProjects[0].recent_projects,
          offers: recentOffers[0].recent_offers,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

// Get All Pending Projects
export const getPendingProjects = async (req, res) => {
  try {
    const [projects] = await pool.execute(`
      SELECT DISTINCT
        p.*,
        (SELECT u.name FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         JOIN Users u ON s.user_id = u.user_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as student_name,
        (SELECT u.email FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         JOIN Users u ON s.user_id = u.user_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as student_email,
        (SELECT s.student_id FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as student_id,
        (SELECT u.user_id FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         JOIN Users u ON s.user_id = u.user_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as user_id
      FROM Projects p
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
    `);

    // Parse project photos and generate signed URLs for each project
    const projectsWithImages = await Promise.all(
      projects.map(async (project) => {
        // Debug: Log raw project data from database
        console.log("Raw project from DB:", {
          project_id: project.project_id,
          project_title: project.project_title,
          project_description: project.project_description,
          title: project.title,
          description: project.description,
          all_columns: Object.keys(project),
        });
        
        let images = [];
        
        // Parse project_photos - handle both JSON string and already-parsed array
        if (project.project_photos) {
          try {
            let parsedPhotos;
            
            // Check if it's already an array
            if (Array.isArray(project.project_photos)) {
              parsedPhotos = project.project_photos;
            } 
            // Check if it's a string that needs parsing
            else if (typeof project.project_photos === "string") {
              // Try to parse as JSON
              parsedPhotos = JSON.parse(project.project_photos);
            } 
            // Handle object case
            else if (typeof project.project_photos === "object") {
              parsedPhotos = [project.project_photos];
            }
            
            if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
              // Generate signed URLs for S3 images
              const signedUrls = await Promise.all(
                parsedPhotos.map(async (imageKey) => {
                  try {
                    // Skip if not a valid S3 key
                    if (!imageKey || typeof imageKey !== "string") {
                      console.warn("Invalid image key:", imageKey);
                      return null;
                    }
                    
                    const command = new GetObjectCommand({
                      Bucket: process.env.S3_BUCKET_NAME,
                      Key: imageKey,
                    });
                    return await getSignedUrlSDK(s3, command, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days
                  } catch (err) {
                    console.error("Error generating signed URL:", imageKey, err.message);
                    return null;
                  }
                })
              );
              images = signedUrls.filter(Boolean);
            }
          } catch (e) {
            console.error("Error processing project_photos:", e.message, "Value:", project.project_photos);
            images = [];
          }
        }
        
        return {
          project_id: project.project_id,
          title: project.title,  // Use 'title' from database, not 'project_title'
          description: project.description,  // Use 'description' from database, not 'project_description'
          booth: project.booth,
          github_link: project.github_link,
          video_url: project.video_url,
          category: project.category,
          location: project.location,
          status: project.status,
          created_at: project.created_at,
          average_rating: project.average_rating || 0,
          total_ratings: project.total_ratings || 0,
          student_name: project.student_name,
          student_email: project.student_email,
          images: images,
          project_photos: images,
          students: [
            {
              student_id: project.student_id,
              user_id: project.user_id,
              name: project.student_name,
              email: project.student_email,
            },
          ],
        };
      })
    );

    // Deduplicate projects by project_id to ensure no duplicates
    const uniqueProjects = Array.from(
      new Map(projectsWithImages.map(p => [p.project_id, p])).values()
    );

    console.log(`Total projects fetched: ${projects.length}, Unique projects: ${uniqueProjects.length}`);

    res.status(200).json({
      success: true,
      data: uniqueProjects,
    });
  } catch (error) {
    console.error("Error fetching pending projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending projects",
    });
  }
};

// Get Projects by Status (pending, approved, rejected)
export const getProjectsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'pending', 'approved', or 'rejected'",
      });
    }

    const [projects] = await pool.execute(`
      SELECT DISTINCT
        p.*,
        (SELECT u.name FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         JOIN Users u ON s.user_id = u.user_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as student_name,
        (SELECT u.email FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         JOIN Users u ON s.user_id = u.user_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as student_email,
        (SELECT s.student_id FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as student_id,
        (SELECT u.user_id FROM ProjectMembers pm 
         JOIN Students s ON pm.student_id = s.student_id 
         JOIN Users u ON s.user_id = u.user_id 
         WHERE pm.project_id = p.project_id 
         LIMIT 1) as user_id
      FROM Projects p
      WHERE p.status = ?
      ORDER BY p.created_at DESC
    `, [status]);

    // Parse project photos and generate signed URLs for each project
    const projectsWithImages = await Promise.all(
      projects.map(async (project) => {
        let images = [];
        
        if (project.project_photos) {
          try {
            let parsedPhotos;
            
            if (Array.isArray(project.project_photos)) {
              parsedPhotos = project.project_photos;
            } else if (typeof project.project_photos === "string") {
              parsedPhotos = JSON.parse(project.project_photos);
            } else if (typeof project.project_photos === "object") {
              parsedPhotos = [project.project_photos];
            }
            
            if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
              const signedUrls = await Promise.all(
                parsedPhotos.map(async (imageKey) => {
                  try {
                    if (!imageKey || typeof imageKey !== "string") {
                      return null;
                    }
                    
                    const command = new GetObjectCommand({
                      Bucket: process.env.S3_BUCKET_NAME,
                      Key: imageKey,
                    });
                    return await getSignedUrlSDK(s3, command, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days
                  } catch (err) {
                    console.error("Error generating signed URL:", imageKey, err.message);
                    return null;
                  }
                })
              );
              images = signedUrls.filter(Boolean);
            }
          } catch (e) {
            console.error("Error processing project_photos:", e.message);
            images = [];
          }
        }
        
        return {
          project_id: project.project_id,
          title: project.title,
          description: project.description,
          booth: project.booth,
          github_link: project.github_link,
          video_url: project.video_url,
          category: project.category,
          location: project.location,
          status: project.status,
          created_at: project.created_at,
          average_rating: project.average_rating || 0,
          total_ratings: project.total_ratings || 0,
          student_name: project.student_name,
          student_email: project.student_email,
          images: images,
          project_photos: images,
          students: [
            {
              student_id: project.student_id,
              user_id: project.user_id,
              name: project.student_name,
              email: project.student_email,
            },
          ],
        };
      })
    );

    const uniqueProjects = Array.from(
      new Map(projectsWithImages.map(p => [p.project_id, p])).values()
    );

    res.status(200).json({
      success: true,
      data: uniqueProjects,
    });
  } catch (error) {
    console.error(`Error fetching ${status} projects:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${status} projects`,
    });
  }
};

// Approve/Reject Project
export const updateProjectStatus = async (req, res) => {
  try {
    const { project_id } = req.params;
    const { status, rejection_reason } = req.body; // 'approved' or 'rejected', optional rejection_reason

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'",
      });
    }

    // Validate rejection reason if status is rejected
    if (status === "rejected" && (!rejection_reason || rejection_reason.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting a project",
      });
    }

    // Get project details before updating
    const [projectRows] = await pool.execute(
      `SELECT p.title, p.project_id
       FROM Projects p
       WHERE p.project_id = ?`,
      [project_id]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = projectRows[0];

    // Update project status
    await pool.execute(
      `UPDATE Projects SET status = ? WHERE project_id = ?`,
      [status, project_id]
    );

    // Get all student user_ids associated with this project for notifications
    const [teamMembers] = await pool.execute(
      `SELECT u.user_id
       FROM ProjectMembers pm
       JOIN Students s ON pm.student_id = s.student_id
       JOIN Users u ON s.user_id = u.user_id
       WHERE pm.project_id = ?`,
      [project_id]
    );

    const userIds = teamMembers.map(member => member.user_id);

    // Send notification based on status
    if (status === "approved" && userIds.length > 0) {
      try {
        await sendNotificationToUsers(userIds, {
          title: "Project Approved",
          message: `Your project "${project.title}" has been approved.`,
          icon: "checkmark-circle"
        });
      } catch (notifError) {
        console.error("Error sending project approval notification:", notifError);
        // Don't fail the request if notification fails
      }
    } else if (status === "rejected" && userIds.length > 0) {
      try {
        await sendNotificationToUsers(userIds, {
          title: "Project Rejected",
          message: `Your project "${project.title}" has been rejected. Reason: ${rejection_reason}`,
          icon: "close-circle"
        });
      } catch (notifError) {
        console.error("Error sending project rejection notification:", notifError);
        // Don't fail the request if notification fails
      }
    }

    res.status(200).json({
      success: true,
      message: `Project ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update project status",
    });
  }
};

// Get All Pending Offerings
// Get Pending Companies for Approval
export const getPendingCompanies = async (req, res) => {
  try {
    console.log('[Admin] Fetching pending companies...');
    const [companies] = await pool.execute(`
      SELECT 
        c.company_id,
        c.company_name,
        c.description,
        c.type,
        c.phone,
        c.address,
        c.website_url,
        c.profile_image,
        c.status,
        u.name,
        u.email,
        u.created_at as user_created_at
      FROM Companies c
      LEFT JOIN Users u ON c.user_id = u.user_id
      WHERE c.status = 'pending'
      ORDER BY u.created_at DESC
    `);

    console.log(`[Admin] Found ${companies.length} pending companies`);

    // Generate signed URLs for profile images
    const companiesWithUrls = await Promise.all(
      companies.map(async (company) => {
        if (company.profile_image) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: company.profile_image,
            });
            company.profile_image_url = await getSignedUrlSDK(s3, command, {
              expiresIn: 7 * 24 * 60 * 60 // 7 days
            });
          } catch (error) {
            console.error(
              `Error generating signed URL for company ${company.company_id}:`,
              error
            );
            company.profile_image_url = null;
          }
        } else {
          company.profile_image_url = null;
        }
        return company;
      })
    );

    res.status(200).json({
      success: true,
      data: companiesWithUrls,
    });
  } catch (error) {
    console.error("Error fetching pending companies:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending companies",
      error: error.message,
    });
  }
};

// Get Companies by Status (pending, approved, rejected)
export const getCompaniesByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    console.log(`[Admin] Fetching companies with status: ${status}`);

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'pending', 'approved', or 'rejected'",
      });
    }

    const [companies] = await pool.execute(`
      SELECT 
        c.company_id,
        c.company_name,
        c.description,
        c.type,
        c.phone,
        c.address,
        c.website_url,
        c.profile_image,
        c.status,
        c.rejection_reason,
        u.name,
        u.email,
        u.created_at as user_created_at
      FROM Companies c
      LEFT JOIN Users u ON c.user_id = u.user_id
      WHERE c.status = ?
      ORDER BY u.created_at DESC
    `, [status]);

    console.log(`[Admin] Found ${companies.length} companies with status: ${status}`);

    // Generate signed URLs for profile images
    const companiesWithUrls = await Promise.all(
      companies.map(async (company) => {
        if (company.profile_image) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: company.profile_image,
            });
            company.profile_image_url = await getSignedUrlSDK(s3, command, {
              expiresIn: 7 * 24 * 60 * 60 // 7 days
            });
          } catch (error) {
            console.error(
              `Error generating signed URL for company ${company.company_id}:`,
              error
            );
            company.profile_image_url = null;
          }
        } else {
          company.profile_image_url = null;
        }
        return company;
      })
    );

    res.status(200).json({
      success: true,
      data: companiesWithUrls,
    });
  } catch (error) {
    console.error(`Error fetching companies by status:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch ${req.params.status} companies`,
      error: error.message,
    });
  }
};

// DEPRECATED: Use getPendingCompanies instead
// This function is kept for backward compatibility but now fetches companies
export const getPendingOfferings = async (req, res) => {
  return getPendingCompanies(req, res);
};

// Get Offerings by Status (pending, approved, rejected)
// NOTE: Now filters by company status instead of offering status
export const getOfferingsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    console.log(`[Admin] Fetching offerings for companies with status: ${status}`);

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'pending', 'approved', or 'rejected'",
      });
    }

    const [offerings] = await pool.execute(`
      SELECT 
        o.*,
        c.company_name,
        c.profile_image,
        c.status as company_status,
        u.email as company_email
      FROM Offering o
      LEFT JOIN Companies c ON o.company_id = c.company_id
      LEFT JOIN Users u ON c.user_id = u.user_id
      WHERE c.status = ?
      ORDER BY o.created_at DESC
    `, [status]);

    // Process offering photos and generate S3 signed URLs for each offering
    const offeringsWithImages = await Promise.all(
      offerings.map(async (offering) => {
        console.log('Processing offering:', offering.name);
        console.log('Raw offering_photos from DB:', offering.offering_photos);
        
        let images = [];
        if (offering.offering_photos) {
          try {
            // Check if already parsed (object) or needs parsing (string)
            const parsedPhotos = typeof offering.offering_photos === 'string'
              ? JSON.parse(offering.offering_photos)
              : offering.offering_photos;
            console.log('Parsed photos:', parsedPhotos);
            
            if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
              // Process each photo - could be S3 key (string) or image picker object
              const signedUrls = await Promise.all(
                parsedPhotos.map(async (photo) => {
                  try {
                    // If it's a string, treat it as an S3 key
                    if (typeof photo === 'string') {
                      console.log('Generating signed URL for S3 key:', photo);
                      const command = new GetObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: photo,
                      });
                      const url = await getSignedUrlSDK(s3, command, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days
                      console.log('Generated URL:', url);
                      return url;
                    } 
                    // If it's an object (image picker metadata), extract the URI
                    else if (typeof photo === 'object' && photo.uri) {
                      console.log('Found image picker object, returning URI:', photo.uri);
                      return photo.uri;
                    }
                    // Invalid format
                    else {
                      console.warn('Invalid photo format:', photo);
                      return null;
                    }
                  } catch (err) {
                    console.error("Error processing photo:", photo, err.message);
                    return null;
                  }
                })
              );
              images = signedUrls.filter(Boolean);
              console.log('Final images array:', images);
            }
          } catch (e) {
            console.error("Error processing offering_photos:", e.message);
            images = [];
          }
        }
        
        // Generate signed URL for company profile image
        let profileImageUrl = null;
        if (offering.profile_image) {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: offering.profile_image,
            });
            profileImageUrl = await getSignedUrlSDK(s3, command, { expiresIn: 7 * 24 * 60 * 60 }); // 7 days
          } catch (err) {
            console.error("Error generating signed URL for profile image:", err.message);
          }
        }
        
        return {
          offering_id: offering.offering_id,
          name: offering.name,
          description: offering.description,
          price: offering.price,
          created_at: offering.created_at,
          company_id: offering.company_id,
          company_name: offering.company_name,
          company_email: offering.company_email,
          company_status: offering.company_status,
          profile_image_url: profileImageUrl,
          images: images,
          offering_photos: images,
        };
      })
    );

    console.log(`[Admin] Returning ${offeringsWithImages.length} offerings`);

    res.status(200).json({
      success: true,
      data: offeringsWithImages,
    });
  } catch (error) {
    console.error(`Error fetching offerings with status ${req.params.status}:`, error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: `Failed to fetch offerings`,
      error: error.message,
    });
  }
};

// Approve/Reject Offering
// Update Company Status (Approve/Reject)
export const updateCompanyStatus = async (req, res) => {
  try {
    const { company_id } = req.params;
    const { status, rejection_reason } = req.body; // 'approved' or 'rejected', optional rejection_reason

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'",
      });
    }

    // Validate rejection reason if status is rejected
    if (status === "rejected" && (!rejection_reason || rejection_reason.trim() === "")) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting a company",
      });
    }

    // Get company details before updating
    const [companyRows] = await pool.execute(
      `SELECT c.company_name, c.user_id, u.email
       FROM Companies c
       JOIN Users u ON c.user_id = u.user_id
       WHERE c.company_id = ?`,
      [company_id]
    );

    if (companyRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const company = companyRows[0];

    // Update company status and rejection reason if applicable
    if (status === "rejected") {
      await pool.execute(
        `UPDATE Companies SET status = ?, rejection_reason = ? WHERE company_id = ?`,
        [status, rejection_reason, company_id]
      );
    } else {
      await pool.execute(
        `UPDATE Companies SET status = ?, rejection_reason = NULL WHERE company_id = ?`,
        [status, company_id]
      );
    }

    // Send notification based on status
    if (status === "approved") {
      try {
        await sendNotificationToUsers([company.user_id], {
          title: "Company Approved",
          message: `Your company "${company.company_name}" has been approved. You can now add offerings.`,
          icon: "checkmark-circle"
        });
      } catch (notifError) {
        console.error("Error sending company approval notification:", notifError);
        // Don't fail the request if notification fails
      }
    } else if (status === "rejected") {
      try {
        await sendNotificationToUsers([company.user_id], {
          title: "Company Rejected",
          message: `Your company "${company.company_name}" has been rejected. Reason: ${rejection_reason}`,
          icon: "close-circle"
        });
      } catch (notifError) {
        console.error("Error sending company rejection notification:", notifError);
        // Don't fail the request if notification fails
      }
    }

    res.status(200).json({
      success: true,
      message: `Company ${status} successfully`,
      data: {
        company_id,
        company_name: company.company_name,
        status,
      },
    });
  } catch (error) {
    console.error("Error updating company status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update company status",
      error: error.message,
    });
  }
};

// DEPRECATED: Use updateCompanyStatus instead
// This function is kept for backward compatibility
export const updateOfferingStatus = async (req, res) => {
  // Map offering_id to company_id
  try {
    const { offering_id } = req.params;
    
    // Get company_id from offering_id
    const [rows] = await pool.execute(
      `SELECT company_id FROM Offering WHERE offering_id = ?`,
      [offering_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Offering not found",
      });
    }
    
    // Call updateCompanyStatus with company_id
    req.params.company_id = rows[0].company_id;
    return updateCompanyStatus(req, res);
  } catch (error) {
    console.error("Error in updateOfferingStatus:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update offering status",
      error: error.message,
    });
  }
};

// Send Notification via Firebase Cloud Messaging
export const sendNotification = async (req, res) => {
  try {
    console.log("[Admin] sendNotification API called");
    const { title, description, icon, target_type, target_email } = req.body;
    console.log("[Admin] Request body:", { title, description, icon, target_type, target_email });

    // Validate input
    if (!title || !description || !icon || !target_type) {
      return res.status(400).json({
        success: false,
        message: "Title, description, icon, and target type are required",
      });
    }

    if (!["all", "students", "companies", "specific"].includes(target_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target type",
      });
    }

    if (target_type === "specific" && !target_email) {
      return res.status(400).json({
        success: false,
        message: "Target email is required for specific notifications",
      });
    }

    let targetUsers = [];

    // Determine target users based on target_type
    if (target_type === "all") {
      // Send to students, companies, and visitors - NOT admins
      const [users] = await pool.execute(
        `SELECT user_id, role FROM Users WHERE role IN ('student', 'company', 'visitor')`
      );
      targetUsers = users;
    } else if (target_type === "students") {
      const [users] = await pool.execute(
        `SELECT user_id, role FROM Users WHERE role = 'student'`
      );
      targetUsers = users;
    } else if (target_type === "companies") {
      const [users] = await pool.execute(
        `SELECT user_id, role FROM Users WHERE role = 'company'`
      );
      targetUsers = users;
    } else if (target_type === "specific") {
      const [users] = await pool.execute(
        `SELECT user_id, role FROM Users WHERE email = ?`,
        [target_email]
      );
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found with the provided email",
        });
      }
      targetUsers = users;
    }

    // Check if Firebase is initialized
    if (!firebaseApp) {
      return res.status(500).json({
        success: false,
        message: "Firebase Admin SDK not initialized. Check server configuration.",
      });
    }

    // Save notification to Firestore for each target user
    const db = firebaseApp.firestore();
    
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const notificationData = {
      title,
      message: description,
      icon: icon || "notifications",
      iconColor: getIconColor(icon),
      type: getNotificationType(icon),
      time: new Date().toISOString(),
      read: false,
      createdAt: timestamp,
    };
    
    console.log("[Admin] Notification data:", notificationData);
    console.log("[Admin] Sending to", targetUsers.length, "users");

    // Save to Firestore for each target user
    const savePromises = targetUsers.map((user) => {
      console.log(`[Admin] Creating notification for user ${user.user_id}`);
      return db
        .collection("notifications")
        .doc(user.user_id.toString())
        .collection("userNotifications")
        .add(notificationData);
    });

    await Promise.all(savePromises);
    console.log("[Admin] All notifications saved to Firestore");

    res.status(200).json({
      success: true,
      message: `Notification sent successfully to ${targetUsers.length} user(s)`,
      data: {
        recipients_count: targetUsers.length,
      },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send notification",
    });
  }
};

// Helper function to determine notification type based on icon
function getNotificationType(icon) {
  if (!icon) return "info";
  
  if (["checkmark-circle", "checkmark-done", "shield-checkmark"].includes(icon)) {
    return "success";
  }
  if (["warning", "alert-circle", "alert", "flame"].includes(icon)) {
    return "warning";
  }
  if (["close-circle", "remove-circle", "trash"].includes(icon)) {
    return "error";
  }
  return "info";
}

// Helper function to get icon color
function getIconColor(icon) {
  if (!icon) return "#74B9FF"; // Default blue
  
  // Success/Approval - Green
  if (["checkmark-circle", "checkmark-done", "shield-checkmark"].includes(icon)) {
    return "#00B894";
  }
  
  // Info/Message - Blue
  if (["mail", "chatbubble", "information-circle", "notifications"].includes(icon)) {
    return "#74B9FF";
  }
  
  // Warning/Alert - Orange
  if (["warning", "alert-circle", "alert", "flame"].includes(icon)) {
    return "#FDCB6E";
  }
  
  // Error/Rejection - Red
  if (["close-circle", "remove-circle", "trash"].includes(icon)) {
    return "#FF7675";
  }
  
  // Megaphone/Announcement - Purple
  if (icon === "megaphone") {
    return "#6C5CE7";
  }
  
  return "#74B9FF"; // Default blue
}

/**
 * Helper function to send notifications to specific users
 * @param {Array} userIds - Array of user IDs to send notifications to
 * @param {Object} notificationData - { title, message, icon }
 */
async function sendNotificationToUsers(userIds, notificationData) {
  try {
    if (!firebaseApp || userIds.length === 0) {
      console.log("[Notification] Cannot send - Firebase not initialized or no users");
      return;
    }

    const db = firebaseApp.firestore();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const { title, message, icon = "checkmark-circle" } = notificationData;
    
    const notification = {
      title,
      message,
      icon,
      iconColor: getIconColor(icon),
      type: getNotificationType(icon),
      time: new Date().toISOString(),
      read: false,
      createdAt: timestamp,
    };

    const savePromises = userIds.map((userId) => {
      return db
        .collection("notifications")
        .doc(userId.toString())
        .collection("userNotifications")
        .add(notification);
    });

    await Promise.all(savePromises);
    console.log(`[Notification] Sent to ${userIds.length} user(s): ${title}`);
  } catch (error) {
    console.error("[Notification] Error sending notifications:", error);
  }
}

// Get all users for notification dropdown
export const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT user_id, name, email, role 
      FROM Users 
      ORDER BY name ASC
    `);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// Get user registrations over time for analytics
export const getUserRegistrations = async (req, res) => {
  try {
    const { timeRange } = req.query; // 'week', 'month', or 'all'
    
    console.log(`[User Registrations] Time range requested: ${timeRange}`);
    
    let daysBack = null;
    
    if (timeRange === 'week') {
      daysBack = 7;
    } else if (timeRange === 'month') {
      daysBack = 30;
    }

    if (daysBack) {
      // For week/month view, return cumulative counts starting from zero
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack + 1); // Include today
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      console.log(`[User Registrations] Date range: ${startDateStr} to ${endDateStr}`);
      
      // Get daily registrations grouped by date using DATE() to strip time from TIMESTAMP
      // Only count registrations within the selected period
      const [registrations] = await pool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as daily_count
        FROM Users
        WHERE DATE(created_at) >= ? 
          AND DATE(created_at) <= ?
          AND role != 'admin'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDateStr, endDateStr]);
      
      console.log(`[User Registrations] Found ${registrations.length} days with registrations`);
      
      // Create map of daily counts for quick lookup
      const dateMap = {};
      registrations.forEach(reg => {
        const dateKey = reg.date instanceof Date 
          ? reg.date.toISOString().split('T')[0]
          : reg.date;
        dateMap[dateKey] = parseInt(reg.daily_count);
      });
      
      // Generate complete date range with cumulative counts (starting from 0)
      const result = [];
      const currentDate = new Date(startDate);
      let cumulativeCount = 0; // Start from zero for the selected period
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Add daily count if exists
        if (dateMap[dateStr]) {
          cumulativeCount += dateMap[dateStr];
        }
        
        result.push({
          date: dateStr,
          count: cumulativeCount  // Cumulative count within period only
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`[User Registrations] Total registrations in period: ${cumulativeCount}`);
      console.log(`[User Registrations] Returning ${result.length} data points (cumulative counts)`);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } else {
      // For 'all' time view, return cumulative counts by date
      const [registrations] = await pool.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as daily_count
        FROM Users
        WHERE role != 'admin'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      
      console.log(`[User Registrations] All time - Found ${registrations.length} days with registrations`);
      
      // Calculate cumulative counts for all time view
      let cumulativeCount = 0;
      const result = registrations.map(reg => {
        const dateStr = reg.date instanceof Date 
          ? reg.date.toISOString().split('T')[0]
          : reg.date;
        cumulativeCount += parseInt(reg.daily_count);
        return {
          date: dateStr,
          count: cumulativeCount  // Cumulative count for all time
        };
      });
      
      console.log(`[User Registrations] All time - Total users: ${cumulativeCount}`);
      console.log(`[User Registrations] Returning ${result.length} data points (cumulative counts)`);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    }
  } catch (error) {
    console.error("Error fetching user registrations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user registrations",
    });
  }
};

// Get top 5 highest-rated projects
export const getTopRatedProjects = async (req, res) => {
  try {
    const [projects] = await pool.execute(`
      SELECT 
        p.project_id,
        p.title as project_title,
        AVG(f.rating) as average_rating,
        COUNT(f.feedback_id) as rating_count
      FROM Projects p
      LEFT JOIN Feedback f ON p.project_id = f.entity_id AND f.entity_type = 'project'
      WHERE p.status = 'approved' AND f.rating IS NOT NULL
      GROUP BY p.project_id, p.title
      HAVING rating_count > 0
      ORDER BY average_rating DESC, rating_count DESC
      LIMIT 5
    `);

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("Error fetching top rated projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top rated projects",
    });
  }
};

// Get top 5 highest-rated offerings
export const getTopRatedOfferings = async (req, res) => {
  try {
    const [offerings] = await pool.execute(`
      SELECT 
        o.offering_id,
        o.name,
        AVG(f.rating) as average_rating,
        COUNT(f.feedback_id) as rating_count
      FROM Offering o
      LEFT JOIN Feedback f ON o.offering_id = f.entity_id AND f.entity_type = 'offer'
      WHERE o.status = 'approved' AND f.rating IS NOT NULL
      GROUP BY o.offering_id, o.name
      HAVING rating_count > 0
      ORDER BY average_rating DESC, rating_count DESC
      LIMIT 5
    `);

    res.status(200).json({
      success: true,
      data: offerings,
    });
  } catch (error) {
    console.error("Error fetching top rated offerings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top rated offerings",
    });
  }
};

// Get top 5 highest-rated companies
export const getTopRatedCompanies = async (req, res) => {
  try {
    // First, try to get companies with direct feedback (entity_type = 'company')
    const [companies] = await pool.execute(`
      SELECT 
        c.company_id,
        c.company_name,
        AVG(f.rating) as average_rating,
        COUNT(f.feedback_id) as rating_count
      FROM Companies c
      LEFT JOIN Feedback f ON c.company_id = f.entity_id AND f.entity_type = 'company'
      WHERE c.status = 'approved' AND f.rating IS NOT NULL
      GROUP BY c.company_id, c.company_name
      HAVING rating_count > 0
      ORDER BY average_rating DESC, rating_count DESC
      LIMIT 5
    `);

    console.log('[Analytics] Direct company feedback - Found:', companies.length, 'companies');

    // If no companies with direct feedback, check through offerings
    if (companies.length === 0) {
      console.log('[Analytics] No direct company feedback found, checking through offerings...');
      const [companiesViaOfferings] = await pool.execute(`
        SELECT 
          c.company_id,
          c.company_name,
          AVG(f.rating) as average_rating,
          COUNT(DISTINCT f.feedback_id) as rating_count
        FROM Companies c
        INNER JOIN Offering o ON c.company_id = o.company_id
        LEFT JOIN Feedback f ON o.offering_id = f.entity_id AND f.entity_type = 'offer'
        WHERE c.status = 'approved' AND f.rating IS NOT NULL
        GROUP BY c.company_id, c.company_name
        HAVING rating_count > 0
        ORDER BY average_rating DESC, rating_count DESC
        LIMIT 5
      `);
      
      console.log('[Analytics] Companies via offerings - Found:', companiesViaOfferings.length, 'companies');
      
      res.status(200).json({
        success: true,
        data: companiesViaOfferings,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("Error fetching top rated companies:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top rated companies",
    });
  }
};
