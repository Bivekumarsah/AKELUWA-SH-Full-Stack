ALTER TABLE users DROP CONSTRAINT IF EXISTS users_admin_permissions_check;

UPDATE users AS u
SET admin_permissions = COALESCE((
    SELECT array_agg(permission ORDER BY permission_order)
    FROM (VALUES
        ('overview', 'overview.view', 1),
        ('inquiries', 'inquiries.view', 2),
        ('inquiries', 'inquiries.update', 3),
        ('contracts', 'contracts.view', 4),
        ('contracts', 'contracts.create', 5),
        ('contracts', 'contracts.update', 6),
        ('services', 'services.view', 7),
        ('services', 'services.create', 8),
        ('services', 'services.update', 9),
        ('services', 'services.delete', 10),
        ('portfolio', 'portfolio.view', 11),
        ('portfolio', 'portfolio.create', 12),
        ('portfolio', 'portfolio.update', 13),
        ('portfolio', 'portfolio.delete', 14),
        ('downloads', 'downloads.view', 15),
        ('downloads', 'downloads.create', 16),
        ('downloads', 'downloads.update', 17),
        ('downloads', 'downloads.delete', 18),
        ('careers', 'careers.view', 19),
        ('careers', 'careers.create', 20),
        ('careers', 'careers.update', 21),
        ('careers', 'careers.delete', 22),
        ('accounts', 'accounts.view', 23),
        ('accounts', 'accounts.create', 24),
        ('accounts', 'accounts.update', 25),
        ('accounts', 'accounts.delete', 26)
    ) AS grants(area, permission, permission_order)
    WHERE grants.area = ANY(u.admin_permissions)
       OR grants.permission = ANY(u.admin_permissions)
), '{}'::text[])
WHERE u.role = 'sub_admin';

ALTER TABLE users
ADD CONSTRAINT users_admin_permissions_check CHECK (
    admin_permissions <@ ARRAY[
        'overview.view',
        'inquiries.view', 'inquiries.update',
        'contracts.view', 'contracts.create', 'contracts.update',
        'services.view', 'services.create', 'services.update', 'services.delete',
        'portfolio.view', 'portfolio.create', 'portfolio.update', 'portfolio.delete',
        'downloads.view', 'downloads.create', 'downloads.update', 'downloads.delete',
        'careers.view', 'careers.create', 'careers.update', 'careers.delete',
        'accounts.view', 'accounts.create', 'accounts.update', 'accounts.delete'
    ]::text[]
);

CREATE TABLE admin_action_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action text NOT NULL CHECK (action IN (
        'service.delete', 'portfolio.delete', 'download.delete',
        'career.delete', 'career_application.delete',
        'invoice.void', 'transaction.void'
    )),
    target_id uuid NOT NULL,
    target_label text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'failed')),
    reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    review_note text NOT NULL DEFAULT '',
    failure_message text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz
);

CREATE UNIQUE INDEX admin_action_requests_pending_target_idx
ON admin_action_requests (action, target_id)
WHERE status IN ('pending', 'processing');

CREATE INDEX admin_action_requests_review_idx
ON admin_action_requests (
    (CASE WHEN status = 'pending' THEN 0 ELSE 1 END),
    created_at DESC
);
