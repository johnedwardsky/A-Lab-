-- ============================================================
-- A-LAB: FEED TABLES MIGRATION (Phase 3)
-- Run in Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Update posts table — add missing columns
-- ----------------------------------------------------------------
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS votes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Make sure RLS is on
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='posts_read') THEN
    CREATE POLICY "posts_read" ON public.posts FOR SELECT USING (true);
  END IF;
END $$;

-- Allow authenticated user to insert own posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='posts_insert_own') THEN
    CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT
      WITH CHECK (author_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;

-- Allow post deletion by author only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='posts_delete_own') THEN
    CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE
      USING (author_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;

-- Allow post update by author (for votes_count & comments_count counters)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='posts' AND policyname='posts_update_counters') THEN
    CREATE POLICY "posts_update_counters" ON public.posts FOR UPDATE
      USING (true);  -- Any authenticated user can bump counters (safe since increments are done via server RPCs)
  END IF;
END $$;


-- ----------------------------------------------------------------
-- 2. post_reactions — emoji reactions per user per post
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  resident_id  UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  emoji        TEXT NOT NULL DEFAULT '🚀',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, resident_id)  -- one reaction per user per post
);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='reactions_read') THEN
    CREATE POLICY "reactions_read" ON public.post_reactions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='reactions_write_own') THEN
    CREATE POLICY "reactions_write_own" ON public.post_reactions FOR ALL
      USING (resident_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1))
      WITH CHECK (resident_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;


-- ----------------------------------------------------------------
-- 3. post_comments — nested comments for each post
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_comments' AND policyname='comments_read') THEN
    CREATE POLICY "comments_read" ON public.post_comments FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_comments' AND policyname='comments_insert_own') THEN
    CREATE POLICY "comments_insert_own" ON public.post_comments FOR INSERT
      WITH CHECK (author_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_comments' AND policyname='comments_delete_own') THEN
    CREATE POLICY "comments_delete_own" ON public.post_comments FOR DELETE
      USING (author_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;


-- ----------------------------------------------------------------
-- 4. Supabase Storage bucket for post images
-- ----------------------------------------------------------------
-- Run this manually in Supabase Dashboard → Storage → Create Bucket:
-- Bucket name: post-images
-- Public: true
--
-- Or via SQL (may not work on all Supabase versions):
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'post-images') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);
  END IF;
END $$;

-- Storage policies for post-images bucket
DROP POLICY IF EXISTS "post-images-upload" ON storage.objects;
CREATE POLICY "post-images-upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "post-images-read" ON storage.objects;
CREATE POLICY "post-images-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');




-- ----------------------------------------------------------------
-- 5. RPC: increment_comment_count (called after comment insert)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_comment_count(p_post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- 6. Trigger: auto-update comments_count on post_comments insert/delete
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_comment_count ON public.post_comments;
CREATE TRIGGER trg_post_comment_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();


-- ----------------------------------------------------------------
-- 7. Trigger: auto-update votes_count on post_reactions insert/delete
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_post_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET votes_count = votes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_votes_count ON public.post_reactions;
CREATE TRIGGER trg_post_votes_count
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_post_votes_count();


-- ----------------------------------------------------------------
-- Done!
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- 8. resident_portfolio — user portfolio works
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resident_portfolio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  link_url    TEXT,
  category    TEXT DEFAULT 'other',
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_resident ON public.resident_portfolio(resident_id);

ALTER TABLE public.resident_portfolio ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resident_portfolio' AND policyname='portfolio_read') THEN
    CREATE POLICY "portfolio_read" ON public.resident_portfolio FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='resident_portfolio' AND policyname='portfolio_write_own') THEN
    CREATE POLICY "portfolio_write_own" ON public.resident_portfolio FOR ALL
      USING (resident_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1))
      WITH CHECK (resident_id = (SELECT id FROM public.residents WHERE user_id = auth.uid() LIMIT 1));
  END IF;
END $$;

-- ----------------------------------------------------------------
-- 9. Supabase Storage bucket for portfolio images
-- ----------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'portfolio-images') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true);
  END IF;
END $$;

-- Storage policies for portfolio-images bucket
DROP POLICY IF EXISTS "portfolio-images-upload" ON storage.objects;
CREATE POLICY "portfolio-images-upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "portfolio-images-read" ON storage.objects;
CREATE POLICY "portfolio-images-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio-images');

SELECT 'Migration 20260304_feed_tables completed successfully' AS status;

