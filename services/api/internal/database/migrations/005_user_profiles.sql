ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data bytea;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_type text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;
