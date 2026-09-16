CREATE TABLE IF NOT EXISTS career_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    career_id uuid NOT NULL REFERENCES careers(id) ON DELETE RESTRICT,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    location text NOT NULL,
    linkedin_url text,
    portfolio_url text,
    cover_note text NOT NULL,
    resume_name text NOT NULL,
    resume_type text NOT NULL,
    resume_size bigint NOT NULL CHECK (resume_size > 0 AND resume_size <= 5242880),
    resume_data bytea NOT NULL,
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','shortlisted','interview','rejected','hired')),
    consent_at timestamptz NOT NULL DEFAULT now(),
    source_ip text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS career_applications_career_idx ON career_applications (career_id, created_at DESC);
CREATE INDEX IF NOT EXISTS career_applications_status_idx ON career_applications (status, created_at DESC);
DROP TRIGGER IF EXISTS career_applications_set_updated_at ON career_applications;
CREATE TRIGGER career_applications_set_updated_at BEFORE UPDATE ON career_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
