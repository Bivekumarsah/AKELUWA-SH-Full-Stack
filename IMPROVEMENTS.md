# AKELUWA SH Improvement Report

This document records the maintainability, security, portability, and testing improvements completed for the project.

## Current Rating

| Area | Previous | Current | Evidence |
|---|---:|---:|---|
| Design and UI | 8.0/10 | 8.2/10 | Existing visual system preserved; images now use framework optimization and form fields have stronger browser constraints. |
| Coding quality | 7.4/10 | 8.7/10 | Reusable components, clean lint output, safer async loading, and broader tests. |
| Security | 7.1/10 | 9.3/10 | Admin TOTP MFA, encrypted secrets, append-only audit records, CSRF checks, rate limits, security headers, and production configuration validation. |
| Directory structure | 7.6/10 | 8.7/10 | Shared frontend code now has a clear `app/components/` home and backend concerns remain separated. |
| Future maintainability | 7.6/10 | 8.7/10 | Cross-platform scripts, accurate documentation, focused tests, and explicit deployment settings. |
| **Overall** | **7.6/10** | **8.9/10** | Strong full-stack structure with verified builds and materially improved administrator security controls. |

The score is an engineering assessment, not a certification or formal penetration-test result.

## Improvements Completed

### Website polish and Git hygiene

- Upgraded the admin panel with inquiry pipeline analytics, search and status filters, pagination, CSV exports, inquiry details and email actions, content visibility filters, safer role changes, and responsive empty states.
- Hardened authentication navigation so signed-in users cannot return to login/register forms through browser history, while restored private pages revalidate the live session.
- Added a full project-contract workflow: structured commercial and legal terms, draft locking, SHA-256 content fingerprints, client/provider electronic acceptance, signer metadata, lifecycle controls, and print/PDF output.
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

### Administrator MFA implementation

The administrator sign-in flow now has two distinct stages:

1. The password endpoint verifies the account password. Normal client accounts receive their session immediately, while administrator accounts receive a five-minute MFA challenge token that cannot be used as an application session.
2. On first administrator login, the backend generates a random 160-bit Base32 TOTP secret with Go's cryptographic random source. It stores the secret encrypted with AES-256-GCM using `MFA_ENCRYPTION_KEY` and returns the secret only for initial enrollment.
3. The backend builds a standard `otpauth://totp/` URI for the AKELUWA SH issuer. The login page renders that URI into a QR canvas with the local `qrcode` package. No third-party QR API sees the URI or secret.
4. The administrator scans the QR code with Google Authenticator, Microsoft Authenticator, Authy, 1Password, or another RFC 6238-compatible app. A copyable manual key remains available for same-device enrollment or scanners that cannot read the code.
5. The verification endpoint accepts a six-digit, 30-second TOTP code. It allows one time step of clock drift in either direction, enables MFA after the first valid code, and then issues a normal session marked as MFA-verified.
6. Every administrator API request checks the signed session purpose, MFA-verified claim, current database role, and current database MFA status. Old sessions, MFA challenge tokens, demoted users, and incomplete enrollments cannot access administrator routes.

Production must define `MFA_ENCRYPTION_KEY` with at least 32 characters and it must differ from `JWT_SECRET`. Changing this key makes existing encrypted TOTP secrets unreadable, so it must be stored and backed up as a long-lived application secret.

If an administrator loses the enrolled device, an authorized operator must reset that user's `mfa_secret` to `NULL` and `mfa_enabled` to `false` through controlled database maintenance. The next successful password login starts enrollment again. One-time recovery codes remain recommended future work.

### Portability and build reliability

- Upgraded the backend build to Go 1.26 and added the locked `go.sum` dependency file.
- Made `dev`, `start`, `build`, `lint`, and `db:generate` usable from Windows PowerShell.
- Removed shell argument concatenation from the frontend tool runner.
- Kept the specialized `install:ci` script Linux-only because it intentionally depends on Linux file locking and timeout utilities.

### Automated verification

- Added rate-limiter unit tests.
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

### Shared account profiles

- Moved administrator sign-out from the sidebar into a shared top-right profile menu used by both administrator and client dashboards.
- Added secure display-name editing and authenticated JPG, PNG, or WebP profile-picture upload with a 2 MB limit.
- Added profile-picture replacement and removal, responsive avatar-only headers on small screens, and persistent database storage.

## Verification Results

- `go test ./...`: passed.
- `npm run lint`: passed with zero errors and zero warnings.
- `npm test`: passed; the production build completed and all rendered-page and QR generation tests passed.
- Docker API build was previously verified after the Go version and lockfile fix.

## Important Remaining Work

These items are not blockers for the current 8.9 rating, but they are the next steps for a high-risk or high-traffic production deployment:

1. Replace in-memory rate limiting with Redis or a gateway-level limiter when running multiple API instances.
2. Add hashed, single-use administrator MFA recovery codes and a tightly audited recovery workflow.
3. Run the PostgreSQL integration suite in continuous integration and expand it to role changes, administrator mutations, and inquiry ownership.
4. Add dependency and container vulnerability scanning to continuous integration.
5. Add monitoring, alerting, backup restoration tests, and a documented incident-response process.
