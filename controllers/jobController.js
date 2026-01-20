import * as JobOffer from "../models/JobOffer.js";
import * as JobApplication from "../models/JobApplication.js";
import * as Company from "../models/Company.js";
import * as Student from "../models/Student.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// ==================== JOB OFFERS ====================

// Create job offer (company only)
export const createJobOfferController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, description, job_type, location, salary_range, requirements, responsibilities, deadline } = req.body;

    // Get company_id from user_id
    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Check if company is approved
    if (company.status !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: "Your company must be approved before posting job offers" 
      });
    }

    const job_id = await JobOffer.createJobOffer(company.company_id, {
      title,
      description,
      job_type,
      location,
      salary_range,
      requirements,
      responsibilities,
      deadline
    });

    res.status(201).json({
      success: true,
      message: "Job offer created successfully",
      data: { job_id }
    });
  } catch (error) {
    console.error("Error creating job offer:", error);
    res.status(500).json({ success: false, message: "Failed to create job offer" });
  }
};

// Get all active job offers (public - for students)
export const getAllJobOffersController = async (req, res) => {
  try {
    const jobs = await JobOffer.getAllActiveJobOffers();
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error("Error fetching job offers:", error);
    res.status(500).json({ success: false, message: "Failed to fetch job offers" });
  }
};

// Get job offers by company (company own jobs)
export const getCompanyJobOffersController = async (req, res) => {
  try {
    const { userId } = req.user;

    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const jobs = await JobOffer.getJobOffersByCompany(company.company_id);
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error("Error fetching company job offers:", error);
    res.status(500).json({ success: false, message: "Failed to fetch job offers" });
  }
};

// Get single job offer by ID (public)
export const getJobOfferByIdController = async (req, res) => {
  try {
    const { job_id } = req.params;
    const job = await JobOffer.getJobOfferById(job_id);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job offer not found" });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    console.error("Error fetching job offer:", error);
    res.status(500).json({ success: false, message: "Failed to fetch job offer" });
  }
};

// Update job offer (company only)
export const updateJobOfferController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { job_id } = req.params;
    const { title, description, job_type, location, salary_range, requirements, responsibilities, deadline, is_active } = req.body;

    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Verify job belongs to company
    const isOwner = await JobOffer.isJobOwnedByCompany(job_id, company.company_id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await JobOffer.updateJobOffer(job_id, {
      title,
      description,
      job_type,
      location,
      salary_range,
      requirements,
      responsibilities,
      deadline,
      is_active
    });

    res.json({ success: true, message: "Job offer updated successfully" });
  } catch (error) {
    console.error("Error updating job offer:", error);
    res.status(500).json({ success: false, message: "Failed to update job offer" });
  }
};

// Delete job offer (company only)
export const deleteJobOfferController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { job_id } = req.params;

    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Verify job belongs to company
    const isOwner = await JobOffer.isJobOwnedByCompany(job_id, company.company_id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await JobOffer.deleteJobOffer(job_id);
    res.json({ success: true, message: "Job offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting job offer:", error);
    res.status(500).json({ success: false, message: "Failed to delete job offer" });
  }
};

// Toggle job active status (company only)
export const toggleJobStatusController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { job_id } = req.params;
    const { is_active } = req.body;

    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const isOwner = await JobOffer.isJobOwnedByCompany(job_id, company.company_id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await JobOffer.toggleJobStatus(job_id, is_active);
    res.json({ success: true, message: `Job offer ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error("Error toggling job status:", error);
    res.status(500).json({ success: false, message: "Failed to toggle job status" });
  }
};

// ==================== JOB APPLICATIONS ====================

// Apply to job (student only)
export const applyToJobController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { job_id } = req.params;
    
    // Debug logging
    console.log('Apply to job - req.body:', req.body);
    console.log('Apply to job - typeof req.body:', typeof req.body);
    console.log('Apply to job - cover_letter value:', req.body?.cover_letter);
    
    const cover_letter = req.body?.cover_letter || null;

    // Get student_id from user_id
    const student = await Student.getStudentById(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Check if job exists and is active
    const job = await JobOffer.getJobOfferById(job_id);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job offer not found" });
    }
    if (!job.is_active) {
      return res.status(400).json({ success: false, message: "This job is no longer accepting applications" });
    }

    // Check if already applied
    const hasApplied = await JobApplication.hasStudentApplied(job_id, student.student_id);
    if (hasApplied) {
      return res.status(400).json({ success: false, message: "You have already applied to this job" });
    }

    const application_id = await JobApplication.createJobApplication(job_id, student.student_id, cover_letter);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: { application_id }
    });
  } catch (error) {
    console.error("Error applying to job:", error);
    res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

// Get applications for a job (company only - to review applications)
export const getJobApplicationsController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { job_id } = req.params;

    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Verify job belongs to company
    const isOwner = await JobOffer.isJobOwnedByCompany(job_id, company.company_id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const applications = await JobApplication.getApplicationsByJob(job_id);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error("Error fetching job applications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

// Get student's applications (student only)
export const getMyApplicationsController = async (req, res) => {
  try {
    const { userId } = req.user;

    const student = await Student.getStudentById(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const applications = await JobApplication.getApplicationsByStudent(student.student_id);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error("Error fetching student applications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

// Get all applications for company's jobs (company dashboard)
export const getCompanyApplicationsController = async (req, res) => {
  try {
    const { userId } = req.user;

    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const applications = await JobApplication.getApplicationsByCompany(company.company_id);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error("Error fetching company applications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

// Check if student has applied to a specific job
export const checkApplicationStatusController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { job_id } = req.params;

    const student = await Student.getStudentById(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const hasApplied = await JobApplication.hasStudentApplied(job_id, student.student_id);
    res.json({ success: true, data: { hasApplied } });
  } catch (error) {
    console.error("Error checking application status:", error);
    res.status(500).json({ success: false, message: "Failed to check application status" });
  }
};

// Download CV - Generate pre-signed URL
export const downloadCVController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { application_id } = req.params;

    // Get the application details
    const application = await JobApplication.getApplicationById(application_id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Verify company owns the job
    const company = await Company.getCompanyById(userId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const isOwner = await JobOffer.isJobOwnedByCompany(application.job_id, company.company_id);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if CV exists
    if (!application.cv_name) {
      return res.status(404).json({ success: false, message: "CV not found" });
    }

    // Generate pre-signed URL
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: application.cv_name
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    res.json({ 
      success: true, 
      data: { 
        url: signedUrl,
        fileName: application.cv_name.split('/').pop()
      } 
    });
  } catch (error) {
    console.error("Error generating CV download URL:", error);
    res.status(500).json({ success: false, message: "Failed to generate download URL" });
  }
};
