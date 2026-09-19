ALTER TABLE accounting_invoices
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;

UPDATE accounting_invoices AS invoice
SET user_id = contract.user_id
FROM contracts AS contract
WHERE invoice.contract_id = contract.id
  AND invoice.user_id IS NULL;

CREATE INDEX IF NOT EXISTS accounting_invoices_user_created_idx
ON accounting_invoices (user_id, created_at DESC)
WHERE user_id IS NOT NULL;
