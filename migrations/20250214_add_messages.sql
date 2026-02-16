-- ============================================================
-- A-LAB.TECH — MESSENGER SYSTEM MIGRATION
-- Apply this in the Supabase SQL Editor
-- ============================================================

-- 1. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES residents(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES residents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES
-- Users can see messages where they are either the sender or the receiver
CREATE POLICY "messages_read" ON messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM residents WHERE id = sender_id OR id = receiver_id
    )
  );

-- Users can only send messages where they are the sender
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM residents WHERE id = sender_id
    )
  );

-- Admin can see all messages (Optional, for moderations)
-- CREATE POLICY "messages_admin_all" ON messages FOR ALL USING (
--   EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
-- );

-- 4. REALTIME
-- Enable realtime for the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
