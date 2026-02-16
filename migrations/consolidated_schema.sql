-- ============================================================
-- A-LAB.TECH — CONSOLIDATED DATABASE SCHEMA
-- Combine this into the Supabase SQL Editor
-- ============================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RESIDENTS
CREATE TABLE IF NOT EXISTS residents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now(),
  full_name text NOT NULL,
  role text,
  bio text,
  avatar_url text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'busy', 'away')),
  skills jsonb DEFAULT '[]'::jsonb,
  links jsonb DEFAULT '{}'::jsonb,
  is_admin boolean DEFAULT false
);

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "residents_public_read" ON residents FOR SELECT USING (true);
CREATE POLICY "residents_own_update" ON residents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "residents_own_insert" ON residents FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. PROJECTS (Static Content)
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('marketing', 'design', 'rd')),
  result_value text,
  result_label text,
  description text,
  lang text DEFAULT 'ru' CHECK (lang IN ('ru', 'en')),
  order_index int DEFAULT 0,
  image_url text,
  link_text text,
  is_locked boolean DEFAULT false
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_public_read" ON projects FOR SELECT USING (true);
CREATE POLICY "projects_auth_manage" ON projects FOR ALL USING (auth.role() = 'authenticated');

-- 3. POSTS (Feed)
CREATE TABLE IF NOT EXISTS posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES residents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (true);
CREATE POLICY "posts_own_manage" ON posts FOR ALL USING (
  EXISTS (SELECT 1 FROM residents WHERE id = author_id AND user_id = auth.uid()) OR 
  EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
);

-- 4. LEADS
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  name text NOT NULL,
  contact text NOT NULL,
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  message text,
  source_detail text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads_admin_read" ON leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leads_public_insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "leads_admin_update" ON leads FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. PORTFOLIO
CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE NOT NULL,
  title text,
  image_url text NOT NULL,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'residents_only', 'private')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portfolio_read" ON portfolio_items FOR SELECT USING (
  visibility = 'public' OR 
  (visibility = 'residents_only' AND auth.role() = 'authenticated') OR
  EXISTS (SELECT 1 FROM residents WHERE id = resident_id AND user_id = auth.uid())
);
CREATE POLICY "portfolio_own_manage" ON portfolio_items FOR ALL USING (
  EXISTS (SELECT 1 FROM residents WHERE id = resident_id AND user_id = auth.uid())
);

-- 6. ASTRA BALANCES
CREATE TABLE IF NOT EXISTS astra_balances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance numeric DEFAULT 300,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE astra_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "astra_read" ON astra_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM residents WHERE id = resident_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "astra_system_update" ON astra_balances FOR UPDATE USING (auth.role() = 'authenticated');

-- 7. ASTRA TRANSACTIONS
CREATE TABLE IF NOT EXISTS astra_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_id uuid REFERENCES residents(id),
  to_id uuid REFERENCES residents(id),
  amount numeric NOT NULL,
  type text NOT NULL,
  reason text,
  project_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE astra_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx_read" ON astra_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM residents WHERE id = from_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM residents WHERE id = to_id AND user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "tx_insert" ON astra_transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 8. SHARED PROJECTS
CREATE TABLE IF NOT EXISTS shared_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text DEFAULT 'active',
  total_astra numeric DEFAULT 0,
  created_by uuid REFERENCES residents(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shared_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shared_projects_read" ON shared_projects FOR SELECT USING (true);
CREATE POLICY "shared_projects_manage" ON shared_projects FOR ALL USING (auth.role() = 'authenticated');

-- 9. PROJECT MEMBERS
CREATE TABLE IF NOT EXISTS project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES shared_projects(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  astra_contributed numeric DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, resident_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read" ON project_members FOR SELECT USING (true);
CREATE POLICY "members_manage" ON project_members FOR ALL USING (auth.role() = 'authenticated');

-- 10. PAGE BLOCKS & MENU
CREATE TABLE IF NOT EXISTS page_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_slug text NOT NULL,
  block_type text NOT NULL,
  content jsonb DEFAULT '{}',
  order_index int DEFAULT 0,
  is_visible boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label_ru text NOT NULL,
  label_en text,
  url text NOT NULL,
  order_index int DEFAULT 0,
  is_visible boolean DEFAULT true
);

-- 11. NDA AGREEMENTS
CREATE TABLE IF NOT EXISTS nda_agreements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL,
  full_name text NOT NULL,
  company text,
  signed_at timestamptz DEFAULT now(),
  project_id uuid,
  revoked boolean DEFAULT false
);

-- 12. SYSTEM LOGS
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text,
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- FUNCTIONS & TRIGGERS
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

-- DONE
