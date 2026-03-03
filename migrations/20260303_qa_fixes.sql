-- ============================================================
-- A-LAB: QA FIXES & ENHANCEMENTS (PHASE 2)
-- Run in Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Add `last_seen` column to residents for the "Online" widget
-- ----------------------------------------------------------------
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create a fast update function that the front-end can call periodically
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void AS $$
BEGIN
    UPDATE public.residents
    SET last_seen = NOW()
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- 2. dao_polls — NEW: admin-created voting polls for residents
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dao_polls (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    description   TEXT,
    option_pro    TEXT DEFAULT 'YES',
    option_con    TEXT DEFAULT 'NO',
    votes_pro     INTEGER DEFAULT 0,
    votes_con     INTEGER DEFAULT 0,
    deadline      TIMESTAMPTZ NOT NULL,
    status        TEXT DEFAULT 'active', -- active, closed
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In a real system you'd want a `dao_votes` table linking (poll_id, resident_id)
-- so users can only vote once. This simplified schema assumes the front-end manages uniqueness or is sufficient for MVP.

ALTER TABLE public.dao_polls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dao_polls' AND policyname='polls_read') THEN
        CREATE POLICY "polls_read" ON public.dao_polls
            FOR SELECT USING (true); -- Public/Any authenticated resident can read polls
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dao_polls' AND policyname='polls_insert_admin') THEN
        -- Only admins can insert
        CREATE POLICY "polls_insert_admin" ON public.dao_polls
            FOR INSERT WITH CHECK (
                EXISTS (SELECT 1 FROM public.residents WHERE user_id = auth.uid() AND role = 'admin')
            );
    END IF;
END $$;


-- ----------------------------------------------------------------
-- 3. SECURE RPC: transfer_astra 
-- Prevents clients from spoofing tokens by enforcing server-side
-- subtraction/addition logic via a transaction.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_astra(
    target_resident_id UUID, 
    amount NUMERIC, 
    descriptor TEXT DEFAULT 'Transfer'
)
RETURNS BOOLEAN AS $$
DECLARE
    sender_res_id UUID;
    sender_balance NUMERIC;
BEGIN
    -- 1. Get sender's resident ID
    SELECT id INTO sender_res_id FROM public.residents WHERE user_id = auth.uid() LIMIT 1;
    IF sender_res_id IS NULL THEN
        RAISE EXCEPTION 'Sender resident not found for auth.uid()';
    END IF;
    
    -- Prevent self-sending
    IF sender_res_id = target_resident_id THEN
        RAISE EXCEPTION 'You cannot send ASTRA to yourself.';
    END IF;

    -- Amount must be strictly positive
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be positive.';
    END IF;

    -- 2. Verify sender has enough balance
    SELECT balance INTO sender_balance FROM public.astra_balances WHERE resident_id = sender_res_id;
    IF sender_balance IS NULL OR sender_balance < amount THEN
        RAISE EXCEPTION 'Insufficient ASTRA balance.';
    END IF;

    -- 3. Execute transfer inside transaction
    -- Deduct from sender
    UPDATE public.astra_balances 
    SET balance = balance - amount, updated_at = NOW() 
    WHERE resident_id = sender_res_id;
    
    -- Add to receiver
    UPDATE public.astra_balances 
    SET balance = balance + amount, updated_at = NOW() 
    WHERE resident_id = target_resident_id;
    
    -- 4. Log the transaction twice (once for sender out, once for receiver in)
    INSERT INTO public.astra_transactions (resident_id, amount, description) 
    VALUES (sender_res_id, -amount, 'SENT to ' || target_resident_id || ': ' || descriptor);

    INSERT INTO public.astra_transactions (resident_id, amount, description) 
    VALUES (target_resident_id, amount, 'RECEIVED from ' || sender_res_id || ': ' || descriptor);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- Done!
-- ----------------------------------------------------------------
