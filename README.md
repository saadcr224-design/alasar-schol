# Alasar School Accounts

A private school accounts application built with React, Vinext and Cloudflare Workers.

For Vercel deployment, use the standard Next.js build in [DEPLOYMENT.md](./DEPLOYMENT.md).
It creates the required `.next/routes-manifest.json` and connects to D1 and R2
through server-side APIs. Worker deployments continue to use the original build.

## Features

- Administrator username/password login with server-side sessions
- Student accounts, guardians, sibling family IDs and full fee/payment history
- Tuition schedules with effective months and controlled invoice adjustments
- Individual, class and combined sibling fee challans, including previous unpaid arrears
- Month-range fee generation with duplicate invoice protection
- Full and partial payments, numbered receipts, payment reversals and audit history
- Printer/PDF output, expenses, cash-book reports and CSV exports
- School name, phone, address and logo on challans and receipts
- Durable D1 records and private R2 school logo uploads

## Development

Install dependencies using the existing pnpm lockfile. Use `pnpm dev` for development, `pnpm build` for the production Worker and `pnpm db:generate` after schema changes. Apply the versioned SQL migrations in `drizzle/` to the D1 database before running the app.

The Worker runtime requires D1 binding `DB` and R2 binding `BUCKET`. The Vercel runtime uses the server environment variables listed in [DEPLOYMENT.md](./DEPLOYMENT.md). Both use administrator password authentication; sign-in does not trust client-provided identity headers. This is a server application and cannot run on GitHub Pages.

Admin configuration uses `ADMIN_USERNAME`, `ADMIN_PASS_SALT`, and `ADMIN_PASS_HASH` runtime variables. Passwords are salted PBKDF2-SHA256 hashes with 100,000 iterations and 32 output bytes. Never commit the password, credentials, runtime secrets, real student records, or local database files.

## Workflow

1. Sign in and set school details in Settings.
2. Add students; use the same explicit family ID for siblings.
3. Open a student to set tuition from a chosen month or add fee months.
4. Use Fee challans to select student, class or family, generate missing fees and print.
5. Record received payments and print the payment receipt.

Tuition changes apply to future generated invoices unless explicitly applied to the selected existing month's bill. Invoice amounts cannot be reduced below payments already received. Challans are payment requests, not receipts. Reminder messages are prepared manually; the app does not send SMS or WhatsApp messages automatically.

Sites publication is managed separately. A Vercel project linked to GitHub can deploy pushes automatically; the server storage configuration must still point to the intended school database and bucket.

## Shared access and installation

Authenticated administrators use a single school workspace. The existing workspace pointer, records, and logo paths are preserved. Administrator sessions protect the data routes; Sites deployments can additionally restrict visitors through their platform allowlist.

The app checks for record updates every five seconds while visible and online. Open edit forms pause refresh and stale saves are rejected by the server's revision check. An activity entry identifies who saved each change. No offline writes are queued.

The manifest and Install on PC control support installation in compatible browsers. The service worker never caches school records, passwords, API responses or authenticated pages. Internet is required. Published code updates are detected every minute and users can reload after finishing open forms.

This GitHub repository contains source code only. Database records and secrets remain in the hosted storage. Build and publish through Sites for a Worker deployment, or follow [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel.
