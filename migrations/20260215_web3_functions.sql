-- A-LAB: WEB3 & SOCIAL EVOLUTION MIGRATION
-- This script adds the necessary functions for Astra rewards and DAO voting.

-- 1. Function to reward Astra for activity
create or replace function reward_astra_activity(
  p_resident_id uuid,
  p_amount int,
  p_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Increment balance in residents table
  update residents
  set 
    astra_balance = coalesce(astra_balance, 0) + p_amount,
    updated_at = now()
  where user_id = p_resident_id;

  -- Log the transaction
  insert into astra_transactions (
    resident_id,
    amount,
    type,
    metadata,
    status
  )
  values (
    p_resident_id,
    p_amount,
    'reward_' || p_type,
    p_metadata,
    'completed'
  );

  -- Log to global audit
  insert into audit_logs (event_type, description, metadata)
  values ('astra_reward', 'Resident ' || p_resident_id || ' rewarded ' || p_amount || ' for ' || p_type, p_metadata);
end;
$$;

-- 2. Function to claim Astra to wallet (simulated)
create or replace function claim_astra_to_wallet(
  p_resident_id uuid,
  p_wallet text,
  p_amount int
)
returns void
language plpgsql
security definer
as $$
begin
  -- Reset off-chain balance
  update residents
  set 
    astra_balance = astra_balance - p_amount,
    updated_at = now()
  where user_id = p_resident_id;

  -- Log the claim
  insert into astra_transactions (
    resident_id,
    amount,
    type,
    metadata,
    status
  )
  values (
    p_resident_id,
    -p_amount,
    'claim_to_wallet',
    jsonb_build_object('wallet', p_wallet),
    'completed'
  );
end;
$$;

-- 3. DAO Voting Function (placeholder for future real on-chain sync)
-- In a real app, this would verify a signature or interaction
create or replace function log_dao_vote(
  p_resident_id uuid,
  p_proposal_id text,
  p_support boolean,
  p_weight int
)
returns void
language plpgsql
security definer
as $$
begin
  insert into dao_votes (resident_id, proposal_id, support, weight)
  values (p_resident_id, p_proposal_id, p_support, p_weight);
end;
$$;
