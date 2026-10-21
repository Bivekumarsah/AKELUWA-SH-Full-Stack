ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret bytea;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id bigserial PRIMARY KEY,
    actor_id uuid REFERENCES users(id) ON DELETE RESTRICT,
    method text NOT NULL,
    path text NOT NULL,
    status integer NOT NULL CHECK (status BETWEEN 100 AND 599),
    source_ip text NOT NULL DEFAULT '',
    user_agent text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
ON admin_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_created_idx
ON admin_audit_logs (actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'admin audit logs are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_audit_logs_append_only ON admin_audit_logs;
CREATE TRIGGER admin_audit_logs_append_only
BEFORE UPDATE OR DELETE ON admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_log_mutation();
