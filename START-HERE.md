# Start here: private staging setup

This package is ready for source upload and private staging configuration. It has not been deployed or verified in a browser. No paid subscription or official domain is required.

## 1. Upload source

1. Extract this ZIP on your computer.
2. Open https://github.com/venkateshronanki-prog/irdai-beta.
3. In an empty repository click 'uploading an existing file'; otherwise choose Add file > Upload files.
4. Upload the CONTENTS of the extracted folder, including the public, worker, migrations and tests folders and package.json, package-lock.json and wrangler.jsonc. Do not upload the ZIP or the containing folder.
5. Commit to main. Confirm package.json, wrangler.jsonc and public/index.html are present at the expected paths.

## 2. Create the separate database

1. Open your existing Cloudflare account dashboard.
2. Choose Storage & databases > D1 SQL Database.
3. Choose Create database.
4. Name it irdai-beta-content. Stop if a paid upgrade is requested.
5. Copy its database ID. This identifier is not a password.
6. Provide the ID in this chat so I can guide configuration and import using your actual screen.

Do not click website Deploy yet. The database placeholder must be replaced and the three migration files imported first. Existing applications need no changes.

## Later

Cloudflare Workers Git setup: project irdai-beta, build command npm ci, deployment command npx wrangler deploy. Staff access requires a dedicated Access application, explicit staff emails, MFA enforcement and role provisioning. We will verify the exact options and free-plan availability on your account before configuration. The staff API stays locked until configured.

See README.md for implemented features and unfinished work.
