ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1
CHECK (session_version > 0);

-- Preserve access for accounts created before email ownership checks existed.
UPDATE users
SET email_verified_at = created_at
WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS account_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose varchar(30) NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
    token_hash bytea NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_tokens_user_purpose_idx
ON account_tokens (user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS account_tokens_expiry_idx
ON account_tokens (expires_at);

ALTER TABLE verification_records
ADD COLUMN IF NOT EXISTS content_hash varchar(64) NOT NULL DEFAULT '';

ALTER TABLE verification_records
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE verification_records
ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE verification_records DROP CONSTRAINT IF EXISTS verification_records_content_hash_check;
ALTER TABLE verification_records
ADD CONSTRAINT verification_records_content_hash_check
CHECK (content_hash = '' OR content_hash ~ '^[a-f0-9]{64}$');

UPDATE verification_records
SET revoked_at = COALESCE(revoked_at, updated_at)
WHERE status = 'revoked';
