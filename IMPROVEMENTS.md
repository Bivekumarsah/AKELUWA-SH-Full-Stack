# AKELUWA SH Improvement Report

This document records the maintainability, security, portability, and testing improvements completed for the project.

## Current Rating

| Area | Previous | Current | Evidence |
|---|---:|---:|---|
| Design and UI | 8.0/10 | 8.2/10 | Existing visual system preserved; images now use framework optimization and form fields have stronger browser constraints. |
| Coding quality | 7.4/10 | 8.7/10 | Reusable components, clean lint output, safer async loading, and broader tests. |
| Security | 7.1/10 | 8.6/10 | CSRF checks, production configuration validation, rate limits, security headers, admin audit events, and HTTP limits. |
| Directory structure | 7.6/10 | 8.7/10 | Shared frontend code now has a clear `app/components/` home and backend concerns remain separated. |
| Future maintainability | 7.6/10 | 8.7/10 | Cross-platform scripts, accurate documentation, focused tests, and explicit deployment settings. |
| **Overall** | **7.6/10** | **8.6/10** | Strong full-stack structure with verified builds and materially improved security controls. |

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

- Added `app/components/site-header.tsx` for shared site navigation.
- Added `app/components/site-footer.tsx` for company, trust, and legal content.
- Added `app/components/project-inquiry-form.tsx` to isolate form state and API submission behavior.
- Reduced the responsibilities of `app/page.tsx` by moving reusable UI and form logic out of the page.
- Replaced internal page anchors with framework links and static logos with dimensioned framework image components.
- Added the AKELUWA company mark as the browser favicon and Apple touch icon.
- Served local logo images directly to avoid Vinext development crashes when Cloudflare image bindings are unavailable.
- Reworked admin startup loading to avoid unsafe state updates after unmount.

### Security

- Added per-client rate limiting to login, registration, and inquiry endpoints.
- Added CSRF protection for write requests that use the session cookie. Browser requests must provide an allowed `Origin`.
- Added Content Security Policy, Permissions Policy, HSTS in secure deployments, frame protection, content-type protection, and no-store headers.
- Added structured audit log events for administrator write operations.
- Added request-header size and header-read timeout limits to the HTTP server.
- Added `APP_ENV` and production startup checks. Production now rejects insecure cookies, HTTP CORS origins, malformed origins, excessive session lifetimes, and known placeholder secrets.
- Corrected the privacy disclosure so it accurately states that inquiry details are stored and a necessary session cookie is used.

### Portability and build reliability

- Upgraded the backend build to Go 1.26 and added the locked `go.sum` dependency file.
- Made `dev`, `start`, `build`, `lint`, and `db:generate` usable from Windows PowerShell.
- Removed shell argument concatenation from the frontend tool runner.
- Kept the specialized `install:ci` script Linux-only because it intentionally depends on Linux file locking and timeout utilities.

### Automated verification

- Added rate-limiter unit tests.
- Added configuration tests for valid environments and unsafe production settings.
- Added CSRF and security-header middleware tests.
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
- `npm test`: passed; the production build completed and the rendered-page test passed.
- Docker API build was previously verified after the Go version and lockfile fix.

## Important Remaining Work

These items are not blockers for the current 8.6 rating, but they are the next steps for a high-risk or high-traffic production deployment:

1. Replace in-memory rate limiting with Redis or a gateway-level limiter when running multiple API instances.
2. Persist administrator audit events in append-only storage instead of relying only on application logs.
3. Add database-backed integration tests for administrator authorization, role changes, and inquiry ownership.
4. Add dependency and container vulnerability scanning to continuous integration.
5. Add monitoring, alerting, backup restoration tests, and a documented incident-response process.
