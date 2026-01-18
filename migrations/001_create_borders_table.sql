-- Create borders table
-- Migration: Create borders table for map boundary management
-- Date: 2024-01-15

CREATE TABLE IF NOT EXISTS borders (
    border_id CHAR(36) PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('structural', 'zone', 'pathway')),
    orientation VARCHAR(20) NOT NULL CHECK (orientation IN ('horizontal', 'vertical')),
    x1 FLOAT NOT NULL,
    y1 FLOAT NOT NULL,
    x2 FLOAT NOT NULL,
    y2 FLOAT NOT NULL,
    length FLOAT NOT NULL,
    thickness INTEGER NOT NULL,
    stroke_style VARCHAR(20) NOT NULL CHECK (stroke_style IN ('solid', 'dashed', 'dotted')),
    color VARCHAR(10) NOT NULL,
    is_static BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create index on type for faster filtering
CREATE INDEX idx_borders_type ON borders(type);

-- Create index on is_static for permission checks
CREATE INDEX idx_borders_is_static ON borders(is_static);

-- Comments (MySQL 8.0+ supports column comments)
ALTER TABLE borders COMMENT = 'Stores map borders for structural walls, zones, and pathways';
