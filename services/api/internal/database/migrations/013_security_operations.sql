CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash bytea NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS mfa_recovery_codes_available_idx
ON mfa_recovery_codes (user_id)
WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS api_rate_limits (
    key text PRIMARY KEY,
    request_count integer NOT NULL CHECK (request_count > 0),
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS api_rate_limits_expiry_idx
ON api_rate_limits (expires_at);
