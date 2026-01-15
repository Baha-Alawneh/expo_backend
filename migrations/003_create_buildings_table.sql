-- Migration: Create buildings table
-- Purpose: Store campus building information with position and size data
-- Date: 2026-01-11

CREATE TABLE IF NOT EXISTS buildings (
  building_id CHAR(36) PRIMARY KEY,
  building_number VARCHAR(10),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  color VARCHAR(20),
  stroke_color VARCHAR(20),
  label_color VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert initial building data (with 2400px shift applied for 8000px canvas)
INSERT INTO buildings (building_id, building_number, name, description, x, y, width, height, color, stroke_color, label_color)
VALUES 
  (UUID(), '13', 'Library', 'An-Najah National University Library - Main academic resource center with extensive collections and study spaces.', 4020, 30, 280, 180, '#e5e7eb', '#6b7280', '#374151'),
  (UUID(), '8', 'Auditorium', 'Main auditorium for large events, conferences, and gatherings.', 3500, 580, 340, 240, '#dbeafe', '#3b82f6', '#1e40af'),
  (UUID(), '2', 'School of Fine Arts', 'Faculty of Fine Arts - Creative arts, design, and visual arts programs.', 3280, 990, 280, 220, '#fef3c7', '#f59e0b', '#92400e'),
  (UUID(), NULL, 'Engineering Building', 'Faculty of Engineering - Main engineering departments and laboratories.', 4620, 220, 200, 280, '#e0e7ff', '#6366f1', '#3730a3');
