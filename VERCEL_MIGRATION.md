# WebLift sales — safe Vercel migration (staging branch)
This branch is **not** a production cutover. The official `weblift-sa.vercel.app` routes still use Render until a completed record migration and acceptance test.

## Staged architecture
- `api/index.js` exports the existing Express app as a Vercel Function, rather than opening a TCP port.
- `vercel.json` routes the historical invitation, quotation, image, health and `/api/sales/*` paths to that function.
- The existing Render listener stays unchanged when the code runs on Render.
- Static HTML, JS and CSS files in the repository are served from Vercel; no changes to client token URLs are necessary after controlled cutover.
- Both apps use the **same exact** Postgres schema. The database is the source of truth for tokens, proposals, invitations, statuses, payments and ledger entries.
- Do not deploy this branch as production until `DATABASE_URL` is configured on the new project and end-to-end tests pass.

## Privacy and database continuity
Render's free PostgreSQL database is scheduled to expire **2026-11-11**. It has an empty external IP allowlist, so external database readers, including the Render connector, are blocked. Do not weaken that network policy simply to force a backup.

1. Merge the audited `mountMigrationExport` endpoint to the running Render API (requires a production code review). With authenticated OWNER/ADMIN credentials, request `GET /api/sales/admin/migration-snapshot`; it exports a transactionally consistent JSON snapshot over HTTPS. Keep the file **private** and offline. Never upload it to GitHub, a public file host or an AI chat.
2. Provision a dedicated no-cost database for WebLift only after verifying the actual plan/capacity and project organization. Never reuse Quantifier Pro production data storage without authorization.
3. Restore into a new empty Postgres database from a trusted machine with `TARGET_DATABASE_URL` set in that machine's environment and `node scripts/restore-sales.mjs <local_snapshot.json>`. The script creates the schema, refuses a nonempty target, imports all six tables and restores invoice, payment and event sequences in a single transaction.
4. Compare counts per table, last modification dates, invoice sequence, token-specific read endpoints and financial totals. Freeze edits briefly for a final export and restore, or otherwise reconcile source changes since the first snapshot. Do not delete or disable the original backend or database until final verification.
5. Add `DATABASE_URL` as a **secret**, production-only Vercel environment variable. No credentials in code, chat, URL query strings or the public frontend.
6. Test via the new staging URL: `/api/sales/status`, `/health`, `/your-invitation?token=...`, `/share?token=...`, private `/proposal?token=...`, `/api/sales/proposal/:token`, `/api/sales/invitation/:token`, PDF invoice restrictions, WhatsApp Open Graph JPEGs, and authenticated admin actions. Include 403 and 404 negative tests, and a small mobile device test.
7. Only after a verified migration update the existing WebLift project-level rewrite rules for the matching URLs to the Vercel backend, **preserving URL paths, query parameters and tokens**. Keep the previous route version ID for immediate rollback.

## Preconditions and warnings
- Existing `proposal.js` and `invitation.js` presently fetch the `weblift-sales-api.onrender.com` address directly. Update these to first-party relative `/api/sales/` calls before production cutover (with matching proxy routes); verify admin authentication and CORS.
- The new Vercel app returns `DATABASE_URL_NOT_SET` until its DB is configured. A READY deployment does not prove migrated client records.
- Render Free cold starts will persist until the last customer-facing dependency is removed.
- Project cost must be checked explicitly. Free-tier limits, pausing behaviour and database availability can change; zero-cost is a target, not an uptime guarantee.
- Some Supabase free projects may pause after inactivity. Choose a sufficiently active plan if continuous availability is contractual.
- This route change does **not** automatically change existing direct Render API links, which must be audited and redirected separately.
