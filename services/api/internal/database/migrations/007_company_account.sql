CREATE TABLE IF NOT EXISTS company_account (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    display_name text NOT NULL,
    legal_name text NOT NULL,
    tagline text NOT NULL DEFAULT '',
    primary_email text NOT NULL,
    support_email text NOT NULL DEFAULT '',
    careers_email text NOT NULL DEFAULT '',
    phone text NOT NULL DEFAULT '',
    website_url text NOT NULL DEFAULT '',
    registration_number text NOT NULL DEFAULT '',
    tax_id text NOT NULL DEFAULT '',
    address_line text NOT NULL DEFAULT '',
    city text NOT NULL DEFAULT '',
    region text NOT NULL DEFAULT '',
    postal_code text NOT NULL DEFAULT '',
    country text NOT NULL,
    timezone text NOT NULL,
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    linkedin_url text NOT NULL DEFAULT '',
    github_url text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO company_account (
    singleton, display_name, legal_name, primary_email, support_email,
    careers_email, country, timezone, currency
) VALUES (
    true, 'AKELUWA SH', 'AKELUWA SH', 'akeluwasoftwarehub@gmail.com',
    'akeluwasoftwarehub@gmail.com', 'akeluwasoftwarehub@gmail.com',
    'Nepal', 'Asia/Kathmandu', 'NPR'
)
ON CONFLICT (singleton) DO NOTHING;

DROP TRIGGER IF EXISTS company_account_set_updated_at ON company_account;
CREATE TRIGGER company_account_set_updated_at BEFORE UPDATE ON company_account
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
