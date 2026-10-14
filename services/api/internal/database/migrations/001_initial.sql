CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number text NOT NULL,
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    summary text NOT NULL,
    stack text NOT NULL,
    position integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    summary text NOT NULL,
    technologies text NOT NULL,
    project_url text,
    position integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text,
    budget text,
    message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inquiries_user_id_idx ON inquiries (user_id);
CREATE INDEX IF NOT EXISTS inquiries_status_created_idx ON inquiries (status, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS services_set_updated_at ON services;
CREATE TRIGGER services_set_updated_at BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS portfolio_set_updated_at ON portfolio_items;
CREATE TRIGGER portfolio_set_updated_at BEFORE UPDATE ON portfolio_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS inquiries_set_updated_at ON inquiries;
CREATE TRIGGER inquiries_set_updated_at BEFORE UPDATE ON inquiries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO services (number, slug, title, summary, stack, position)
VALUES
    ('01', 'product-engineering', 'Build the product', 'Interfaces, platforms and financial systems shaped around real human behaviour—not feature lists.', 'REACT / GO / POSTGRESQL', 1),
    ('02', 'cloud-platform', 'Move through cloud', 'Deployment, observability and automation engineered to stay calm while the business moves fast.', 'AWS / DEVOPS / PLATFORM', 2),
    ('03', 'security-ai', 'Defend the system', 'Security and intelligent automation designed into the architecture from the first line of code.', 'CYBERSECURITY / AI / DATA', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO portfolio_items (slug, title, summary, technologies, position)
VALUES
    ('fintech-api', 'Fintech transaction platform', 'Secure account, transfer and transaction services designed for traceability and dependable delivery.', 'GO / POSTGRESQL / DOCKER', 1),
    ('cooperative-system', 'Cooperative management system', 'Member, savings, loan, collection and reporting workflows connected in one operational system.', 'DJANGO / REACT / POSTGRESQL', 2),
    ('cashless-transit', 'Cashless public transport', 'RFID-based fare payments, wallet services and live administration for public transportation.', 'SPRING BOOT / ANDROID / RFID', 3)
ON CONFLICT (slug) DO NOTHING;
