# PublicInfoHub routing (standalone source of truth)

PublicInfoHub's source is maintained in [AKELUWA-PublicInfoHub](https://github.com/Bivekumarsah/AKELUWA-PublicInfoHub), not copied into this company repository.

- Standalone deployment: https://publicinfohub.vercel.app/publicinfohub/
- Company URL: https://www.akeluwasoftwarehub.com.np/publicinfohub/
- Company's Next.js `beforeFiles` rewrites send `/publicinfohub/` and its nested assets to the standalone Vercel deployment.
- `/publicinfohub` redirects to `/publicinfohub/`.
- Optional `PUBLIC_INFO_HUB_ORIGIN`: override the deployment origin, e.g. `https://publicinfohub.vercel.app` (without a path or trailing slash). Defaults to that deployment when not configured.
- Keep the standalone PublicInfoHub Vercel project enabled and publicly accessible. Verify its `/publicinfohub/`, `/publicinfohub/styles.css`, and `/publicinfohub/app.js` URLs before merging.
- No PublicInfoHub application files, routes, or build-copy steps are stored in this repo.
- Toolbox builds and routes are unaffected.

## Deployment sequence

1. Deploy/test the PublicInfoHub repository on its own Vercel project.
2. Merge this company-site PR when ready.
3. Redeploy the main company project on Vercel.
4. Confirm `/publicinfohub/`, CSS/JS assets, and existing `/akeluwatoolbox/` work from the company domain.
5. Later PublicInfoHub deployments should update the company URL without redeploying the company site.

## Rollback

If the company path does not work, revert this PR to restore the previous bundled PublicInfoHub implementation, and redeploy the company project.

## Other hosting targets

This change assumes a Next.js/Vercel deployment with support for external rewrites. If deploying via Cloudflare/Vinext, verify equivalent proxy behavior on preview before activating this change there.
