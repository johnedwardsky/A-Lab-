-- Migration: Add project_id column to posts table
-- This allows feed posts to be linked to specific R&D projects
-- Run this in Supabase SQL Editor

ALTER TABLE posts ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT NULL;

-- Index for filtering posts by project
CREATE INDEX IF NOT EXISTS idx_posts_project_id ON posts(project_id) WHERE project_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN posts.project_id IS 'Links a post to an R&D project. Values: M01, ARACHNID, AIR_BRIDGES, VTEMNOTE, RD_OS, MATRIX_CORE, NEURAL_UI';
