# WebLift SA — Integrated Admin Navigation

Render-hosted static administration shell to present the existing WebLift admin workspace and Sales & Pricing Centre under one navigation.

## Production architecture
- Original WebLift public website remains hosted on Vercel and unchanged.
- The main /admin.html path is rewritten to this Render static page using a Vercel project-level route (once tested).
- The new /admin/original path rewrites to the previous official /admin.html on WebLift's immutable production deployment.
- The /admin/sales path already rewrites to the WebLift Sales & Pricing Centre.
- The dashboard frame is on the **same browser origin**, preserving the original Firebase login, cookies, API endpoints, and role restrictions.
- On successful same-origin load, a Sales & Pricing button is inserted into the original dashboard's tab row.
- The shell also keeps visible module navigation and falls back if tab injection is blocked.

## Limitations
The existing Sales & Pricing page only stores browser-local drafts. Central quote sync, accepted invoices and bookkeeping are not enabled by this navigation release. Do not treat draft PDFs as issued invoices.

## Security
No passwords, API keys, bank account numbers or private customer records are stored in this public repository. Access checks remain controlled by the existing WebLift admin service.

## Deployment
Render static site. Build command: `echo WebLift administration is ready`
Publish directory: `.`

## WhatsApp / social media proposal previews

- **New private client links:** `https://weblift-sa.vercel.app/share?token=…`
- Vercel rewrites `/share` to the Render Sales API `GET /share`, which reads only the matching project's **public site name and URL** from the proposals database.
- The endpoint serves the **actual responsive client proposal HTML** with server-rendered `og:title`, `og:description`, `og:image`, `og:url` and Twitter card metadata. Social crawlers do not execute JavaScript, so do not move these tags into a browser script.
- `og:image` requests a 1200×630 preview of the **public project website** from Thum.io. It never includes the private proposal token or quote values. For unpublished/non-public URLs, a WebLift/Nexora branded image is used instead.
- Old `/proposal?token=…` links continue to open the proposal UI, but do not have project-specific social metadata.
- **Verification without customer data:** `https://weblift-sa.vercel.app/share-preview-demo` returns a public PRISCA social-preview test card. The demo is for metadata testing; it is not a valid quotation.
- WhatsApp caches link previews. Test a newly generated `/share` link and keep WhatsApp's link-preview option enabled. Screenshot service quotas/availability apply; do not promise instant captures for password-protected/unpublished websites.
