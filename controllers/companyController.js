import dotenv from "dotenv";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlSDK } from "@aws-sdk/s3-request-presigner";
import * as Company from "../models/Company.js";
import * as Offering from "../models/Offering.js";

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
// =============== GET ALL COMPANIES ==============
// ================================================
export const getAllCompaniesController = async (req, res) => {
  try {
    const companies = await Company.getAllCompanies();
    console.log("fetch 1");
    // Generate signed URLs for profile images
    const companiesWithUrls = await Promise.all(
      companies.map(async (company) => {
        if (company.profile_image) {
          try {
            console.log("fetch 2");
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: company.profile_image,
            });
            company.profile_image_url = await getSignedUrlSDK(s3, command, {
              expiresIn: 3600,
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
    console.log("fetch 3");
    res.json({
      success: true,
      data: companiesWithUrls,
      count: companiesWithUrls.length,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching companies",
    });
  }
};

// ================================================
// =============== GET COMPANY BY ID ==============
// ================================================
export const getCompanyByIdController = async (req, res) => {
  try {
    const { company_id } = req.params;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required"
      });
    }

    const company = await Company.getCompanyByCompanyId(company_id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Generate signed URL for profile image
    if (company.profile_image) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: company.profile_image,
        });
        company.profile_image_url = await getSignedUrlSDK(s3, command, {
          expiresIn: 3600,
        });
      } catch (error) {
        console.error("Error generating signed URL:", error);
        company.profile_image_url = null;
      }
    }

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    console.error("Error fetching company by ID:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching company"
    });
  }
};

// ================================================
// =============== GET COMPANY ====================
// ================================================
export const getCompanyController = async (req, res) => {
  try {
    const { user_id, email } = req.params;

    // Fetch company by user_id or email
    let company;
    if (email) {
      company = await Company.getCompanyByEmail(email);
    } else if (user_id) {
      company = await Company.getCompanyById(user_id);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "user_id or email is required" });
    }

    if (!company)
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });

    // Generate signed URL for profile image if it exists
    if (company.profile_image) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: company.profile_image,
      });
      company.profile_image_url = await getSignedUrlSDK(s3, command, {
        expiresIn: 3600,
      });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching company" });
  }
};

// ================================================
// =============== UPDATE COMPANY =================
// ================================================
export const updateCompanyController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const data = req.body;
    console.log("Updating company with data:", data);
    const updatedCompany = await Company.updateCompanyById(user_id, data);
    console.log("Updated company result:", updatedCompany);
    res.json({ success: true, data: updatedCompany });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ success: false, message: "Error updating company" });
  }
};

// ================================================
// =============== UPLOAD PROFILE IMAGE ============
// ================================================
export const uploadCompanyFileController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const company = await Company.getCompanyById(user_id);

    if (!company)
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });

    let profile_image;

    // Check and upload profile image
    if (req.files && req.files.profile_image && req.files.profile_image[0]) {
      profile_image = req.files.profile_image[0].key;

      // Delete old profile image if exists
      if (company.profile_image) {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: company.profile_image,
            })
          );
        } catch (err) {
          console.error("Error deleting old profile image:", err);
        }
      }
    }

    if (!profile_image)
      return res.status(400).json({
        success: false,
        message: "No file was uploaded",
      });

    const updatedCompany = await Company.updateCompanyFiles(
      user_id,
      profile_image
    );

    // Add signed URL
    const response = { ...updatedCompany };
    if (updatedCompany.profile_image) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: updatedCompany.profile_image,
      });
      response.profile_image_url = await getSignedUrlSDK(s3, command, {
        expiresIn: 3600,
      });
    }

    res.json({
      success: true,
      message: "Profile image uploaded successfully",
      data: response,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
    });
  }
};

// ================================================
// =============== DELETE PROFILE IMAGE ============
// ================================================
export const deleteCompanyFileController = async (req, res) => {
  try {
    const { user_id } = req.params;

    const company = await Company.getCompanyById(user_id);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    if (!company.profile_image) {
      return res.status(404).json({
        success: false,
        message: "No profile image found for this company",
      });
    }

    // Delete from S3
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: company.profile_image,
        })
      );
    } catch (s3Error) {
      console.error("S3 deletion error:", s3Error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete file from storage",
      });
    }

    // Update database
    const updatedCompany = await Company.updateCompanyFiles(user_id, null);

    res.json({
      success: true,
      message: "Profile image deleted successfully",
      data: updatedCompany,
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
// =============== GET OFFERING ====================
// ================================================
export const getOfferingController = async (req, res) => {
  try {
    const { user_id } = req.params;

    // First get company_id from user_id
    const company = await Company.getCompanyById(user_id);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const offering = await Offering.getOfferingByCompanyId(company.company_id);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: "No offering found",
        notFound: true,
      });
    }

    console.log("Offering from DB:", offering);
    console.log("Images array:", offering.images);

    // Generate signed URLs for offering photos
    if (offering.images && Array.isArray(offering.images) && offering.images.length > 0) {
      const signedImageUrls = await Promise.all(
        offering.images.map(async (imageKey) => {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: imageKey,
            });
            return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
          } catch (error) {
            console.error("Error generating signed URL for:", imageKey, error);
            return null;
          }
        })
      );
      offering.offering_photos = signedImageUrls.filter(Boolean);
      console.log("Generated signed URLs:", offering.offering_photos);
    } else {
      offering.offering_photos = [];
    }

    res.json({ success: true, data: offering });
  } catch (error) {
    console.error("Error fetching offering:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching offering" });
  }
};

// ================================================
// ======= GET OFFERING BY COMPANY ID (PUBLIC) ====
// ================================================
export const getOfferingByCompanyIdController = async (req, res) => {
  try {
    const { company_id } = req.params;

    const offering = await Offering.getOfferingByCompanyId(company_id);

    if (!offering) {
      return res.status(404).json({
        success: false,
        message: "No offering found",
        notFound: true,
      });
    }

    // Generate signed URLs for offering photos
    if (offering.images && offering.images.length > 0) {
      offering.offering_photos = await Promise.all(
        offering.images.map(async (imageKey) => {
          try {
            const command = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: imageKey,
            });
            return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
          } catch (error) {
            console.error("Error generating signed URL:", error);
            return null;
          }
        })
      );
    }

    res.json({ success: true, data: offering });
  } catch (error) {
    console.error("Error fetching offering:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching offering" });
  }
};

// ================================================
// =============== CREATE OFFERING =================
// ================================================
export const createOfferingController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const data = req.body;

    // Get company_id from user_id
    const company = await Company.getCompanyById(user_id);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    // Validate type
    if (!data.type || !['sponser', 'service'].includes(data.type)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid offering type is required (sponser or service)" });
    }

    // Don't accept offering_photos in create payload - images should be uploaded separately
    delete data.offering_photos;

    // Check if offering already exists
    const existingOffering = await Offering.getOfferingByCompanyId(
      company.company_id
    );
    if (existingOffering) {
      return res.status(400).json({
        success: false,
        message: "Company already has an offering. Use update instead.",
      });
    }

    const result = await Offering.createOffering(company.company_id, data);

    res.status(201).json({
      success: true,
      message: "Offering created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating offering:", error);
    res
      .status(500)
      .json({ success: false, message: "Error creating offering" });
  }
};

// ================================================
// =============== UPDATE OFFERING =================
// ================================================
export const updateOfferingController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const data = req.body;

    // Get company_id from user_id
    const company = await Company.getCompanyById(user_id);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    // Don't accept offering_photos in update payload - images should be uploaded separately
    delete data.offering_photos;

    const offering = await Offering.updateOffering(company.company_id, data);

    res.json({
      success: true,
      message: "Offering updated successfully",
      data: offering,
    });
  } catch (error) {
    console.error("Error updating offering:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ 
        success: false, 
        message: error.message || "Error updating offering" 
      });
  }
};

// ================================================
// =============== BOOTH ASSIGNMENT ===============
// ================================================

// Get unassigned companies
export const getUnassignedCompaniesController = async (req, res) => {
  try {
    const companies = await Company.getUnassignedCompanies();
    res.json({
      success: true,
      data: companies,
      count: companies.length,
    });
  } catch (error) {
    console.error("Error fetching unassigned companies:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching unassigned companies",
    });
  }
};

// Assign booth to company
export const assignBoothToCompanyController = async (req, res) => {
  try {
    const { company_id } = req.params;
    const { booth_id } = req.body;

    if (!company_id || !booth_id) {
      return res.status(400).json({
        success: false,
        message: "company_id and booth_id are required",
      });
    }

    await Company.assignBoothToCompany(company_id, booth_id);

    res.json({
      success: true,
      message: "Booth assigned to company successfully",
    });
  } catch (error) {
    console.error("Error assigning booth to company:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning booth to company",});
  }}
// ========= GET ALL OFFERINGS (WITH SORTING) =====
// ================================================
export const getAllOfferingsController = async (req, res) => {
  try {
    const { sortBy, sortOrder } = req.query; // e.g., ?sortBy=rating&sortOrder=DESC
    let offerings = await Offering.getAllOfferings(sortBy, sortOrder);

    if (!offerings || offerings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No offerings found",
      });
    }

    // If user is a company, exclude their own offerings
    if (req.user && req.user.role === 'company') {
      try {
        const company = await Company.getCompanyById(req.user.userId);
        if (company && company.company_id) {
          // Filter out offerings that belong to this company
          offerings = offerings.filter(offering => 
            offering.company_id !== company.company_id
          );
        }
      } catch (err) {
        console.error("Error filtering company's offerings:", err);
        // Continue without filtering if there's an error
      }
    }

    // Generate signed URLs for offering photos
    for (const offering of offerings) {
      // Parse offering_photos JSON if needed
      if (
        offering.offering_photos &&
        typeof offering.offering_photos === "string"
      ) {
        try {
          offering.offering_photos = JSON.parse(offering.offering_photos);
        } catch (err) {
          console.error("Error parsing offering_photos JSON:", err);
          offering.offering_photos = [];
        }
      }

      if (offering.images && Array.isArray(offering.images) && offering.images.length > 0) {
        const signedUrls = await Promise.all(
          offering.images.map(async (imageKey) => {
            try {
              const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: imageKey,
              });
              return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
            } catch (error) {
              console.error("Error generating signed URL:", error);
              return null;
            }
          })
        );
        offering.offering_photos = signedUrls.filter(Boolean);
      } else if (
        Array.isArray(offering.offering_photos) &&
        offering.offering_photos.length > 0
      ) {
        // offering_photos already exists, ensure it's an array
        const signedUrls = await Promise.all(
          offering.offering_photos.map(async (imageKey) => {
            try {
              const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: imageKey,
              });
              return await getSignedUrlSDK(s3, command, { expiresIn: 3600 });
            } catch (error) {
              console.error("Error generating signed URL:", error);
              return null;
            }
          })
        );
        offering.offering_photos = signedUrls.filter(Boolean);
      } else {
        offering.offering_photos = [];
      }
    }

    res.json({
      success: true,
      data: offerings,
      count: offerings.length,
    });
  } catch (error) {
    console.error("Error fetching all offerings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching offerings",
    });
  }
};

// Unassign booth from company
export const unassignBoothFromCompanyController = async (req, res) => {
  try {
    const { company_id } = req.params;

    await Company.unassignBoothFromCompany(company_id);

    res.json({
      success: true,
      message: "Booth unassigned from company successfully",
    });
  } catch (error) {
    console.error("Error unassigning booth from company:", error);
    res.status(500).json({
      success: false,
      message: "Error unassigning booth from company",})
    }
  }


// ================================================
// ============= UPLOAD OFFERING IMAGES ===========
// ================================================
export const uploadOfferingImagesController = async (req, res) => {
  try {
    const { user_id } = req.params;
    
    console.log("=== Upload Offering Images ===");
    console.log("user_id:", user_id);
    console.log("req.files:", req.files);
    console.log("req.body:", req.body);
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: "User ID is required" 
      });
    }

    // Get company from user_id
    const company = await Company.getCompanyById(user_id);
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: "Company not found" 
      });
    }

    console.log("company_id:", company.company_id);

    // Get existing offering
    const offering = await Offering.getOfferingByCompanyId(company.company_id);
    if (!offering) {
      return res.status(404).json({
        success: false,
        message: "No offering found. Please create an offering first.",
      });
    }

    console.log("Existing offering images:", offering.images);

    // Get list of old image keys to keep (sent from frontend)
    let keepImageKeys = [];
    if (req.body.keepImages) {
      try {
        keepImageKeys = JSON.parse(req.body.keepImages);
        if (!Array.isArray(keepImageKeys)) keepImageKeys = [];
      } catch (e) {
        keepImageKeys = [];
      }
    }
    console.log("Images to keep:", keepImageKeys);

    // Get new uploaded images
    const newImageKeys = req.files && req.files.images 
      ? req.files.images.map((file) => file.key)
      : [];
    console.log("New image keys:", newImageKeys);

    // Get existing images
    let existingImageKeys = [];
    if (offering.images && Array.isArray(offering.images)) {
      existingImageKeys = offering.images.filter(
        (photo) => photo && typeof photo === 'string' && photo.trim().length > 0
      );
    }

    // Images to delete = existing images NOT in the keep list
    const imagesToDelete = existingImageKeys.filter(key => !keepImageKeys.includes(key));
    console.log("Images to delete:", imagesToDelete);

    // Delete old images that are no longer needed
    if (imagesToDelete.length > 0) {
      const deletionResults = await Promise.allSettled(
        imagesToDelete.map(async (key) => {
          try {
            const deleteCmd = new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: key,
            });
            return await s3.send(deleteCmd);
          } catch (err) {
            console.error("Error deleting old image:", key, err);
            return null;
          }
        })
      );

      deletionResults.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            "Failed to delete old image:",
            imagesToDelete[index],
            result.reason
          );
        }
      });
    }

    // Combine kept old images with new uploaded images
    const allImageKeys = [...keepImageKeys, ...newImageKeys];
    console.log("All image keys (old + new):", allImageKeys);

    // Update database with new images only
    const updatedOffering = await Offering.updateOffering(company.company_id, {
      offering_photos: allImageKeys,
    });

    // Generate signed URLs for response
    const signedUrls = await Promise.all(
      allImageKeys.map(async (key) => {
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
      message: "Offering images uploaded successfully",
      data: {
        ...updatedOffering,
        offering_photos: signedUrls.filter(Boolean),
        image_keys: allImageKeys,
      },
    });
  } catch (error) {
    console.error("Upload offering images error:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading offering images",
    });
  }
};
