CREATE TABLE document_notification_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind text NOT NULL CHECK (kind IN ('contract_draft', 'contract_published', 'invoice_created')),
    record_id uuid NOT NULL,
    payload jsonb NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    lease_until timestamptz,
    sent_at timestamptz,
    cancelled_at timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (kind, record_id)
);

CREATE INDEX document_notification_outbox_due_idx
    ON document_notification_outbox (next_attempt_at, created_at)
    WHERE sent_at IS NULL AND cancelled_at IS NULL;
