CREATE TABLE IF NOT EXISTS downloads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    file_name text NOT NULL,
    content_type text NOT NULL,
    file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
    file_data bytea NOT NULL,
    active boolean NOT NULL DEFAULT true,
    position integer NOT NULL DEFAULT 0,
    download_count bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS careers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    department text NOT NULL,
    location text NOT NULL,
    employment_type text NOT NULL,
    summary text NOT NULL,
    responsibilities text NOT NULL,
    requirements text NOT NULL,
    apply_email text NOT NULL,
    deadline date,
    active boolean NOT NULL DEFAULT true,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS downloads_public_idx ON downloads (active, position, created_at DESC);
CREATE INDEX IF NOT EXISTS careers_public_idx ON careers (active, position, created_at DESC);

DROP TRIGGER IF EXISTS downloads_set_updated_at ON downloads;
CREATE TRIGGER downloads_set_updated_at BEFORE UPDATE ON downloads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS careers_set_updated_at ON careers;
CREATE TRIGGER careers_set_updated_at BEFORE UPDATE ON careers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
