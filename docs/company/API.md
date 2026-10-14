# API Reference

The Go router in `backend/internal/httpapi/api.go` is the executable source of truth. The main application groups are `/api/v1/auth`, `/api/v1/account`, and `/api/v1/admin`; public content also lives under `/api/v1`. Health checks are outside that prefix.

## Conventions

- Requests and responses use JSON unless an endpoint accepts or returns a file.
- Authentication uses the signed HttpOnly session cookie.
- Cookie-authenticated write requests require an allowed browser `Origin`.
- API errors return an `error` message with an appropriate HTTP status.
- Administrator write routes create an audit record.

## Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/livez` | Process liveness; does not require PostgreSQL |
| GET | `/readyz` | Database readiness |
| GET | `/healthz` | Alias for database readiness |
| GET | `/metrics` | Internal Prometheus metrics; blocked at the public Caddy edge |

## Authentication And Profile

| Method | Path | Session | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Create an inactive customer account and send an email ownership link |
| POST | `/auth/verify-email` | No | Consume a one-time verification token and create the customer session |
| POST | `/auth/resend-verification` | No | Send a replacement ownership link using a non-enumerating response |
| POST | `/auth/password-reset/request` | No | Send a time-limited reset link using a non-enumerating response |
| POST | `/auth/password-reset/confirm` | No | Consume a reset token, replace the password, and revoke older sessions |
| POST | `/auth/login` | No | Verify email and password; administrators receive an MFA challenge |
| POST | `/auth/mfa/verify` | MFA challenge | Verify TOTP or a single-use recovery code and create administrator session |
| POST | `/auth/mfa/recovery-codes` | Admin MFA session | Replace the current administrator's recovery codes after fresh TOTP verification |
| POST | `/auth/logout` | Optional | Clear session cookie |
| GET | `/auth/me` | Required | Current user, role, permissions, and MFA state |
| PATCH | `/account/profile` | Required | Update current user's display name |
| POST | `/account/avatar` | Required | Upload current user's JPG, PNG, or WebP avatar |
| DELETE | `/account/avatar` | Required | Remove current user's avatar |
| GET | `/account/avatar` | Required | Return current user's avatar bytes |

## Public Content And Submission

| Method | Path | Purpose |
|---|---|---|
| GET | `/company-brand` | Public display name, tagline, and tagline meaning |
| GET | `/contracts/verify?number={reference}&fingerprint={sha256}` | Verify a locked contract using non-sensitive authenticity data |
| GET | `/records/verify?code={id}&fingerprint={sha256}` | Verify a company-issued record by ID and optionally match the exact file fingerprint |
| GET | `/services` | Published services |
| GET | `/portfolio` | Published portfolio items |
| GET | `/downloads` | Published downloadable resources |
| GET | `/downloads/{id}/file` | Resource file download and count update |
| GET | `/careers` | Published career openings |
| POST | `/careers/{id}/applications` | Submit candidate details and resume |
| POST | `/inquiries` | Submit project inquiry |

Registration, ownership verification, password recovery, login, MFA verification, recovery-code replacement, record verification, inquiries, and career applications are rate limited. Account tokens contain 256 random bits, are stored only as SHA-256 hashes, expire, and are consumed once. Protected requests compare the signed session version with PostgreSQL, so password resets, role changes, suspensions, and delegated-access changes revoke older sessions. Exact verification requires the ID and full fingerprint and excludes confidential client, commercial, signature-image, and request metadata.

## Customer Account

Every route requires a signed session. Store queries enforce that customers only receive their own data.

| Method | Path | Purpose |
|---|---|---|
| GET | `/account/inquiries` | Current user's project inquiries |
| GET | `/account/contracts` | Current user's sent contracts |
| GET | `/account/invoices` | Current user's invoices and balances |
| POST | `/account/contracts/{id}/sign` | Customer electronic contract signature |

Contract creation accepts an existing active client or securely provisions one from the normalized client email. New and unverified clients receive a single-use password-setup link instead of an emailed password. Draft creation and publishing queue separate summaries in the same transaction as their document changes, while drafts remain admin-only; sent-contract visibility and signing are enforced by the permanent user ID. Invoice creation queues itemized totals and automatically links a matching active client account. The API attempts delivery immediately and reports `email_sent`; failed sends remain queued for automatic retry. Signature uploads must decode as bounded PNG images, and the send action snapshots company identity before calculating the locked content fingerprint.

## Administration

Every admin route requires an MFA-verified administrator or sub-administrator session. A full administrator has all permissions. A sub-administrator must hold the exact permission named by the operation.

| Area | Routes | Required permission |
|---|---|---|
| Overview | `GET /admin/stats` | `overview.view` |
| Inquiries | `GET /admin/inquiries`, `PATCH /admin/inquiries/{id}` | `inquiries.view`, `inquiries.update` |
| Services | `GET`, `POST /admin/services`; `PUT`, `DELETE /admin/services/{id}` | `services.view/create/update/delete` |
| Portfolio | `GET`, `POST /admin/portfolio`; `PUT`, `DELETE /admin/portfolio/{id}` | `portfolio.view/create/update/delete` |
| Contracts | `GET`, `POST /admin/contracts`; `PUT /admin/contracts/{id}`; send, sign, and status routes | `contracts.view/create/update` |
| Verification registry | `GET`, `POST /admin/verification-records`; `PUT /admin/verification-records/{id}` | `contracts.view/create/update` |
| Downloads | `GET`, `POST /admin/downloads`; `PATCH`, `DELETE /admin/downloads/{id}` | `downloads.view/create/update/delete` |
| Careers | `GET`, `POST /admin/careers`; `PUT`, `DELETE /admin/careers/{id}` | `careers.view/create/update/delete` |
| Career applications | List, update status, resume, delete under `/admin/career-applications` | `careers.view/update/delete` |
| Company account | `GET`, `PUT /admin/company-account` | `accounts.view/update` |
| Accounting | `GET /admin/accounting`; invoice, transaction, and void routes | `accounts.view/create/delete` |

The following routes require a full administrator and are not delegated: users, sub-administrators, access management, action reviews, and audit logs.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/users` | All user accounts |
| PATCH | `/admin/users/{id}/role` | Change customer or administrator role |
| GET, POST | `/admin/sub-admins` | List or create sub-administrators |
| PATCH | `/admin/sub-admins/{id}` | Change delegated access or active state |
| GET | `/admin/action-requests` | Pending and resolved protected actions |
| POST | `/admin/action-requests/{id}/approve` | Approve protected action |
| POST | `/admin/action-requests/{id}/reject` | Reject protected action |
| GET | `/admin/audit-logs` | Append-only administrator audit trail |

## Adding Or Changing A Route

1. Add the route in `API.Router()`.
2. Select `requireAuth`, `requireFullAdmin`, or the exact `requireAdminPermission` wrapper.
3. Decode and validate input in the handler.
4. Add or update a store method.
5. Add the TypeScript request and response types in `app/lib/api.ts`.
6. Document the route here and add the relevant unit, integration, or browser test.
