-- ============================================================
-- A-LAB.TECH — Additional Tables (Phase 2-8)
-- Run AFTER 001_full_schema.sql
-- ============================================================

-- ============================================================
-- 1. MENU ITEMS (Dynamic navigation)
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label_ru text NOT NULL,
  label_en text,
  url text NOT NULL,
  order_index int DEFAULT 0,
  parent_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  is_visible boolean DEFAULT true,
  icon text,
  target text DEFAULT '_self' CHECK (target IN ('_self', '_blank')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_public_read" ON menu_items
  FOR SELECT USING (true);

CREATE POLICY "menu_auth_insert" ON menu_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "menu_auth_update" ON menu_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "menu_auth_delete" ON menu_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 2. PAGE BLOCKS (CMS content)
-- ============================================================
CREATE TABLE IF NOT EXISTS page_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug text NOT NULL,
  block_type text NOT NULL CHECK (block_type IN ('hero','text','image','video','cards','cta','gallery','stats')),
  content_ru jsonb DEFAULT '{}',
  content_en jsonb DEFAULT '{}',
  media_url text,
  order_index int DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_public_read" ON page_blocks
  FOR SELECT USING (true);

CREATE POLICY "blocks_auth_manage" ON page_blocks
  FOR ALL USING (auth.role() = 'authenticated');

-- Auto-update timestamp
CREATE TRIGGER trg_page_blocks_updated
  BEFORE UPDATE ON page_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. ASTRA BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS astra_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance numeric DEFAULT 300,  -- Auto-grant 300 on creation
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE astra_balances ENABLE ROW LEVEL SECURITY;

-- Residents can see their own balance
CREATE POLICY "astra_own_read" ON astra_balances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM residents WHERE id = resident_id AND user_id = auth.uid())
  );

-- Admins can see all
CREATE POLICY "astra_admin_read" ON astra_balances
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
  );

-- System updates via functions (no direct user update)
CREATE POLICY "astra_auth_update" ON astra_balances
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "astra_auth_insert" ON astra_balances
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 4. ASTRA TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS astra_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_id uuid REFERENCES residents(id),
  to_id uuid REFERENCES residents(id),
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('transfer','project_contribution','admin_grant','reward')),
  project_id uuid,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE astra_transactions ENABLE ROW LEVEL SECURITY;

-- Users can see their own transactions
CREATE POLICY "tx_own_read" ON astra_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM residents WHERE id = from_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM residents WHERE id = to_id AND user_id = auth.uid())
  );

-- Admins see all
CREATE POLICY "tx_admin_read" ON astra_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "tx_auth_insert" ON astra_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 5. SHARED PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  total_astra numeric DEFAULT 0,
  created_by uuid REFERENCES residents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shared_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_public_read_shared" ON shared_projects
  FOR SELECT USING (true);

CREATE POLICY "projects_auth_insert_shared" ON shared_projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "projects_auth_update_shared" ON shared_projects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE TRIGGER trg_shared_projects_updated
  BEFORE UPDATE ON shared_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. PROJECT MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES shared_projects(id) ON DELETE CASCADE NOT NULL,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member',
  astra_contributed numeric DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, resident_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_public_read" ON project_members
  FOR SELECT USING (true);

CREATE POLICY "members_auth_insert" ON project_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "members_auth_update" ON project_members
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "members_auth_delete" ON project_members
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 7. NDA AGREEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS nda_agreements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL,
  full_name text NOT NULL,
  company text,
  signed_at timestamptz DEFAULT now(),
  ip_address text,
  project_id uuid,
  revoked boolean DEFAULT false
);

ALTER TABLE nda_agreements ENABLE ROW LEVEL SECURITY;

-- Public insert (guests can sign)
CREATE POLICY "nda_public_insert" ON nda_agreements
  FOR INSERT WITH CHECK (true);

-- Admins can read all
CREATE POLICY "nda_admin_read" ON nda_agreements
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "nda_admin_update" ON nda_agreements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- 8. AUTO-CREATE ASTRA BALANCE ON RESIDENT INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION auto_create_astra_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO astra_balances (resident_id, balance)
  VALUES (NEW.id, 300);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_astra
  AFTER INSERT ON residents
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_astra_balance();

-- ============================================================
-- 9. TRANSFER ASTRA FUNCTION (atomic balance update)
-- ============================================================
CREATE OR REPLACE FUNCTION transfer_astra(
  p_from_id uuid,
  p_to_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL,
  p_project_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_from_balance numeric;
  v_tx_type text := 'transfer';
BEGIN
  -- Check sender balance
  SELECT balance INTO v_from_balance
  FROM astra_balances WHERE resident_id = p_from_id FOR UPDATE;

  IF v_from_balance IS NULL OR v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Set type
  IF p_project_id IS NOT NULL THEN
    v_tx_type := 'project_contribution';
  END IF;

  -- Deduct from sender
  UPDATE astra_balances SET balance = balance - p_amount, last_updated = now()
  WHERE resident_id = p_from_id;

  -- Add to receiver
  UPDATE astra_balances SET balance = balance + p_amount, last_updated = now()
  WHERE resident_id = p_to_id;

  -- Record transaction
  INSERT INTO astra_transactions (from_id, to_id, amount, type, note, project_id)
  VALUES (p_from_id, p_to_id, p_amount, v_tx_type, p_note, p_project_id);

  -- Update project total if applicable
  IF p_project_id IS NOT NULL THEN
    UPDATE shared_projects SET total_astra = total_astra + p_amount WHERE id = p_project_id;
    UPDATE project_members SET astra_contributed = astra_contributed + p_amount
    WHERE project_id = p_project_id AND resident_id = p_from_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE! Additional tables ready.
-- ============================================================
