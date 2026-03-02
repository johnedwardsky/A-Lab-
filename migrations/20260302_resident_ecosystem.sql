-- ============================================================
-- A-LAB: RESIDENT ECOSYSTEM v2 — Aligned with real DB schema
-- Run in Supabase SQL Editor
--
-- Real tables confirmed:
--   astra_balances   (NOT astra_wallets)
--   astra_transactions (already exists)
--   posts            (NOT feed_posts)
--   NO messages table → creating it
--   NO resident_projects → creating it
-- ============================================================


-- ----------------------------------------------------------------
-- 1. resident_projects — NEW: private/public projects by residents
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resident_projects (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT,
    category      TEXT DEFAULT 'other',
    status        TEXT DEFAULT 'active',
    astra_budget  NUMERIC(12, 2) DEFAULT 0,
    progress      INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_public     BOOLEAN DEFAULT true,
    tags          TEXT[] DEFAULT '{}',
    cover_url     TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.resident_projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resident_projects' AND policyname='resident_projects_select') THEN
        CREATE POLICY "resident_projects_select" ON public.resident_projects
            FOR SELECT USING (
                is_public = true
                OR owner_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resident_projects' AND policyname='resident_projects_insert') THEN
        CREATE POLICY "resident_projects_insert" ON public.resident_projects
            FOR INSERT WITH CHECK (
                owner_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resident_projects' AND policyname='resident_projects_update') THEN
        CREATE POLICY "resident_projects_update" ON public.resident_projects
            FOR UPDATE USING (
                owner_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resident_projects' AND policyname='resident_projects_delete') THEN
        CREATE POLICY "resident_projects_delete" ON public.resident_projects
            FOR DELETE USING (
                owner_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
            );
    END IF;
END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_resident_projects_updated_at') THEN
        CREATE TRIGGER trg_resident_projects_updated_at
            BEFORE UPDATE ON public.resident_projects
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    END IF;
END $$;


-- ----------------------------------------------------------------
-- 2. messages — NEW: P2P messaging between residents
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_read') THEN
        CREATE POLICY "messages_read" ON public.messages
            FOR SELECT USING (
                sender_id   = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
                OR receiver_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_send') THEN
        CREATE POLICY "messages_send" ON public.messages
            FOR INSERT WITH CHECK (
                sender_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
            );
    END IF;
END $$;


-- ----------------------------------------------------------------
-- 3. astra_balances — EXISTING table, just ensure RLS + policies
--    (already has: astra_read, astra_system_update)
-- ----------------------------------------------------------------
ALTER TABLE public.astra_balances ENABLE ROW LEVEL SECURITY;

-- The existing policies (astra_read, astra_system_update) already handle access.
-- No changes needed here unless you want to add insert policy for auto-wallet creation.

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='astra_balances' AND policyname='astra_insert') THEN
        CREATE POLICY "astra_insert" ON public.astra_balances
            FOR INSERT WITH CHECK (
                resident_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1)
            );
    END IF;
END $$;


-- ----------------------------------------------------------------
-- 4. astra_transactions — EXISTING table, just ensure RLS
--    (already has: tx_read, tx_insert)
-- ----------------------------------------------------------------
ALTER TABLE public.astra_transactions ENABLE ROW LEVEL SECURITY;
-- Policies tx_read and tx_insert already exist - no changes needed.


-- ----------------------------------------------------------------
-- 5. Trigger: auto-create astra_balances when resident is created
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_astra_balance_for_resident()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.astra_balances (resident_id, balance)
    VALUES (NEW.id, 300)  -- Default 300 ASTRA welcome bonus
    ON CONFLICT (resident_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate to ensure it's updated
DROP TRIGGER IF EXISTS trg_auto_create_astra_balance ON public.residents;
CREATE TRIGGER trg_auto_create_astra_balance
    AFTER INSERT ON public.residents
    FOR EACH ROW EXECUTE FUNCTION public.create_astra_balance_for_resident();


-- ----------------------------------------------------------------
-- 6. posts — EXISTING table, ensure author_id based RLS
--    (already has: posts_own_manage, posts_public_read)
-- ----------------------------------------------------------------
-- No changes needed — existing policies are sufficient.
-- RPM will use 'posts' table directly.


-- ----------------------------------------------------------------
-- 7. Storage: avatars bucket policies
-- ----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatar_upload'
    ) THEN
        CREATE POLICY "avatar_upload" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (
                bucket_id = 'avatars'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );

        CREATE POLICY "avatar_update" ON storage.objects
            FOR UPDATE TO authenticated USING (
                bucket_id = 'avatars'
                AND (storage.foldername(name))[1] = auth.uid()::text
            );

        CREATE POLICY "avatar_public_read" ON storage.objects
            FOR SELECT USING (bucket_id = 'avatars');
    END IF;
END $$;


-- ----------------------------------------------------------------
-- Done! Tables created/ensured:
--   ✓ resident_projects (NEW)
--   ✓ messages (NEW)
--   ✓ astra_balances (EXISTING — RLS confirmed)
--   ✓ astra_transactions (EXISTING — RLS confirmed)
--   ✓ posts (EXISTING — used for feed)
--   ✓ avatars storage bucket policies
-- ----------------------------------------------------------------
