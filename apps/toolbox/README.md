# AKELUWA ToolBox — canonical monorepo source

This is the company-customized, full-feature Toolbox with its Digital Stamp Maker, country templates, mobile live previews, PDF and image processing, accessibility and SEO. The company app uses this directory through a tracked symlink, not a duplicated source tree.

To build for the company domain, run `npm --prefix apps/company run build:vercel` at repo root. It creates `apps/company/public/akeluwatoolbox`.

To build the standalone tools for testing, run `node apps/toolbox/scripts/build-static.mjs`; output is `apps/toolbox/dist`. No Django server is required for hosted browser tools.

The optional local PDF engine lives at `services/pdf-engine`. Launch from this directory using `start-linux-mac.sh` or `start-windows.bat`.

The old standalone GitHub repository remains intact; the five nonidentical older homepage/style/SEO/build files should not replace this customized source without review.
