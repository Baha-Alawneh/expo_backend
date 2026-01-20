-- Fix JobOffers table by dropping and recreating it properly

DROP TABLE IF EXISTS JobApplications;
DROP TABLE IF EXISTS JobOffers;

-- Create JobOffers table with all columns
CREATE TABLE JobOffers (
  job_id CHAR(36) NOT NULL,
  company_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  job_type ENUM('internship', 'full-time', 'part-time', 'contract') NOT NULL,
  location VARCHAR(255) NOT NULL,
  salary_range VARCHAR(100) DEFAULT NULL,
  requirements TEXT DEFAULT NULL,
  responsibilities TEXT DEFAULT NULL,
  deadline DATE DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (job_id),
  KEY idx_company_id (company_id),
  KEY idx_job_type (job_type),
  KEY idx_is_active (is_active),
  KEY idx_created_at (created_at),
  CONSTRAINT fk_joboffers_company FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Recreate JobApplications table
CREATE TABLE JobApplications (
  application_id CHAR(36) NOT NULL,
  job_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  cover_letter TEXT DEFAULT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (application_id),
  UNIQUE KEY unique_application (job_id, student_id),
  KEY idx_job_id (job_id),
  KEY idx_student_id (student_id),
  KEY idx_applied_at (applied_at),
  CONSTRAINT fk_jobapplications_job FOREIGN KEY (job_id) REFERENCES JobOffers(job_id) ON DELETE CASCADE,
  CONSTRAINT fk_jobapplications_student FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
