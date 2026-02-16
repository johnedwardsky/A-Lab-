-- ============================================================
-- A-LAB: RESIDENT APPLICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS resident_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  full_name text,
  telegram text NOT NULL,
  strength text,
  experience text,
  bio text,
  recommender_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  processed_at timestamptz
);

-- RLS
ALTER TABLE resident_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an application
CREATE POLICY "anyone_insert_application" ON resident_applications 
  FOR INSERT WITH CHECK (true);

-- Only admins can read/update all applications
CREATE POLICY "admins_manage_applications" ON resident_applications 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM residents 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Function to notify when application is updated (optional, for future)
