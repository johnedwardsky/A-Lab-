-- ============================================================
-- UPDATE RESIDENT APPLICATIONS SCHEMA
-- ============================================================

-- Add email and requested_id columns
ALTER TABLE resident_applications 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS requested_id text;

-- Update RLS if needed (already set in previous migrations, but ensuring it works for email)
-- Usually no change needed to RLS if it's based on table columns.
