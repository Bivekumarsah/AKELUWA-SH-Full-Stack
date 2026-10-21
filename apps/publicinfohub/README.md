# AKELUWA PublicInfoHub — geographic directory beta

A lightweight standalone geographic directory with seven provinces, 77 districts, searchable names, sample service filters, service detail dialogs and links to government department homepages.

## Citizen utilities update — October 2026

Eight individual, crawlable utility pages were added under `/publicinfohub/utilities/` and linked from the main directory:

- `bs-ad-date-converter/` — AD ↔ BS conversion using pinned MIT-licensed `nepali-date-converter@3.4.0` via jsDelivr (requires a working connection to load the date engine). The dataset cannot predict revised future calendar dates.
- `nepal-age-calculator/` — date-of-birth input in AD or BS, Gregorian years/months/days output; confirm recruiting authority's cut-off rules.
- `nepal-tax-ssf-calculator/` — configurable salary/SSF breakdown, defaults 11% employee and 20% employer from [SSF FAQ](https://www.ssf.gov.np/images/page_content/16428652398814_faq_ssf.pdf). **Income tax is not calculated from unverified slabs**; user supplies payroll withholding. Refer to [IRD current rates](https://ird.gov.np/category/taxrateincentives/).
- `official-form-finder/` — browser search over curated source-backed government department and official portal links; no applicant records collected.
- `document-checklist-guides/` — browser checkboxes for general preparation steps, never presented as an official required-document list.
- `government-office-map/` — province-filtered map searches based on 28 existing homepage-verified directory records. **No GPS coordinates or map pins are verified.**
- `nepal-holiday-calendar/` — Gregorian month browser with a link to [MoHA's official 2083 BS holiday notice](https://moha.gov.np/en/page/government-and-public-holidays-in-2083); deliberately **does not label dates as holidays** until government dates can be reliably maintained.
- `official-exam-portal-directory/` — reuses the 8 federal/provincial Lok Sewa commission application portal records; no candidate credentials stored.

All tools are independent and free. The calculations work in the browser, and there are no new backend dependencies. The date-conversion tool relies on a fixed third-party CDN version; configure self-hosting only after reviewing the library license and calendar data. Tax, official form, public holidays, office locations, and exam eligibility remain subject to official verification. Updating source records must update linked detail pages. Company proxy integration uses the pre-existing `/publicinfohub/:path*` rewrite and Next.js route handler; changes become live only after a successful PublicInfoHub deployment.

Local checks: `node --test tests/*.test.mjs`, `node --check utilities/utility.js` and manual mobile browser checks.

## October 2026 reliability, discovery and SEO update

The interactive directory at `/publicinfohub/` now has **alphabetical, province-first, and latest-homepage-check sorting** for its government-office cards. The Passport and PAN shortcuts populate real service searches instead of just scrolling to an unfiltered section. Search remains entirely in the browser, and sorting is available in both English and Nepali.

A separate **server-readable, no-JavaScript office directory** is available at `/publicinfohub/offices/` on the company domain (or `/offices/` when hosted at the standalone origin). The page contains the currently documented 28 organization homepage records, grouped by Nepal's seven provinces, with their existing source URLs, checked dates and current limits of verification. This second URL is in the project's sitemap and linked from the interactive page.

**Updating the records:** `offices.js` remains the source of truth for the interactive site. When adding or changing checked offices, also regenerate/reconcile `offices/index.html`, the homepage directory count/link, and the sitemap as appropriate. `tests/office-index.test.mjs` deliberately fails if the static index is inconsistent with the office records. Only use checked first-party sources and genuine check dates. An organization homepage being checked does **not** prove current fees, procedures, appointments, or district-level service delivery.

To verify locally (Node.js 22+):
```sh
node --test tests/*.test.mjs
node --check data.js
node --check offices.js
node --check office-discovery.js
node --check share.js
node --check app.js
node --check i18n.js
```

The existing public domain uses the independently deployed PublicInfoHub Vercel site as upstream for the Company route; a Company redeployment is not normally required for these static improvements. Continue to verify nested `/publicinfohub/` and `/publicinfohub/offices/` routes after deployment.

## PublicInfoHub branding

The responsive navigation header displays `assets/publicinfohub-logo.webp`, resized directly from the user's approved blue-A-and-globe artwork. The browser favicon at `assets/publicinfohub-favicon.webp` uses the **same exact design**, resized for a tab icon (no substituted information emblem). Both are self-hosted in the PublicInfoHub repository and work through the `/publicinfohub/` nested route; they do not affect the main AKELUWA company logo or AKELUWA Toolbox. Because these are compact web assets, retain the original high-resolution master image for future marketing and print design.

## Local setup
Download/clone the repo and open index.html in a browser, or run `python -m http.server 8000` and open http://localhost:8000.

## Important limitations
- Sample directory entries only; NOT a verified nationwide government directory.
- Province selection now displays the 77-district geographic index; no district-level office/service records have been verified or added.
- Province/district choice does NOT imply the sample nationwide services are available locally.
- There is no backend, user account, admin panel, analytics, or payment processing.
- Official links and procedures must be reverified before production publication.
- Not affiliated with the Government of Nepal.

## Phase 2 verification
- Geographic labels are indexed in `data.js`. Names can have transliteration variants; treat this as a navigation index, not a certified administrative register.
- Cross-check province names with the [Nepal Tourism Board](https://ntb.gov.np/en/provinces), district names with the [Election Commission](https://election.gov.np/en/election-offices) and the [Nepal Law Commission](https://repository.lawcommission.gov.np/).
- Run `node --test tests/*.test.mjs` to validate dataset counts and basic static delivery configuration.
- PublicInfoHub is still independent from the Government of Nepal. The existing six services are general references only, and official sites must be checked for current procedures.

## Phase 3: First source-backed federal departments\nFive initial federal government department homepages were checked on 2026-10-09 and recorded in `offices.js`: Department of Passports, Inland Revenue Department, Office of Company Registrar, Department of Transport Management, and Department of National ID and Civil Registration. Each record contains its official source URL, a check date, a headquarters location, and a narrow `homepage-verified` status.\n\nVerification here means only that the homepage represented the listed government organization at review time. It does **not** certify current procedures, local service provision, fees, appointments, or contact details. The initial five Phase 3 office records were federal headquarters in Kathmandu; Phase 4 adds three municipal administrations and two more federal departments. The directory does **not** enumerate all municipal governments or field offices.\n\nThe office section is independently searchable using the office name, Nepali name, category and location. Run `node --test tests/*.test.mjs` for tests. To add records, manually check the first-party government website and provide a new source URL and genuine review date. Do not invent field offices to populate geographic filters.\n\n## Phase 4: Local-government directory starter set

The office index now contains 10 organizations: seven federal departments and **three source-checked municipal government websites** in Bagmati Province: [Kathmandu Metropolitan City](https://kathmandu.gov.np/), [Lalitpur Metropolitan City](https://lmc.gov.np/en/), and [Bhaktapur Municipality](https://bhaktapurmun.gov.np/en). The two new federal departments are [Department of Survey](https://dos.gov.np/contact-us/) and [Department of Land Management and Archive](https://www.dolrm.gov.np/). Sources were reviewed on 2026-10-09.

The directory can filter headquarters by Kathmandu, Lalitpur or Bhaktapur district and by Federal/Local level. These **headquarters filters are separate** from province/district browsing: selecting a district in the geography navigator does not assert which government services are available there. `homepage-verified` only means the organization and its official homepage were checked. Do not publish application fees, hours, direct contacts, ward-level services or sub-offices without further verification.

## Phase 5: All-seven-province starter coverage

Six additional local-government websites have been checked against their first-party government homepages (2026-10-09), bringing the office index to **16 organization records: seven federal and nine local**, with at least one local government in each of Nepal's seven provinces.

| Province | Local government added | Official source |
| --- | --- | --- |
| Koshi | Biratnagar Metropolitan City | https://biratnagarmun.gov.np/en |
| Madhesh | Janakpurdham Sub-Metropolitan City | https://janakpurmun.gov.np/en |
| Gandaki | Pokhara Metropolitan City | https://pokharamun.gov.np/ |
| Lumbini | Butwal Sub-Metropolitan City | https://butwalmun.gov.np/ |
| Karnali | Birendranagar Municipality | https://birendranagarmun.gov.np/en |
| Sudurpashchim | Dhangadhi Sub-Metropolitan City | https://dhangadhimun.gov.np/ |

Bagmati already has three local-government entries from Phase 4. Office filters for province and headquarters district are now generated from actual records, rather than a fixed list. A bug where office search listeners only initialized after closing a service modal was also fixed.

**Limit:** one record in a province does not establish a complete municipal roster, verified service availability, or the total number of local governments listed. Government procedures, fees, ward offices and contacts require further fact-checking. Existing federal headquarters remain indexed in Bagmati only.

## Phase 6: Seven additional municipal official-source links

Phase 6 adds seven local governments to the source-backed directory, bringing the index to **23 organizations: 16 local governments and 7 federal departments**. This remains a curated *subset*, not a directory of all 753 local governments. Each entry includes a government homepage/source and a dated review (2026-10-09).

| Province | New organization | First-party government source |
| --- | --- | --- |
| Koshi | Itahari Sub-Metropolitan City (Sunsari) | https://www.itaharimun.gov.np/en/node/32 |
| Madhesh | Birgunj Metropolitan City (Parsa) | https://www.birgunjmun.gov.np/en |
| Bagmati | Bharatpur Metropolitan City (Chitwan) | https://bharatpurmun.gov.np/en |
| Bagmati | Hetauda Sub-Metropolitan City (Makwanpur) | https://hetaudamun.gov.np/en |
| Gandaki | Gorkha Municipality (Gorkha) | https://gorkhamun.gov.np/en |
| Lumbini | Ghorahi Sub-Metropolitan City (Dang) | https://www.ghorahimun.gov.np/en/content/welcome-official-website-ghorahi-sub-metropolitan-city |
| Sudurpashchim | Tikapur Municipality (Kailali) | https://tikapurmun.gov.np/en |

The office index now reports the actual number of records and provides a reset control for government-office filters. It does not claim that these sites provide every service, fee, application requirement, or ward-level contact. The offices' listed headquarters district is **not** a service-availability filter.

## Phase 7: Mobile navigation and search experience

- Adds a keyboard-accessible mobile menu with proper expanded state, dismissal when a link is selected, outside-click dismissal and Escape support.
- Adds a visible-on-focus **Skip to main content** link and clearly labeled search landmarks.
- Homepage search now routes results to the most relevant service, district or government-office section; office-only searches also prefill the office-specific search.
- The Government Offices category card now navigates to the real office directory, instead of presenting it as a sample service category.
- Improves touch-target sizes, responsive office filter layout, service cards, reduced-motion behavior and focus visibility.
- Does not change the 23 government office records, their verification scope or the existing government disclaimer.

**Manual preview checks:** test header navigation on a small screen, close it with Escape and with a selected link, search for `passport`, `Kathmandu`, and `Biratnagar`, then confirm old category filters, province browsing, office search and modal controls still work.

## Phase 8: Five more source-checked municipal homepages and district-to-office discovery

Adds five independently checked municipal government homepages, for **28 indexed organization records** (21 local governments; 7 federal departments):

| Office | Province | District | Official first-party source |
| --- | --- | --- | --- |
| Dharan Sub-Metropolitan City | Koshi | Sunsari | https://www.dharan.gov.np/en |
| Damak Municipality | Koshi | Jhapa | https://www.damakmun.gov.np/en |
| Dhulikhel Municipality | Bagmati | Kavrepalanchok | https://www.dhulikhelmun.gov.np/en |
| Banepa Municipality | Bagmati | Kavrepalanchok | https://www.banepamun.gov.np/en |
| Nepalgunj Sub-Metropolitan City | Lumbini | Banke | https://www.nepalgunjmun.gov.np/en |

All five were checked on **2026-10-09** for government identity and official homepage only; current appointments, fees, eligibility, ward services and uptime are **not** verified.

The provinces/districts section now explains how many **listed local-government homepages** match a selected district and shows a **View listed local government offices** action only if a corresponding source-backed record exists. The action opens the offices section and selects **Local** government level, province and district. Districts without a current record display an honest incomplete-coverage message, not a claim that an office does not exist.

Preview checks before merging: select Bagmati → Kavrepalanchok (2 listed offices), Koshi → Sunsari (2 listed offices), Lumbini → Banke (1 listed office), and a district without indexed offices (no action). Verify reset controls, independent office filters, logo/favicon and mobile layout. This release does not change the main company repository or Toolbox.

## Phase 9: English and Nepali interface

A visible `नेपाली / English` toggle updates the interface language **without refreshing the page**. The header, navigation, search instructions, category cards, province names, district counts, office filters, result summaries, sample service cards, dialogs, and independence/verification disclaimer have Nepali UI strings. `<html lang>` and accessible form names update on switch.

Canonical directory filters still use unchanged English keys, and government offices retain their source-provided English and Nepali names, original government links and 2026-10-09 homepage-check records. This is a **first-pass interface translation**, not a legal/official translation of government application procedures. District names, some office addresses and underlying source-provided data can remain in English; government instructions must be checked on the official sites.

Manual QA before merge: toggle language both ways on desktop/mobile; open Passport details; try Nepali text in search; change office province and district filters *before and after switching*; test reset, modal accessibility and mobile menu; confirm all existing verified links and disclaimer remain present.

## Phase 10: Search discovery and static performance

- Sets a **single canonical URL** to the company-domain route: `https://www.akeluwasoftwarehub.com.np/publicinfohub/`. The standalone Vercel address serves the same page, with a canonical tag pointing to the company route to reduce duplicate indexing.
- Adds descriptive page metadata, Open Graph and Twitter summary-card fields, and honest `WebSite` / `CollectionPage` JSON-LD without claiming government affiliation or inventing government services.
- Adds a single-entry `sitemap.xml` for the real, indexable PublicInfoHub homepage. Provinces, districts and offices do **not** have separate URLs, so they are intentionally not listed as independent pages.
- Adds a standalone-project `robots.txt` pointing to the canonical sitemap. The **company-domain root** `/robots.txt` remains controlled by the separate AKELUWA corporate repository; this change does not update that root file. Confirm that the company-domain reverse proxy serves `/publicinfohub/sitemap.xml` after deployment and submit that address to the company's verified Google Search Console property if desired.
- Adds a one-hour static-asset cache with stale-while-revalidate on the standalone and prefixed routes; HTML caching is unchanged. CSS, scripts and brand asset filenames are currently stable, so avoid aggressive immutable caching.
- Marks app scripts as `defer` in dependency order and gives the tiny header logo a high fetch priority.
- Adds SEO regression tests plus syntax checks for bilingual and directory scripts in GitHub Actions.

**Limitations:** Metadata and a sitemap help crawlers discover the page but do not guarantee Google indexing, ranking, rich results or measured speed improvements. Social previews use the existing compact WEBP brand image; some social crawlers may prefer a future dedicated PNG/JPEG share image. Full Core Web Vitals measurements and browser inspection should be performed after preview deployment.

**Manual preview checklist:** verify homepage, favicon/logo, English/Nepali switch, district-to-office browsing and mobile navigation; inspect page metadata and `/publicinfohub/sitemap.xml` on the preview; after a production merge, confirm the company-domain sitemap and robots policy with a browser or Search Console.

## Phase 12: Nepal Lok Sewa information directory

Adds a dedicated bilingual **Lok Sewa / लोक सेवा** section listing one federal Public Service Commission and all **seven provincial commissions**, classified by government level and province. The directory explains which authority to consult for federal, provincial and local recruitment, and provides links to official commission pages for vacancies, syllabuses, exam centres, results and current application guidance.

**Verified official commission websites (2026-10-09):**
- Federal: https://psc.gov.np/
- Koshi: https://psc.koshi.gov.np/
- Madhesh: https://ppsc.madhesh.gov.np/
- Bagmati: https://spsc.bagamati.gov.np/
- Gandaki: https://ppsc.gandaki.gov.np/
- Lumbini: https://ppsc.lumbini.gov.np/
- Karnali: https://ppsc.karnali.gov.np/
- Sudurpashchim: https://psc.sudurpashchim.gov.np/

**Federal application/login:** `https://psconline1.psc.gov.np/#/login` (user-supplied official `.gov.np` URL).\n\n**Direct provincial application/login links:** Koshi `https://psconline.koshi.gov.np/login`, Madhesh `https://ppsconline.p2.gov.np/login`, Bagmati `https://ppsconline.bagamati.gov.np/login`, Gandaki `https://onlineppsc.gandaki.gov.np/login`, Lumbini `https://ppsconline.lumbini.gov.np/login`, Karnali `https://ppsconline.karnali.gov.np/` and Sudurpashchim `https://ppsconline.sudurpashchim.gov.np/`. The Madhesh link is documented in official application notices but a direct live page fetch timed out during this update; Bagmati and Gandaki presented online recruitment system login apps. The federal commission also provides the application/login URL above; all eight commissions now have direct application links.

This is a **third-party directory**, not a government login page. It collects no passwords, applicant documents or payments. Each applicant must consult the specific official advertisement for qualification, deadline, payment, syllabus, exam centre, results and the recruiting authority. **Local government hiring does not have a universal Lok Sewa portal**: some positions are handled by provincial commissions and other positions by the responsible authority.

The new section does not add records to the existing separately verified 28-office general government directory. No corporate-site, Toolbox or Vercel configuration is changed. GitHub Actions validates the eight commission websites and confirmed login-list entries; the draft PR must be previewed and approved before merging.

**Manual review:** verify the header navigation and category card open the Lok Sewa section; test all/federal/provincial and province filters, official site and login links, switch English/Nepali, confirm no embedded login or payment form, and test small-screen presentation.

## Phase 13 reference-photo banner handoff

The premium homepage CSS now matches the approved photo-led Nepal layout with six category cards, seven province choices, a 77-district dropdown, Lok Sewa, office directory and mobile responsiveness. **The two user-supplied panorama photos are not in GitHub yet**: GitHub text-file editing cannot transfer their binary bytes. The CSS already references:

- `assets/nepal-temple-banner.webp` (desktop panorama)
- `assets/nepal-temple-banner-mobile.webp` (mobile panorama)

To see the **exact supplied photographs** locally, obtain `AKELUWA_Phase13_Photo_Banners.zip` from the ChatGPT conversation and unzip the enclosed `assets/` folder into this repository root (alongside `index.html`). They were optimized as WebP (~151 KB and ~167 KB). Without them, the existing original `assets/nepal-heritage-hero.svg` displays as the fallback, so the site remains functional. To include the photos in the development PR, commit and push these assets to this feature branch only when approved.

No image, page, emblem or website domain in the generated concept screenshot should be represented as a real government affiliation. Accurate information and actual source links take precedence over literal placeholder labels. The user's original brand logo remains unchanged.

## Phase 13 — Premium original UI and complete site footer

This branch builds on Phase 12, retaining the original company-approved PublicInfoHub logo, all government directory records, the federal + provincial Lok Sewa application links, English/Nepali interface, province/district selectors, filters, and search.

**Nepal heritage visual update:** Hero now includes original responsive `assets/nepal-heritage-hero.svg` illustrating Himalayan peaks and a traditional pagoda, with dark overlays for legible headings and search controls. This is custom vector illustration rather than a photograph or a reproduction of any specific protected historical image. Six distinctive category treatments now include Local Services; seven province-selection cards have ordinal number badges and accurate labels/district counts rather than speculative geographic outlines. All directory interactions and English/Nepali translations are preserved. No live remote image loading required.

**Design:** Original civic-tech homepage styling (deep navy, teal accents, restrained premium cards, accessible focus states, mobile and tablet breakpoints, reduced-motion styling), clear hero search, popular starting points, government-directory navigation, geographic browsing and section labels. The visual concept is original; no third-party template or government identity has been copied. Any illustrated design references are **not** production assets. The product remains an independent information directory and makes no government affiliation claim.

**Footer:** Product identity and accountable operator (AKELUWA Softwarehub), links to existing directories, in-page About/Privacy/Terms/Accessibility/Sources notices, safe official company contact route (no invented email address or phone), independent-directory disclaimer, automatically updated copyright year and back-to-top link. The legal-information text is a plain-language **starting point, not a compliance audit or legal opinion**; review it against actual deployment, analytics, cookies, and applicable Nepal law before release. Claims describe current static client behavior only.

**Review locally:**
```powershell
git fetch origin
git switch feature/phase13-premium-ui-footer
git pull origin feature/phase13-premium-ui-footer
npx serve -l 3000
```
Open http://localhost:3000 and test desktop/mobile, Nepali switching, category links, province/district selections, office filters, Lok Sewa login navigation, tab/keyboard focus, policy links and footer. Note: this feature branch is based on Phase 12, so merging should be coordinated with PR #11 first. Production, corporate site and Toolbox have not been modified.

## Next steps
Add verified government source data, a persistent database, administration workflows, Nepali translations, accessible routing and SEO pages.

## Deploy under the existing company domain

The standalone Vercel deployment supports both the root of its own deployment and `/publicinfohub/`. `vercel.json` rewrites nested paths to static files such as `index.html`, `styles.css`, `data.js`, `offices.js`, and `app.js`.

1. Import this repository into Vercel as a separate project. Choose **Other** for Framework Preset, and leave the build command empty. Ensure the output directory is the repository root (do not select a subdirectory).
2. Confirm these URLs work on the PublicInfoHub Vercel deployment:
   - `https://<your-publicinfohub-project>.vercel.app/publicinfohub/`
   - `https://<your-publicinfohub-project>.vercel.app/publicinfohub/styles.css`
   - `https://<your-publicinfohub-project>.vercel.app/publicinfohub/app.js`
3. In the **AKELUWA-SH-Full-Stack** Vercel project, create the environment variable `PUBLIC_INFO_HUB_ORIGIN=https://<your-publicinfohub-project>.vercel.app` (without a trailing slash). Set it for Production; optionally Preview and Development if useful.
4. Redeploy the company website so Next.js reads the variable at build time.
5. Verify `https://www.akeluwasoftwarehub.com.np/publicinfohub/` as well as existing `/akeluwatoolbox/` pages.

The current company integration uses a dedicated proxy route and defaults to `https://publicinfohub.vercel.app` when `PUBLIC_INFO_HUB_ORIGIN` is not set. Do not point the origin back to the company domain, which could create a loop. No change to Toolbox is necessary.

The site still only includes illustrative service entries; do not treat them as verified application instructions.
