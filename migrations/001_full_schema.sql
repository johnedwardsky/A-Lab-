-- ============================================================
-- A-LAB.TECH — Complete Database Schema
-- Run this in Supabase SQL Editor (one-time setup)
-- ============================================================

-- 0. Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROJECTS (Marketing, Design, R&D cases)
-- ============================================================
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  title text not null,
  category text not null check (category in ('marketing', 'design', 'rd')),
  result_value text,
  result_label text,
  description text,
  lang text default 'ru' check (lang in ('ru', 'en')),
  order_index int default 0,
  image_url text,
  link_text text,
  is_locked boolean default false
);

alter table projects enable row level security;

create policy "projects_public_read" on projects
  for select using (true);

create policy "projects_auth_insert" on projects
  for insert with check (auth.role() = 'authenticated');

create policy "projects_auth_update" on projects
  for update using (auth.role() = 'authenticated');

create policy "projects_auth_delete" on projects
  for delete using (auth.role() = 'authenticated');

-- ============================================================
-- 2. RESIDENTS (Community member profiles)
-- ============================================================
create table if not exists residents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now(),
  full_name text not null,
  role text,
  bio text,
  avatar_url text,
  status text default 'open' check (status in ('open', 'busy', 'away')),
  skills jsonb default '[]'::jsonb,
  links jsonb default '{}'::jsonb,
  is_admin boolean default false
);

alter table residents enable row level security;

create policy "residents_public_read" on residents
  for select using (true);

create policy "residents_own_update" on residents
  for update using (auth.uid() = user_id);

create policy "residents_own_insert" on residents
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 3. POSTS (Social feed)
-- ============================================================
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references residents(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

alter table posts enable row level security;

create policy "posts_public_read" on posts
  for select using (true);

create policy "posts_own_insert" on posts
  for insert with check (
    exists (select 1 from residents where id = author_id and user_id = auth.uid())
  );

create policy "posts_own_update" on posts
  for update using (
    exists (select 1 from residents where id = author_id and user_id = auth.uid())
  );

create policy "posts_own_delete" on posts
  for delete using (
    exists (select 1 from residents where id = author_id and user_id = auth.uid())
  );

-- ============================================================
-- 4. LEADS (Form submissions)
-- ============================================================
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  contact text not null,
  source text,
  status text default 'new' check (status in ('new', 'contacted', 'closed')),
  message text,
  metadata jsonb default '{}'::jsonb
);

alter table leads enable row level security;

create policy "leads_auth_read" on leads
  for select using (auth.role() = 'authenticated');

create policy "leads_public_insert" on leads
  for insert with check (true);

create policy "leads_auth_update" on leads
  for update using (auth.role() = 'authenticated');

-- ============================================================
-- 5. PORTFOLIO ITEMS (Resident gallery works)
-- ============================================================
create table if not exists portfolio_items (
  id uuid default gen_random_uuid() primary key,
  resident_id uuid references residents(id) on delete cascade not null,
  title text,
  description text,
  image_url text not null,
  tags text[] default '{}',
  visibility text default 'public' check (visibility in ('public', 'residents_only', 'private')),
  created_at timestamptz default now()
);

alter table portfolio_items enable row level security;

create policy "portfolio_public_read" on portfolio_items
  for select using (visibility = 'public' or (
    visibility = 'residents_only' and auth.role() = 'authenticated'
  ) or (
    exists (select 1 from residents where id = resident_id and user_id = auth.uid())
  ));

create policy "portfolio_own_insert" on portfolio_items
  for insert with check (
    exists (select 1 from residents where id = resident_id and user_id = auth.uid())
  );

create policy "portfolio_own_delete" on portfolio_items
  for delete using (
    exists (select 1 from residents where id = resident_id and user_id = auth.uid())
  );

-- ============================================================
-- 6. R&D TICKETS
-- ============================================================
create table if not exists rd_tickets (
  id uuid default gen_random_uuid() primary key,
  ticket_number text unique,
  author_id uuid references residents(id) on delete cascade,
  title text not null,
  content text,
  status text default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table rd_tickets enable row level security;

create policy "rd_tickets_auth_read" on rd_tickets
  for select using (auth.role() = 'authenticated');

create policy "rd_tickets_own_insert" on rd_tickets
  for insert with check (
    exists (select 1 from residents where id = author_id and user_id = auth.uid())
  );

create policy "rd_tickets_own_update" on rd_tickets
  for update using (
    exists (select 1 from residents where id = author_id and user_id = auth.uid())
  );

-- ============================================================
-- 7. R&D RESPONSES
-- ============================================================
create table if not exists rd_responses (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references rd_tickets(id) on delete cascade not null,
  responder_id uuid references residents(id),
  content text not null,
  created_at timestamptz default now()
);

alter table rd_responses enable row level security;

create policy "rd_responses_auth_read" on rd_responses
  for select using (auth.role() = 'authenticated');

create policy "rd_responses_auth_insert" on rd_responses
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- 8. NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references residents(id) on delete cascade not null,
  type text not null, -- mention, new_post, rd_response, lead, system
  title text,
  message text,
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "notifications_own_read" on notifications
  for select using (
    exists (select 1 from residents where id = recipient_id and user_id = auth.uid())
  );

create policy "notifications_own_update" on notifications
  for update using (
    exists (select 1 from residents where id = recipient_id and user_id = auth.uid())
  );

create policy "notifications_auth_insert" on notifications
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- 9. SYSTEM LOGS
-- ============================================================
create table if not exists system_logs (
  id uuid default gen_random_uuid() primary key,
  event_type text not null,
  user_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table system_logs enable row level security;

create policy "logs_auth_read" on system_logs
  for select using (auth.role() = 'authenticated');

create policy "logs_auth_insert" on system_logs
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- 10. TICKET NUMBER AUTO-GENERATION
-- ============================================================
create or replace function generate_ticket_number()
returns trigger as $$
begin
  new.ticket_number := '#RD-' || lpad(floor(random() * 9999 + 1)::text, 4, '0') || '-' || chr(65 + floor(random() * 26)::int);
  return new;
end;
$$ language plpgsql;

create trigger trg_ticket_number
  before insert on rd_tickets
  for each row
  when (new.ticket_number is null)
  execute function generate_ticket_number();

-- ============================================================
-- 11. AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_residents_updated_at
  before update on residents
  for each row
  execute function update_updated_at();

create trigger trg_rd_tickets_updated_at
  before update on rd_tickets
  for each row
  execute function update_updated_at();

-- ============================================================
-- 12. STORAGE BUCKETS (run these manually in Supabase Dashboard)
-- ============================================================
-- Go to Storage → New Bucket:
--   1. "avatars" (public)
--   2. "portfolio" (public)
--
-- Then set policies:
-- avatars:
--   SELECT: allow all (public)
--   INSERT: allow authenticated
--   UPDATE: allow owner (using metadata.owner = auth.uid())
--   DELETE: allow owner
--
-- portfolio:
--   SELECT: allow all (public)
--   INSERT: allow authenticated
--   DELETE: allow owner

-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
