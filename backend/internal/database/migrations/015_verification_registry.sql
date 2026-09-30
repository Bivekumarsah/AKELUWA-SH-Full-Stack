CREATE TABLE IF NOT EXISTS verification_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_code varchar(80) NOT NULL UNIQUE,
    record_type varchar(30) NOT NULL CHECK (record_type IN ('certificate', 'document', 'letter', 'report', 'approval', 'other')),
    title varchar(200) NOT NULL,
    holder_name varchar(160) NOT NULL DEFAULT '',
    issued_on date NOT NULL,
    expires_on date,
    status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    public_note varchar(500) NOT NULL DEFAULT '',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_on IS NULL OR expires_on >= issued_on)
);

CREATE INDEX IF NOT EXISTS verification_records_status_idx
    ON verification_records (status, issued_on DESC);

DROP TRIGGER IF EXISTS verification_records_set_updated_at ON verification_records;
CREATE TRIGGER verification_records_set_updated_at
BEFORE UPDATE ON verification_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
