ALTER TABLE contracts
    ADD COLUMN IF NOT EXISTS provider_legal_name text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_email text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_phone text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_website text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_registration_number text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_tax_id text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider_address text NOT NULL DEFAULT '';
