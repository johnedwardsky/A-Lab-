---
description: Setup and verify the Feed (Лента событий) feature in Workspace
---

# Feed (Лента событий) — Setup Workflow

## 1. Create Supabase Tables

Run the following SQL in Supabase SQL Editor to create the required tables:

```sql
-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    image_url TEXT,
    votes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post reactions (likes/emoji)
CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL DEFAULT '🚀',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, resident_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
```

## 2. Create RLS Policies

```sql
-- Posts policies
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Auth users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

CREATE POLICY "Anyone can read posts" ON posts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Auth users can create posts" ON posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE TO authenticated USING (author_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE TO authenticated USING (author_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));

-- Post reactions policies
DROP POLICY IF EXISTS "Anyone can read reactions" ON post_reactions;
DROP POLICY IF EXISTS "Auth can react" ON post_reactions;
DROP POLICY IF EXISTS "Auth can unreact" ON post_reactions;

CREATE POLICY "Anyone can read reactions" ON post_reactions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Auth can react" ON post_reactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can unreact" ON post_reactions FOR DELETE TO authenticated USING (resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));

-- Allow upsert for reactions
DROP POLICY IF EXISTS "Auth can update reactions" ON post_reactions;
CREATE POLICY "Auth can update reactions" ON post_reactions FOR UPDATE TO authenticated USING (resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));

-- Post comments policies
DROP POLICY IF EXISTS "Anyone can read comments" ON post_comments;
DROP POLICY IF EXISTS "Auth can comment" ON post_comments;

CREATE POLICY "Anyone can read comments" ON post_comments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Auth can comment" ON post_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth can delete own comments" ON post_comments FOR DELETE TO authenticated USING (author_id IN (SELECT id FROM residents WHERE user_id = auth.uid()));
```

## 3. Create Storage Bucket for Post Images

```sql
-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;
```

Then in Supabase Dashboard → Storage → post-images → Policies:
- Allow authenticated users to upload
- Allow public read

## 4. Add `last_seen` Column to Residents (for Online status)

```sql
ALTER TABLE residents ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
```

## 5. Verify Feed by Logging In and Publishing a Post

// turbo
1. Open workspace: http://localhost:8080/residents/workspace.html
2. Log in if needed
3. Click on "📡 Лента" tab
4. Select a theme chip (e.g., "Development")
5. Type a test message
6. Click "Опубликовать"
7. Verify the post appears in the feed
8. Test commenting on the post
9. Test reactions (emoji)
10. Test share modal

## 6. Right Panel Dynamic Features

The right panel currently shows static data. To do:
- **Online residents list**: Already handled by `FeedManager.loadOnlineResidents()` — requires `last_seen` column
- **Themes**: Counts should be fetched dynamically from `posts` table
- **Tags**: Should be extracted from existing posts
- **Channels**: Update Discord and Telegram links to real URLs
