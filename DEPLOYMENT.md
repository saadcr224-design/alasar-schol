# Deploy School Ledger to Vercel

This application supports two builds. Sites/Cloudflare uses the existing Vinext
Worker build. Vercel uses standard Next.js and accesses the same Cloudflare D1
database and private R2 bucket through server-side HTTPS APIs. No student data
is stored in a Vercel function's temporary filesystem.

## Vercel project settings

Import `saadcr224-design/alasar-schol` and select the branch containing this fix
(or merge the fix into `main` before deploying).

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | Repository root (leave empty) |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm run build:vercel` |
| Output directory | `.next` |
| Node.js | 22.x or 24.x |

`vercel.json` commits the build settings. Clear any conflicting dashboard
overrides and redeploy without the old build cache after switching frameworks.
The Next.js build creates `.next/routes-manifest.json`; do not create an empty
manifest manually or point Vercel at the Worker `dist` directory.

## Required environment variables

Add these under Vercel → Project → Settings → Environment Variables. Credentials
belong in server-side variables; never commit them or prefix them with
`NEXT_PUBLIC_`.

| Name | Where the value comes from |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account containing the database |
| `CLOUDFLARE_D1_DATABASE_ID` | UUID of the existing school D1 database |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with D1 read/write access to the intended account |
| `ADMIN_USERNAME` | Your administrator username |
| `ADMIN_PASS_SALT` | Existing administrator password salt |
| `ADMIN_PASS_HASH` | Existing administrator PBKDF2-SHA256 password hash |

Use the same database ID to preserve student records, receipts, sessions, and
balances. The app preserves its existing school-workspace mapping. Connecting a
new empty database does not migrate records from the hosted school app.

For a fresh database, apply the SQL migrations in `drizzle/` in filename order
using the Cloudflare D1 dashboard or Wrangler before signing in. Existing
databases with these migrations already applied need no schema changes.

If you do not already have an administrator salt and hash, run
`node scripts/create-admin-config.mjs` locally. It prompts for a password without
displaying it and writes `.env.admin.local` (ignored by Git). Copy the three
administrator values from that local file into Vercel's environment settings.
The script does not change any database records.

Use separate database, storage, and administrator credentials for Preview and
Production. Redeploy after saving environment variables. The source can build
without credentials, but authenticated database operations require them.

## School logos

To preserve and upload logos, also set:

- `CLOUDFLARE_R2_BUCKET_NAME`: the existing private bucket name.
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: R2 S3 API access key ID.
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: matching R2 S3 API secret, with object
  read/write permission scoped to that bucket.

The R2 bucket stays private; authenticated server routes stream the images.
These are S3 API credentials, separate from the D1 API token. Without these
optional variables, the accounts application works but logo operations return
an unavailable error.

## Verify before using real records

Run `pnpm test`, `pnpm run build:vercel`, and `pnpm run test:production`.
The production test starts the built Next.js server with isolated, in-memory
SQLite and R2 fixtures; it never contacts real Cloudflare storage. It checks
login, authentication, admission fees, generated bills, reload persistence,
revision conflicts, private logo uploads, and logout. A successful build must contain
`.next/routes-manifest.json` and the `/`, `/portal`, `/api/admin-auth`,
`/api/ledger`, and `/api/school-logo` routes.

On a configured preview, sign in, add a sample admission, generate a fee, record
a payment, reload, and confirm the saved balance. Upload and reload a sample
logo. Remove the sample records when finished. Open the ready deployment URL
in Chrome or another browser; Google search indexing is a separate matter.

For local production testing, create a `.env.local` from `.env.example`, fill
the development-only credentials, build, then run `pnpm run start:vercel`.
Missing configuration, an inaccessible database, or unapplied migrations cause
sign-in/storage requests to fail rather than silently saving temporary data.

## Continue using Sites / Cloudflare

The existing `pnpm dev`, `pnpm build`, and `pnpm start` Worker workflows are
preserved outside Vercel. Native Worker bindings still provide `DB` and `BUCKET`;
the REST credentials above are only needed by the Next.js/Vercel build.
