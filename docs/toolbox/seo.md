# SEO and the website domain

The current primary address is **https://akeluwatoolbox-website.vercel.app/**. A custom domain is not required to start indexing the site. Search visibility depends on useful pages, reliable tools, crawlability, links, and competition; this setup does not guarantee rankings.

## What the project provides

The static build creates the homepage and nine tool pages. Each has an individual title, description, canonical URL, social sharing metadata, structured data, instructions, questions, and related links. The selected tool and its guide are visible in the built HTML before JavaScript runs. Browser navigation preserves open tool state and updates the URL, metadata, and guide; browser Back and reload are supported.

Page definitions and copy live in `website/assets/js/seo.js`. The build uses this same data to create `sitemap.xml` and `robots.txt`. Both supported Vercel roots publish only the generated browser site. Unknown paths return 404 instead of being rewritten to the homepage. Old `?tool=` entry points redirect to the corresponding tool page on Vercel. Vercel preview builds include `noindex` and discourage crawling.

## Start Google Search Console

1. Add a **URL-prefix property** for `https://akeluwatoolbox-website.vercel.app/` in [Google Search Console](https://search.google.com/search-console).
2. Verify ownership using a supported method. If using an HTML verification tag, provide the exact tag so it can be added to the source head and retained by the build. Do not share a Google password.
3. Submit `https://akeluwatoolbox-website.vercel.app/sitemap.xml`.
4. Inspect the homepage and important tool pages using URL Inspection. Run the live test and request indexing after checking the result.
5. Monitor indexed pages, impressions, queries, and clicks. Indexing requests do not guarantee indexing or a particular ranking.

Search Console ownership and submissions are actions in the owner's Google account. They are not completed automatically by a website build. No analytics or tracking script has been added.

The supplied Google HTML-file verification document is preserved unchanged as `website/googlefb3975d72926d897.html`. Both build entry points publish it at `/googlefb3975d72926d897.html`, and the local server serves that same file. Leave it in the project after verification because Google can recheck ownership. The site owner must still click **Verify** in the URL-prefix property's HTML-file verification panel.

## If the website does not appear when you search

First distinguish whether Google has indexed the URL from whether it ranks for the phrase you searched. Use **URL Inspection** in the property's Search Console to inspect `https://akeluwatoolbox-website.vercel.app/`. A `site:` search is a quick clue, but it does not list every indexed URL and cannot confirm the reason a page is missing.

After deploying the current build to **Production** on Vercel:

1. Open the public homepage, `/compress-pdf/`, `/compress-photo/`, `/robots.txt`, `/sitemap.xml`, and `/googlefb3975d72926d897.html` in a private browser window. They must work without signing into Vercel. The verification document must contain `google-site-verification: googlefb3975d72926d897.html`.
2. Confirm the production page source has `index, follow`, its canonical points to the same public domain, and `robots.txt` allows crawling. A deployment created as a preview deliberately blocks indexing; publish a production deployment rather than removing preview protection.
3. Verify the URL-prefix property, submit `sitemap.xml` in **Sitemaps**, and check its processing status. A verification file in the website does not by itself complete verification or submit a sitemap.
4. Inspect the homepage and the two compressor URLs. Check the indexed result, then use **Test live URL** to check the current deployment. The live test checks accessibility and eligibility; it does not prove that the URL is already indexed. If the live test passes, choose **Request indexing**.
5. If a URL is excluded, use the reported reason: fix login/server errors, blocking directives, or a canonical pointing elsewhere. For `Discovered - currently not indexed` or `Crawled - currently not indexed`, review the page's useful content and internal links and monitor subsequent crawling. Repeated indexing requests do not speed up crawling.

If the URL is indexed but does not appear for a broad phrase such as "compress PDF", inspect **Performance** for actual impressions, queries, and positions. Clear tool names and helpful instructions can improve relevance, but competitive queries require useful content, a reliable experience, and recognition over time. Google says crawling can take days to weeks, and requesting it does not guarantee inclusion.

The homepage title starts with the brand, its visible headline describes PDF and photo tools, and its `WebSite` data supplies the preferred name and spelling alternatives. Converter pages have a heading specific to the selected tool in both the initial HTML and browser navigation.

The hero also uses the joined brand spelling `AkeluwaToolBox`. Homepage tool cards, the logo, and the main PDF action use real links to their corresponding pages, with JavaScript preserving the current workspace for ordinary clicks. These links also work without JavaScript and support browser actions such as opening another tab. Tool guides include visible breadcrumbs and practical compression/extraction examples. Each page's structured data connects its `WebPage` to the application and the site's canonical identity.

If the live test reports resource errors, check **View tested page** for its HTML, screenshot, and resource details. An "Other error" for a script does not identify the cause or prove that the page cannot be indexed. The PDF libraries and worker are now served from `/assets/vendor/` on the website, avoiding the previous dependency on Google's fetch of cdnjs resources. Titles, guides, canonical links, and structured data also remain in the initial HTML. Browser checks run with cdnjs blocked to verify the site and PDF tools still work.

References: [Get your website on Google](https://developers.google.com/search/docs/fundamentals/get-on-google), [Request recrawling](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Site names](https://developers.google.com/search/docs/appearance/site-names).

## Search result branding

The homepage declares `Akeluwa ToolBox` as its preferred site name, with `AkeluwaToolBox`, `Akeluwa Toolbox`, and the current hostname as alternatives. The Open Graph site name, application name, manifest, and visible homepage branding use the same preferred name. The homepage also explains what the brand's PDF and photo tools do. The favicon is a square transparent PNG at `/assets/images/favicon.png`; the supplied original artwork remains in `docs/branding/`.

After changing these signals, request indexing of the production homepage once in Search Console. Google chooses the site name and favicon and needs to recrawl the homepage and icon; changes can take days to weeks and are not guaranteed. Google's AI Overview is generated separately: website metadata cannot directly replace its wording. Use Google's feedback control to report an inaccurate overview.

References: [Site names](https://developers.google.com/search/docs/appearance/site-names), [Favicon requirements](https://developers.google.com/search/docs/appearance/favicon-in-search), [AI Overview feedback](https://support.google.com/websearch/answer/14901683).

## Later: use a custom domain

1. Add the domain to the same Vercel project and configure its DNS. Confirm HTTPS and the existing tool paths work on that domain.
2. In the Vercel project's **Production** environment variables, set `SITE_URL` to the new HTTPS origin, such as `https://tools.example.org`. Use only the origin, with no path or query. Rebuild/deploy. The build replaces every page's canonical, schema, sharing URL, and sitemap address together.
3. Configure permanent server redirects (301 or 308) from the old domain to the matching paths on the new domain. Keep those redirects available; do not send every tool URL to the new homepage.
4. Verify the new site in Search Console, submit its sitemap, and use Change of Address for the old property when eligible. Check redirected URLs and monitor indexing during the move.

The default origin is in `website/assets/js/seo.js`; `SITE_URL` overrides it for a deployment. Changing the domain preserves the tool paths. Do not set `SITE_URL` to a temporary preview URL. A domain move can temporarily affect search visibility.

## Maintain useful content

Keep guides accurate when tool capabilities change. Add original examples and troubleshooting information that answer real user questions. Use natural titles and descriptions; do not create repetitive pages just to repeat keywords or invent ratings/reviews. Test mobile speed and actual downloads as the tools evolve.

References: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [URL Inspection](https://support.google.com/webmasters/answer/9012289), [site moves](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).
