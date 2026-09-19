ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'sub_admin'));

ALTER TABLE users
ADD COLUMN IF NOT EXISTS admin_permissions text[] NOT NULL DEFAULT '{}';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_active boolean NOT NULL DEFAULT true;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_admin_permissions_check;
ALTER TABLE users
ADD CONSTRAINT users_admin_permissions_check CHECK (
    admin_permissions <@ ARRAY[
        'overview', 'inquiries', 'contracts', 'services',
        'portfolio', 'downloads', 'careers', 'accounts'
    ]::text[]
);

CREATE INDEX IF NOT EXISTS users_sub_admin_created_idx
ON users (created_at DESC)
WHERE role = 'sub_admin';
