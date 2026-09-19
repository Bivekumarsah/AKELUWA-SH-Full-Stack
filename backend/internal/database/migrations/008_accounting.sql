CREATE SEQUENCE IF NOT EXISTS accounting_receipt_number_seq START 1;

CREATE TABLE IF NOT EXISTS accounting_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
    invoice_number text NOT NULL UNIQUE,
    client_name text NOT NULL,
    client_email text NOT NULL,
    client_company text NOT NULL DEFAULT '',
    issue_date date NOT NULL,
    due_date date NOT NULL CHECK (due_date >= issue_date),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    subtotal_cents bigint NOT NULL CHECK (subtotal_cents >= 0),
    tax_cents bigint NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
    discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
    total_cents bigint NOT NULL CHECK (total_cents > 0),
    notes text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'partial', 'paid', 'overdue', 'void')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounting_invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES accounting_invoices(id) ON DELETE RESTRICT,
    description text NOT NULL,
    quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
    unit_price_cents bigint NOT NULL CHECK (unit_price_cents >= 0),
    position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accounting_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid REFERENCES accounting_invoices(id) ON DELETE RESTRICT,
    direction text NOT NULL CHECK (direction IN ('income', 'expense')),
    category text NOT NULL,
    description text NOT NULL,
    counterparty text NOT NULL,
    amount_cents bigint NOT NULL CHECK (amount_cents > 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'mobile_wallet', 'cheque', 'other')),
    reference text NOT NULL DEFAULT '',
    receipt_number text UNIQUE,
    transaction_date date NOT NULL,
    notes text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'void')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (direction = 'income' OR invoice_id IS NULL),
    CHECK (direction = 'expense' OR receipt_number IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS accounting_invoices_status_due_idx ON accounting_invoices (status, due_date);
CREATE INDEX IF NOT EXISTS accounting_transactions_date_idx ON accounting_transactions (transaction_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS accounting_transactions_invoice_idx ON accounting_transactions (invoice_id, status);

DROP TRIGGER IF EXISTS accounting_invoices_set_updated_at ON accounting_invoices;
CREATE TRIGGER accounting_invoices_set_updated_at BEFORE UPDATE ON accounting_invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS accounting_transactions_set_updated_at ON accounting_transactions;
CREATE TRIGGER accounting_transactions_set_updated_at BEFORE UPDATE ON accounting_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
