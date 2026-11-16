# IRDAI static beta 0.7

Database-free replacement for the earlier D1 beta. The deployable website contains a compact public catalogue and interface files only. Official documents open directly from IRDAI; no original PDF, full document text, database, Worker API or object storage is deployed.

## Current scope

The 11.4 KB catalogue contains 11 public records, four evidenced historical relationships, and two changeable skins. Search covers titles, references, summaries and short page text. It does not search the original PDF contents. Navigation, carousel, relationship views and collection count graphics are retained.

Content Studio edits a copy in the browser tab and exports catalogue.json. It does not change the live site or provide a staff login. Staff publish through GitHub accounts and reviewed pull requests. GitHub MFA, collaborator access, branch protection and Cloudflare Git deployment must be configured before treating that process as enforced approval. Until then, review is procedural. No staff passwords or sessions are stored on this website.

Changing a skin does not change document data. Theme changes can be prepared in the studio and reviewed with the catalogue. A visitor's selected skin persists in browser storage.

The downloaded PDF archive stays outside this deployment. Earlier Workers/D1 source and PDF archive files may remain in repository history, but Cloudflare must deploy only this static-beta folder.

## Cloudflare settings

No database needs to be created. Do not use the old repository-root Cloudflare configuration.

- Repository: venkateshronanki-prog/irdai-beta
- Root directory: static-beta
- Build command: npm ci
- Deploy command: npx wrangler deploy
- Database and storage bindings: none

Source is being submitted in a pull request. Use its branch for staging or merge it before selecting main. No site is deployed by this package.

The website still uses some Cloudflare storage and transfer for its small interface and catalogue. It is not zero usage. Original document download traffic goes to the official source. The actual asset sizes are recorded in SIZE-REPORT.json.

## Checks

Run npm ci, npm test, then npm run check. The source tests verify catalogue search, links, theme input, and that no database or PDF assets are included. Cloudflare dry-run reports no bindings. Browser testing, live deployment and performance verification remain pending.

## Limitations

This is not a full migration of IRDAI. Many menu pages still await imported content. It does not provide full-text document search, a server-side CMS, staff MFA on this website, file uploads or a clause-level regulatory graph. The editor exports proposals; it does not claim to enforce identity or independent approval.
