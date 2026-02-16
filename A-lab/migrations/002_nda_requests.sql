-- ============================================================
-- NDA REQUESTS
-- ============================================================
create table if not exists nda_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  full_name text not null,
  email text not null,
  company text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  metadata jsonb default '{}'::jsonb
);

alter table nda_requests enable row level security;

-- Allow anyone (public) to submit an NDA request
create policy "nda_public_insert" on nda_requests
  for insert with check (true);

-- Allow admins to read all requests
create policy "nda_admin_read" on nda_requests
  for select using (
    exists (select 1 from residents where user_id = auth.uid() and is_admin = true)
  );

-- Allow admins to update status
create policy "nda_admin_update" on nda_requests
  for update using (
    exists (select 1 from residents where user_id = auth.uid() and is_admin = true)
  );
