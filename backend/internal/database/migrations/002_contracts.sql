CREATE TABLE IF NOT EXISTS contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    inquiry_id uuid REFERENCES inquiries(id) ON DELETE SET NULL,
    contract_number text NOT NULL UNIQUE,
    title text NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    client_company text,
    provider_name text NOT NULL DEFAULT 'AKELUWA SH',
    currency text NOT NULL DEFAULT 'USD',
    amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
    start_date date NOT NULL,
    end_date date NOT NULL CHECK (end_date >= start_date),
    scope text NOT NULL,
    deliverables text NOT NULL,
    milestones text NOT NULL,
    payment_terms text NOT NULL,
    revision_terms text NOT NULL,
    support_terms text NOT NULL,
    ownership_terms text NOT NULL,
    confidentiality_terms text NOT NULL,
    termination_terms text NOT NULL,
    dispute_terms text NOT NULL,
    special_terms text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'completed', 'cancelled')),
    version integer NOT NULL DEFAULT 1,
    content_hash text NOT NULL DEFAULT '',
    provider_signer_name text NOT NULL DEFAULT '',
    provider_signature text NOT NULL DEFAULT '',
    provider_signed_at timestamptz,
    client_signer_name text NOT NULL DEFAULT '',
    client_signature text NOT NULL DEFAULT '',
    client_signed_at timestamptz,
    client_sign_ip text NOT NULL DEFAULT '',
    client_sign_user_agent text NOT NULL DEFAULT '',
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (char_length(provider_signature) <= 300000),
    CHECK (char_length(client_signature) <= 300000)
);

CREATE INDEX IF NOT EXISTS contracts_user_created_idx ON contracts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contracts_status_created_idx ON contracts (status, created_at DESC);

DROP TRIGGER IF EXISTS contracts_set_updated_at ON contracts;
CREATE TRIGGER contracts_set_updated_at BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
