-- ============================================================
-- DAO GOVERNANCE SYSTEM
-- ============================================================

-- 1. DAO Proposals
create table if not exists dao_proposals (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references residents(id) on delete set null,
  title text not null,
  description text not null,
  status text default 'active' check (status in ('active', 'passed', 'failed', 'cancelled')),
  category text default 'general',
  ends_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- 2. DAO Votes
create table if not exists dao_votes (
  proposal_id uuid references dao_proposals(id) on delete cascade not null,
  resident_id uuid references residents(id) on delete cascade not null,
  support boolean not null,
  weight numeric(20, 2) not null,
  created_at timestamptz default now(),
  primary key (proposal_id, resident_id)
);

-- 3. RLS POLICIES
alter table dao_proposals enable row level security;
alter table dao_votes enable row level security;

-- Proposals: Everyone can read
create policy "proposals_read_all" on dao_proposals for select using (true);
-- Proposals: Residents can create
create policy "proposals_create_residents" on dao_proposals for insert with check (
  exists (select 1 from residents where id = dao_proposals.creator_id and user_id = auth.uid())
);

-- Votes: Everyone can read
create policy "votes_read_all" on dao_votes for select using (true);
-- Votes: Residents can vote
create policy "votes_create_residents" on dao_votes for insert with check (
  exists (select 1 from residents where id = dao_votes.resident_id and user_id = auth.uid())
);

-- 4. View for Proposal Stats
create or replace view dao_proposal_stats as
select 
  p.id as proposal_id,
  coalesce(sum(case when v.support then v.weight else 0 end), 0) as votes_for,
  coalesce(sum(case when not v.support then v.weight else 0 end), 0) as votes_against,
  count(v.resident_id) as total_voters
from dao_proposals p
left join dao_votes v on p.id = v.proposal_id
group by p.id;

-- 5. RPC: Submit Vote
-- Automatically fetches weight from astra_wallets
create or replace function submit_dao_vote(
  p_proposal_id uuid,
  p_support boolean
) returns void as $$
declare
  v_res_id uuid;
  v_weight numeric;
begin
  -- Get resident ID
  select id into v_res_id from residents where user_id = auth.uid();
  if v_res_id is null then raise exception 'Resident profile not found.'; end if;

  -- Get current Astra balance for weight
  select balance into v_weight from astra_wallets where resident_id = v_res_id;
  if v_weight is null then v_weight := 0; end if;
  if v_weight <= 0 then raise exception 'You need Astra tokens to vote.'; end if;

  -- Upsert vote
  insert into dao_votes (proposal_id, resident_id, support, weight)
  values (p_proposal_id, v_res_id, p_support, v_weight)
  on conflict (proposal_id, resident_id)
  do update set support = p_support, weight = v_weight, created_at = now();
end;
$$ language plpgsql security definer;
