# IRDAI Cloudflare beta 0.6

Independent development beta, not the official IRDAI website.

Platform: Cloudflare Workers + D1. No Supabase, R2 or paid dependency. Existing external applications are not modified.

## Implemented

- Public navigation with 58 destinations similar to IRDAI. Missing imported pages explicitly say so.
- D1 full-text search over title, reference and imported body, with filters and pagination.
- Shared persistent ivory and midnight themes on public pages and staff workspace. Administrators edit colours, font, rounding and spacing through form controls.
- User-controlled carousel and collection-count graphics.
- One official 69-page PDF archived and indexed; four supersession links verified against page 69. A second grievance form PDF is archived.
- Staff drafts, revision history/restore, independent approval, publication, role checks, conflicting-edit protection and append-only application audit.
- Cloudflare Access token signature, issuer, audience and expiry verification. Unconfigured staff access stays locked.

## Verification

11 Node integration/security tests pass, covering real SQLite search, publication workflow and cryptographic token checks. All three SQL migrations applied to Cloudflare's local D1 engine. Wrangler deployment dry-run passes.

Browser verification was blocked by localhost connection timeouts. An additional Miniflare runtime smoke test returned an internal runtime error. Live login/MFA, cloud deployment, visual/accessibility checks and load testing remain unverified. Use private staging before public use.

## Limits

Initial collection: 11 public records, one full-text PDF, four reviewed historical relationships. This is not a complete website mirror. Original texts of the older circulars remain unimported. Relationships do not certify current legal applicability. PDF extraction has not been reviewed page by page.

Document upload/OCR, multilingual migration, advanced graph exploration, market statistics and a visual page builder remain incomplete. Menu structure and carousel selection still live in source. Staff manage text and evidence through the editor; Cloudflare Access manages identities, and D1 stores publishing roles.

## Local use

Node.js 22.13+ required. Run npm ci, npm test, then node dev-server.mjs. Open the printed localhost address and keep the window open. START-LOCAL.cmd runs the same server after dependency installation. Local staff access has no authentication bypass.

## Cloud deployment

Read START-HERE.md. wrangler.jsonc contains a placeholder database ID. Replace it with a NEW beta D1 database ID and apply migrations before deployment. Do not target an existing application's database.

Cloud commands after configuration:

    npm ci
    npm test
    npm run check
    npx wrangler d1 migrations apply DB --remote
    npm run deploy

Set ACCESS_TEAM_DOMAIN and ACCESS_AUD for a dedicated Cloudflare Access application covering /admin.html and /api/staff/*. Require MFA and explicitly allowed staff emails. No bypass policies or service-token-only access. Live policy and plan availability need verification in your account. No staff accounts are seeded; use different identities for authoring and independent approval/publication.

Keep .env, .dev.vars, .local, .wrangler, node_modules and account data out of GitHub. package-lock.json pins dependencies. CI checks source; it does not deploy. Free usage limits apply. Capacity and reliability have not been established by load testing.
