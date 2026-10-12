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

## WhatsApp / social media proposal previews (v5)

- **Private links:** `https://weblift-sa.vercel.app/share?token=…&pv=5`. The v5 query parameter avoids reuse of broken, cached WhatsApp previews. Legacy client links continue to open their quotations.
- The Sales API serves `/share` with project-specific server-rendered `og:title`, `og:description`, `og:url`, and `og:image`. Client prices and contact details are not in preview metadata.
- The OG image URL is on the **WebLift domain**, `/share-image/:token.jpg?pv=5`; Vercel rewrites to Render. It is a real static JPEG generated using Sharp, 1200×630, with a browser-style presentation, project imagery, and WebLift branding.
- Website screenshot streaming was removed. **Never use Thum.io's streamed animated loading GIF in Open Graph image metadata.** Preview art is taken from WebLift's **published portfolio images** (representative website imagery, not a literal screenshot). If an asset fails, the API uses its first-party Nexora brand hero and finally an inline neutral vector fallback.
- Demo: `https://weblift-sa.vercel.app/share-preview-demo?pv=5`. Its OG image `/share-image-demo.jpg?pv=5` was visually checked and showed NDO architecture imagery with neither loading spinner nor blank panel.
- **Clients see the actual interactive website in the presentation iframe** after opening the link; sites may block iframe embedding, so keep the Open full website action.
- WhatsApp caches URLs: share the **new** v5 link in a **new** message rather than expecting old chat cards to change.
