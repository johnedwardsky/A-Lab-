-- ============================================================
-- A-LAB: FUNCTIONAL CORE UPGRADE
-- Converts mock systems into real database-backed features.
-- ============================================================

-- 1. Residents: Persistent Settings & Status
ALTER TABLE residents ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
  "visibility": "public",
  "notifications": {
    "email": true,
    "push": true,
    "weekly_digest": true
  },
  "security": {
    "two_factor": false,
    "biometrics": "Neural Pattern Sync"
  },
  "appearance": {
    "theme": "dark",
    "lang": "ru"
  }
}'::jsonb;

-- 2. Messages Table (Used by message-manager.js)
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES residents(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES residents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_own_read" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM residents WHERE id = sender_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM residents WHERE id = receiver_id AND user_id = auth.uid())
  );

CREATE POLICY "messages_own_insert" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM residents WHERE id = sender_id AND user_id = auth.uid())
  );

-- 3. Notifications Table (System-wide broadcasts & alerts)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid REFERENCES residents(id) ON DELETE CASCADE, -- NULL for global broadcast
  type text NOT NULL CHECK (type IN ('system', 'broadcast', 'mention', 'project', 'token')),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_read" ON notifications
  FOR SELECT USING (
    recipient_id IS NULL OR 
    EXISTS (SELECT 1 FROM residents WHERE id = recipient_id AND user_id = auth.uid())
  );

CREATE POLICY "notifications_admin_manage" ON notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM residents WHERE user_id = auth.uid() AND is_admin = true)
  );

-- 4. RPC for Market Stats (Astra Health)
CREATE OR REPLACE FUNCTION get_astra_market_stats()
RETURNS jsonb AS $$
DECLARE
  v_total_supply numeric;
  v_tx_count_24h bigint;
  v_unique_holders bigint;
BEGIN
  SELECT SUM(balance) INTO v_total_supply FROM astra_balances;
  SELECT COUNT(*) INTO v_tx_count_24h FROM astra_transactions WHERE created_at > now() - interval '24 hours';
  SELECT COUNT(DISTINCT resident_id) INTO v_unique_holders FROM astra_balances WHERE balance > 0;

  RETURN jsonb_build_object(
    'total_supply', v_total_supply,
    'tx_count_24h', v_tx_count_24h,
    'holders', v_unique_holders,
    'health_score', 98 -- Simulated health score for now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
