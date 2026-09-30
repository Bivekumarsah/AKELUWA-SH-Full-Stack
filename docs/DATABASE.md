# Database Guide

PostgreSQL is the production data store. The schema source of truth is `backend/internal/database/migrations/`; the Go migration runner applies files in numeric order during API startup.

## Core Relationships

```text
users
  -> account_tokens.user_id
  -> inquiries.user_id
  -> contracts.user_id
  -> accounting_invoices.user_id

contracts
  -> accounting_invoices.contract_id

accounting_invoices
  -> accounting_invoice_items.invoice_id
  -> accounting_transactions.invoice_id

careers
  -> career_applications.career_id
```

`company_account` is a singleton record for company identity and finance defaults. `admin_audit_logs` is append-only. `admin_action_requests` stores actions awaiting full-admin review.

## Table Ownership

| Tables | Feature owner |
|---|---|
| `users` | Authentication, profiles, roles, MFA, delegated permissions |
| `services`, `portfolio_items` | Published website content |
| `inquiries` | Public contact form, customer account, admin pipeline |
| `contracts` | Customer and provider contract lifecycle and signatures |
| `downloads` | Managed public resources and download count |
| `careers`, `career_applications` | Hiring content, candidates, resumes, status workflow |
| `company_account` | Company identity, legal details, public brand copy, currency |
| `accounting_invoices`, `accounting_invoice_items` | Invoice records and line items |
| `accounting_transactions` | Payments, expenses, receipts, and void records |
| `admin_audit_logs` | Immutable admin write audit trail |
| `admin_action_requests` | Delayed destructive-action approval workflow |
| `mfa_recovery_codes` | Hashed, single-use administrator recovery codes |
| `account_tokens` | Hashed, expiring, single-use email verification and password-reset tokens |
| `api_rate_limits` | Shared request limits across API instances |
| `verification_records` | Public certificate, document, letter, report, and approval authenticity registry |

## Data Integrity Rules

- User emails are unique case-insensitively.
- New customer accounts require verified email ownership. Session versions provide immediate server-side revocation after security or access changes.
- Inquiry, contract, and invoice records link to the owning customer where applicable.
- Contract creation validates that the selected active client account owns the contract email. Visibility and client signing use the immutable user ID, avoiding trust in an unverified email-only claim.
- Sent contracts snapshot company legal/contact identifiers and include them in the SHA-256 content fingerprint so later company-account edits do not rewrite an issued document.
- Contract and invoice foreign keys preserve records by restricting unsafe deletion or setting optional links to null.
- Invoice line items and payments are calculated server-side; clients do not choose trusted totals.
- A posted accounting transaction is voided through a replacement status, preserving financial history.
- Customer invoice access requires the invoice ownership relationship introduced in `012_client_invoice_access.sql`.
- Administrator audit records are protected from updates and deletion by database logic.
- Verification registry entries can store a SHA-256 file fingerprint, last editor, and revocation timestamp.

## Migrations

| File | Purpose |
|---|---|
| `001_initial.sql` | Initial users, services, portfolio, inquiries, indexes, update triggers, starter content |
| `002_contracts.sql` | Contracts, lifecycle fields, signatures, content hash |
| `003_resources_careers.sql` | Downloads and career openings |
| `004_career_applications.sql` | Candidate records and resume storage |
| `005_user_profiles.sql` | Avatar columns on users |
| `006_admin_security.sql` | MFA columns and administrator audit logs |
| `007_company_account.sql` | Company account singleton |
| `008_accounting.sql` | Invoices, line items, accounting transactions, receipt sequence |
| `009_company_tagline_meaning.sql` | Tagline meaning field |
| `010_sub_admin_rbac.sql` | Sub-administrator role, active state, permissions |
| `011_granular_admin_approvals.sql` | Fine-grained permissions and action review records |
| `012_client_invoice_access.sql` | Invoice customer ownership |
| `013_security_operations.sql` | MFA recovery codes and distributed API rate limits |
| `014_contract_identity.sql` | Locked company legal/contact identity snapshots for issued contracts |
| `015_verification_registry.sql` | Public company-record verification IDs, status, dates, and safe display fields |
| `016_account_security_document_integrity.sql` | Email ownership, password recovery tokens, session revocation, and registry fingerprints/audit fields |
| `017_single_active_account_token.sql` | One active ownership or recovery token per account and purpose, enforced across replicas |

## Migration Rules

1. Never alter an already-applied migration in a shared or production environment.
2. Create the next sequential filename: `NNN_short_feature_name.sql`.
3. Include indexes, constraints, defaults, and foreign keys needed by the new behavior.
4. Use guards such as `IF NOT EXISTS` where a migration must tolerate an existing object.
5. Update `backend/internal/model/model.go`, `backend/internal/store/store.go`, and the API in the same change.
6. Run PostgreSQL integration tests against an isolated `TEST_DATABASE_URL`.

## Local Database

`compose.yaml` creates the local `akeluwa` PostgreSQL database and mounts it in the `akeluwa_postgres` Docker volume. Resetting that volume destroys local data; do it only when intentionally recreating the local environment.

Production uses the `postgres_data` named volume from `deploy/compose.prod.yaml`. Follow `docs/OPERATIONS.md` for encrypted off-host backups and restore drills.
