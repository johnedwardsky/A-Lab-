-- Add settings column to residents table if it doesn't exist
ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
    "visibility": "public",
    "online_status": "show",
    "notifications": {
        "email": true,
        "push": true,
        "weekly_digest": false
    },
    "language": "ru"
}'::jsonb;

-- Comment on the column for clarity
COMMENT ON COLUMN residents.settings IS 'Resident preferences for visibility, notifications, and localization.';
