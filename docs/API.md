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

## Authentication And Profile

| Method | Path | Session | Purpose |
|---|---|---|---|
| POST | `/auth/register` | No | Create a customer account |
| POST | `/auth/login` | No | Verify email and password; administrators receive an MFA challenge |
| POST | `/auth/mfa/verify` | MFA challenge | Verify six-digit TOTP and create administrator session |
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
| GET | `/services` | Published services |
| GET | `/portfolio` | Published portfolio items |
| GET | `/downloads` | Published downloadable resources |
| GET | `/downloads/{id}/file` | Resource file download and count update |
| GET | `/careers` | Published career openings |
| POST | `/careers/{id}/applications` | Submit candidate details and resume |
| POST | `/inquiries` | Submit project inquiry |

Registration, login, MFA verification, inquiries, and career applications are rate limited.

## Customer Account

Every route requires a signed session. Store queries enforce that customers only receive their own data.

| Method | Path | Purpose |
|---|---|---|
| GET | `/account/inquiries` | Current user's project inquiries |
| GET | `/account/contracts` | Current user's contracts |
| GET | `/account/invoices` | Current user's invoices and balances |
| POST | `/account/contracts/{id}/sign` | Customer electronic contract signature |

## Administration

Every admin route requires an MFA-verified administrator or sub-administrator session. A full administrator has all permissions. A sub-administrator must hold the exact permission named by the operation.

| Area | Routes | Required permission |
|---|---|---|
| Overview | `GET /admin/stats` | `overview.view` |
| Inquiries | `GET /admin/inquiries`, `PATCH /admin/inquiries/{id}` | `inquiries.view`, `inquiries.update` |
| Services | `GET`, `POST /admin/services`; `PUT`, `DELETE /admin/services/{id}` | `services.view/create/update/delete` |
| Portfolio | `GET`, `POST /admin/portfolio`; `PUT`, `DELETE /admin/portfolio/{id}` | `portfolio.view/create/update/delete` |
| Contracts | `GET`, `POST /admin/contracts`; `PUT /admin/contracts/{id}`; send, sign, and status routes | `contracts.view/create/update` |
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
