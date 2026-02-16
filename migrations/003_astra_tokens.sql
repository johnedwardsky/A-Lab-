-- ============================================================
-- ASTRA TOKENS SYSTEM
-- ============================================================

-- 1. Astra Wallets (Stored balance per resident)
create table if not exists astra_wallets (
  id uuid default gen_random_uuid() primary key,
  resident_id uuid references residents(id) on delete cascade unique not null,
  balance numeric(20, 2) default 0.00 not null check (balance >= 0),
  updated_at timestamptz default now()
);

-- 2. Astra Transactions (History of all movements)
create table if not exists astra_transactions (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references residents(id), -- NULL if system minting
  receiver_id uuid references residents(id), -- NULL if system burning (e.g., project investment)
  amount numeric(20, 2) not null check (amount > 0),
  tx_type text not null check (tx_type in ('transfer', 'investment', 'reward', 'refund', 'mint')),
  reference_id uuid, -- Optional link to project_id or other entity
  description text,
  created_at timestamptz default now()
);

-- 3. Update Projects Table
alter table projects add column if not exists astra_budget numeric(20, 2) default 0;
alter table projects add column if not exists astra_funding_collected numeric(20, 2) default 0;

-- 4. Project Contributions (Residents investing in a project)
create table if not exists project_contributions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  resident_id uuid references residents(id) on delete cascade not null,
  amount numeric(20, 2) not null check (amount > 0),
  created_at timestamptz default now(),
  unique(project_id, resident_id)
);

-- 5. RLS POLICIES
alter table astra_wallets enable row level security;
alter table astra_transactions enable row level security;
alter table project_contributions enable row level security;

-- Wallets: Only owner can read balance
create policy "wallets_own_read" on astra_wallets
  for select using (
    exists (select 1 from residents where id = astra_wallets.resident_id and user_id = auth.uid())
  );

-- Transactions: Involved parties can see history
create policy "transactions_own_read" on astra_transactions
  for select using (
    exists (select 1 from residents where (id = sender_id or id = receiver_id) and user_id = auth.uid())
  );

-- Contributions: Public can see project funding stats
create policy "contributions_public_read" on project_contributions
  for select using (true);

-- 6. RPC: Atomic Contribution Function
-- Usage: supabase.rpc('contribute_astra', { p_project_id: '...', p_amount: 100 })
create or replace function contribute_astra(
  p_project_id uuid,
  p_amount numeric
) returns void as $$
declare
  v_res_id uuid;
begin
  -- Get resident ID of current user
  select id into v_res_id from residents where user_id = auth.uid();
  
  if v_res_id is null then
    raise exception 'Resident profile not found.';
  end if;

  -- 1. Check and deduct balance
  update astra_wallets
  set balance = balance - p_amount, updated_at = now()
  where resident_id = v_res_id and balance >= p_amount;

  if not found then
    raise exception 'Insufficient Astra tokens balance.';
  end if;

  -- 2. Upsert contribution record
  insert into project_contributions (project_id, resident_id, amount)
  values (p_project_id, v_res_id, p_amount)
  on conflict (project_id, resident_id)
  do update set amount = project_contributions.amount + excluded.amount;

  -- 3. Update project collected amount
  update projects
  set astra_funding_collected = astra_funding_collected + p_amount
  where id = p_project_id;

  -- 4. Log transaction
  insert into astra_transactions (sender_id, receiver_id, amount, tx_type, reference_id, description)
  values (v_res_id, null, p_amount, 'investment', p_project_id, 'Contribution to project development');

end;
$$ language plpgsql security definer;

-- 7. Trigger: Auto-create wallet for new residents
create or replace function public.handle_new_resident_wallet()
returns trigger as $$
begin
  insert into public.astra_wallets (resident_id, balance)
  values (new.id, 100); -- Initial gift of 100 tokens
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_create_wallet
after insert on public.residents
for each row execute function public.handle_new_resident_wallet();
