# Alasar School Accounts

A private school accounts application built with React, Vinext and Cloudflare Workers.

## Features

- Administrator username/password login behind private platform authentication
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

The runtime requires D1 binding `DB` and R2 binding `BUCKET`. Authentication requires trusted platform-provided identity headers. Do not expose a deployment that accepts identity headers directly from untrusted clients. This is a server application and cannot run on GitHub Pages.

Admin configuration uses `ADMIN_USERNAME`, `ADMIN_PASS_SALT`, and `ADMIN_PASS_HASH` runtime variables. Passwords are salted PBKDF2-SHA256 hashes with 100,000 iterations and 32 output bytes. Never commit the password, credentials, runtime secrets, real student records, or local database files.

## Workflow

1. Sign in and set school details in Settings.
2. Add students; use the same explicit family ID for siblings.
3. Open a student to set tuition from a chosen month or add fee months.
4. Use Fee challans to select student, class or family, generate missing fees and print.
5. Record received payments and print the payment receipt.

Tuition changes apply to future generated invoices unless explicitly applied to the selected existing month's bill. Invoice amounts cannot be reduced below payments already received. Challans are payment requests, not receipts. Reminder messages are prepared manually; the app does not send SMS or WhatsApp messages automatically.

GitHub source storage does not automatically deploy changes or synchronize runtime student records. Publication is managed separately through Sites.

## Shared access and installation

Approved visitors use a single school workspace. The owner must open the portal once to initialize the shared workspace pointer; existing records and logo paths are preserved. Set `SCHOOL_OWNER_EMAIL` to the school owner's platform account email in the hosted environment. Do not grant public access: the platform's visitor allowlist is the authorization boundary.

The app checks for record updates every five seconds while visible and online. Open edit forms pause refresh and stale saves are rejected by the server's revision check. An activity entry identifies who saved each change. No offline writes are queued.

The manifest and Install on PC control support installation in compatible browsers. The service worker never caches school records, passwords, API responses or authenticated pages. Internet is required. Published code updates are detected every minute and users can reload after finishing open forms.

This GitHub repository contains source code only. Database records and secrets remain in the hosted application. GitHub pushes are not automatically published; build and publish through Sites to update the live site.
