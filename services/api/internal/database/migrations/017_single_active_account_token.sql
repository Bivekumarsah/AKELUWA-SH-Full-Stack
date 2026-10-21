WITH ranked AS (
    SELECT id, row_number() OVER (PARTITION BY user_id, purpose ORDER BY created_at DESC, id DESC) AS position
    FROM account_tokens
    WHERE used_at IS NULL
)
UPDATE account_tokens
SET used_at = now()
FROM ranked
WHERE account_tokens.id = ranked.id AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS account_tokens_one_active_purpose_idx
ON account_tokens (user_id, purpose)
WHERE used_at IS NULL;
