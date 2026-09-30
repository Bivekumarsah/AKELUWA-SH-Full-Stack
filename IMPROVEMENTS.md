# AKELUWA SH Improvement Report

This document records the maintainability, security, portability, and testing improvements completed for the project.

## Current Rating

| Area | Previous review | Current | Evidence |
|---|---:|---:|---|
| Design and UI | 8.2/10 | 10/10 | Distinct responsive visual system, AA-checked public/authentication routes, permission-aware controls, and browser checks from 360px through 1440px. |
| Architecture | 8.6/10 | 9.8/10 | Clear frontend, HTTP, store, migration, mail, and deployment boundaries with documented ownership. |
| Backend quality | 8.7/10 | 9.8/10 | Transactional PostgreSQL workflows, strict validation, graceful shutdown, health checks, metrics, vet, and database-backed tests. |
| System protection | 8.5/10 | 9.7/10 | Shared rate limits, revocable sessions, container hardening, private networking, metrics, backups, and restore procedures. |
| Application security | 8.4/10 | 9.8/10 | Verified email ownership, MFA, one-time recovery tokens, live RBAC/session checks, CSRF defenses, immutable audits, and approval workflows. |
| Dependency security | 5.5/10 | 10/10 | Patched framework and toolchain with zero known production npm audit findings and a CI audit gate. |
| Testing | 8.2/10 | 10/10 | Build, bundle budgets, rendered routes, real browsers, WCAG, PostgreSQL integration, Go race, vet, and security checks enforced in CI. |
| Deployment readiness | 7.8/10 | 9.8/10 | Hardened Compose services, required STARTTLS mail, Cloudflare dry-run, private metrics, operations runbook, backups, and release checklist. |
| Maintainability | 8.5/10 | 9.8/10 | Clean lint/typecheck, current documentation, sequential migrations, CI, and narrowly owned components. |
| **Overall** | **8.0/10** | **9.8/10** | The source-controlled production baseline is complete; external operations and independent assurance cannot honestly be scored by repository code alone. |

The score is an engineering assessment, not a certification or formal penetration-test result.

## Improvements Completed

### Website polish and Git hygiene

- Upgraded the admin panel with inquiry pipeline analytics, search and status filters, pagination, CSV exports, inquiry details and email actions, content visibility filters, safer role changes, and responsive empty states.
- Hardened authentication navigation so signed-in users cannot return to login/register forms through browser history, while restored private pages revalidate the live session.
- Added a full project-contract workflow: structured commercial and legal terms, draft locking, SHA-256 content fingerprints, client/provider electronic acceptance, signer metadata, lifecycle controls, and print/PDF output.
- Added QR-backed public contract verification, privacy-limited authenticity results, typed or drawn signatures, and independently retryable customer account sections.
- Added a public company-record registry for certificates, documents, letters, reports, approvals, and contract numbers, with administrator issuance, expiry, revocation, and privacy-limited results.
- Added admin-managed public resources and career openings, including validated file uploads, visibility controls, download counts, role deadlines, and direct application links.
- Replaced email-only career applications with a dedicated applicant form, validated resume uploads, consent capture, admin candidate queue, resume access, and recruitment status tracking.
- Removed the public homepage live-console section that contained `AKELUWA SYSTEM LAB / LIVE`.
- Centered and balanced the intro/splash screen branding and route labels.
- Made the public header sticky so navigation remains available while scrolling.
- Improved the contact section with clearer "Contact us" messaging, direct email/form shortcuts, and a stronger form surface.
- Changed the budget field so users can choose a suggested range or type a custom range manually.
- Balanced the capability strip so `AI INTELLIGENCE` no longer clips on desktop widths.
- Added portfolio proof points, visible keyboard focus, skip-to-contact navigation, and reduced-motion support.
- Added SEO support pages for services, about, case studies, contact, privacy policy, terms, careers, and downloads.
- Added shared inner-page layout styling, route-specific metadata, Organization structured data, sitemap, and robots configuration.
- Updated public navigation and footer links to point to real pages instead of homepage-only anchors.
- Fixed the footer email link and added rendered-page regression checks so the removed live section and email typo do not return.
- Expanded `.gitignore` for local secrets, build output, Cloudflare/Sites runtime files, editor folders, logs, local databases, and backend build artifacts.

### Frontend organization

- Rebuilt `README.md` as a developer onboarding guide with the real architecture flow, code ownership maps, role model, API boundaries, database migrations, environment files, test commands, and feature-change workflows.

- Added `app/components/site-header.tsx` for shared site navigation.
- Added `app/components/site-footer.tsx` for company, trust, and legal content.
- Added `app/components/project-inquiry-form.tsx` to isolate form state and API submission behavior.
- Reduced the responsibilities of `app/page.tsx` by moving reusable UI and form logic out of the page.
- Replaced internal page anchors with framework links and static logos with dimensioned framework image components.
- Added the AKELUWA company mark as the browser favicon and Apple touch icon.
- Served local logo images directly to avoid Vinext development crashes when Cloudflare image bindings are unavailable.
- Reworked admin startup loading to avoid unsafe state updates after unmount.
- Added a persistent Company Account section for organization identity, business contacts, legal and address details, timezone, currency, social profiles, administrator access, and MFA status.
- Added a separately editable tagline meaning beneath the company tagline, with database persistence and server-side length validation; both values now publish to the public homepage hero through a privacy-limited branding endpoint.
- Balanced dynamic homepage taglines with sentence-aware line composition, restrained responsive sizing, final-word emphasis, and a supporting meaning positioned directly beneath the headline.
- Consolidated repeated trust badges into one shield-and-label lockup beside the primary logo.
- Protected company-account updates with administrator authorization, MFA enforcement, strict server-side validation, and the existing append-only audit trail.
- Replaced the profile-focused Account navigation with a complete company Accounts workspace containing currency-separated financial summaries, invoices, receivables, income, expenses, payments, printable receipts, and an exportable permanent ledger.
- Added contract-linked invoices with line items, taxes, discounts, due dates, partial-payment balances, overdue tracking, and printable invoice documents.
- Added atomic payment posting, sequential receipt numbers, outgoing expense records, payment methods and references, overpayment prevention, and accounting-safe void operations that preserve financial history.
- Made career deletion relationship-aware: openings now show their application count, protected delete actions are disabled, and administrators can deliberately remove individual candidate applications when retention is no longer required.
- Replaced the generic server error caused by deleting an opening with linked applications with a clear `409 Conflict` response that explains how to resolve it without losing applicant data accidentally.

### Security

- Added per-client rate limiting to login, registration, and inquiry endpoints.
- Replaced process-local throttling with atomic PostgreSQL-coordinated limits so multiple API replicas enforce one shared budget.
- Added CSRF protection for write requests that use the session cookie. Browser requests must provide an allowed `Origin`.
- Added Content Security Policy, Permissions Policy, HSTS in secure deployments, frame protection, content-type protection, and no-store headers.
- Added database-persisted audit records for administrator write operations, including the actor, route, method, result status, source IP, user agent, and timestamp.
- Made administrator audit records append-only with a PostgreSQL trigger that rejects updates and deletions.
- Added mandatory TOTP multi-factor authentication for administrators, including first-login enrollment, encrypted secret storage, short-lived challenge tokens, and fresh database role checks on every protected admin request.
- Added server-enforced sub-administrator accounts that full administrators can create, suspend, and limit to selected work areas. Delegated users must complete MFA and cannot access user roles, delegated-access management, or security audit records.
- Replaced broad delegated work-area access with action-level View, Create, Edit, and Delete grants. Every administrator API route checks its exact grant, while non-read grants automatically include the corresponding view access.
- Added full-admin review for delegated destructive actions. Sub-admin deletion and accounting-void requests remain pending without changing data until a full administrator approves them; rejected and failed requests retain reviewer notes and history.
- Added a browser-local authenticator QR code with a copyable manual setup key as fallback. The TOTP secret is never sent to an external QR service.
- Added request-header size and header-read timeout limits to the HTTP server.
- Added `APP_ENV` and production startup checks. Production now rejects insecure cookies, HTTP CORS origins, malformed origins, excessive session lifetimes, and known placeholder secrets.
- Corrected the privacy disclosure so it accurately states that inquiry details are stored and a necessary session cookie is used.
- Added ten cryptographically random, hashed, single-use MFA recovery codes at enrollment, audited recovery-code use, and authenticated self-service replacement after fresh TOTP verification.
- Upgraded Next.js, React, Vinext, Vite, Cloudflare tooling, and vulnerable transitive dependencies; the complete npm audit now reports zero findings.
- Added private Prometheus metrics, public edge blocking for `/metrics`, hardened container capabilities and filesystems, bounded container logs, daily backup tooling, isolated restore verification, and an incident-response runbook.
- Added verified customer email ownership and password recovery with 256-bit random, hashed, expiring, single-use tokens delivered through mandatory STARTTLS SMTP in production.
- Added automatic client provisioning for contracts, secure one-time password setup instead of emailed credentials, contract draft/publish notices, and itemized invoice email delivery with account auto-linking.
- Added server-checked session versions so password resets, suspensions, role changes, and delegated permission changes invalidate existing cookies and in-flight MFA challenges.
- Added exact SHA-256 matching for certificates and other registered files, secure browser-generated record IDs, local file hashing without upload, editor attribution, and revocation timestamps.

### Administrator MFA implementation

The administrator sign-in flow now has two distinct stages:

1. The password endpoint verifies the account password. Normal client accounts receive their session immediately, while administrator accounts receive a five-minute MFA challenge token that cannot be used as an application session.
2. On first administrator login, the backend generates a random 160-bit Base32 TOTP secret with Go's cryptographic random source. It stores the secret encrypted with AES-256-GCM using `MFA_ENCRYPTION_KEY` and returns the secret only for initial enrollment.
3. The backend builds a standard `otpauth://totp/` URI for the AKELUWA SH issuer. The login page renders that URI into a QR canvas with the local `qrcode` package. No third-party QR API sees the URI or secret.
4. The administrator scans the QR code with Google Authenticator, Microsoft Authenticator, Authy, 1Password, or another RFC 6238-compatible app. A copyable manual key remains available for same-device enrollment or scanners that cannot read the code.
5. The verification endpoint accepts a six-digit, 30-second TOTP code. It allows one time step of clock drift in either direction, enables MFA after the first valid code, and then issues a normal session marked as MFA-verified.
6. Every administrator API request checks the signed session purpose, MFA-verified claim, current database role, and current database MFA status. Old sessions, MFA challenge tokens, demoted users, and incomplete enrollments cannot access administrator routes.

Production must define `MFA_ENCRYPTION_KEY` with at least 32 characters and it must differ from `JWT_SECRET`. Changing this key makes existing encrypted TOTP secrets unreadable, so it must be stored and backed up as a long-lived application secret.

Enrollment now creates ten recovery codes and displays them once. Only SHA-256 hashes are stored. Each successful recovery login atomically marks one code used and writes an administrator security audit event. Administrators can replace the remaining set from profile settings only after entering a fresh authenticator code.

### Portability and build reliability

- Upgraded the backend build to Go 1.26 and added the locked `go.sum` dependency file.
- Made `dev`, `start`, `build`, and `lint` usable from Windows PowerShell.
- Removed shell argument concatenation from the frontend tool runner.
- Kept the specialized `install:ci` script Linux-only because it intentionally depends on Linux file locking and timeout utilities.

### Automated verification

- Added rate-limiter unit tests.
- Added recovery-code generation and normalization tests, metrics tests, and an end-to-end browser test for MFA enrollment and mandatory recovery-code acknowledgement.
- Added configuration tests for valid environments and unsafe production settings.
- Added CSRF and security-header middleware tests.
- Added RFC 6238 TOTP vector tests, encryption round-trip tests, and token-purpose tests proving that MFA challenges cannot be used as sessions.
- Added a PostgreSQL-backed administrator authorization integration test covering normal users, incomplete MFA, valid MFA, and stale tokens after role demotion. It runs when `TEST_DATABASE_URL` points to an isolated test database.
- Extended administrator authorization coverage for delegated permissions, live permission changes, denied sections, and suspended sub-administrator sessions.
- Added a PostgreSQL integration workflow proving a sub-admin without Delete access is denied, an authorized deletion remains intact while pending, and approval executes the requested operation.
- Added a local QR generation regression test that verifies authenticator URIs produce embedded PNG data without a remote service.
- Added a database-error regression test that recognizes the career/application foreign-key constraint, including wrapped PostgreSQL errors.
- Added company-account normalization and validation tests, including invalid timezone rejection, a PostgreSQL persistence round-trip, and an admin-render regression check for the new section.
- Added a PostgreSQL accounting workflow test covering invoice creation, partial payment, generated receipts, overpayment rejection, payment voiding, balance restoration, and invoice voiding.
- Expanded the rendered-homepage test to verify product metadata, navigation, inquiry UI, and privacy disclosure.
- Added rendered-page checks for favicon tags and the absence of unsupported Vinext image-proxy URLs.
- Fixed every ESLint error and warning found by the project rules.
- Added client asset budgets, automated WCAG A/AA checks, Cloudflare Worker deployment dry-runs, and the full Chromium workflow suite to CI.
- Added PostgreSQL to the backend CI job so account, contract, accounting, company, and administrator authorization integration tests no longer skip in automation.

### Shared account profiles

- Moved administrator sign-out from the sidebar into a shared top-right profile menu used by both administrator and client dashboards.
- Added secure display-name editing and authenticated JPG, PNG, or WebP profile-picture upload with a 2 MB limit.
- Added profile-picture replacement and removal, responsive avatar-only headers on small screens, and persistent database storage.

## Verification Results

- `go test ./...`: passed.
- `npm run lint`: passed with zero errors and zero warnings.
- `npm test`: passed; the production build completed and all 13 bundle, rendered-page, documentation, CSV, and QR tests passed.
- `npm run test:browser`: passed across 24 desktop/mobile, authentication, contract, record-verification, and WCAG scenarios.
- `npm audit`: passed with zero known vulnerabilities across production and development dependencies.
- `go vet ./...`: passed.
- Docker API build was previously verified after the Go version and lockfile fix.

## Important Remaining Work

The codebase controls are implemented. A production operator must still complete the environment-specific release duties in `docs/OPERATIONS.md`: configure SMTP credentials, an external metrics collector and alert destinations, copy backups to encrypted off-host storage, complete a recorded restore drill, perform a third-party penetration test, and confirm legal/privacy obligations for the launch jurisdiction.
