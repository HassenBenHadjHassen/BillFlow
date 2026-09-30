# Billflow - Private Business & Invoice Management

A custom, private, single-user business management web application built for freelance and company operations. Built with Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM, and Better Auth.

**Strict Privacy & Self-Contained Architecture:**
- **Zero External Services**: Absolutely no cloud databases, no Supabase, no external headless browsers, and no third-party APIs.
- **In-Project Database**: Protected local SQLite database (`prisma/billflow.db`).
- **In-Project Authentication**: `better-auth` backed by the local database with bcrypt password hashing and persistent signed HTTP-only cookies.
- **In-Project Document Vault**: Local protected file storage (`storage/`) with MIME type whitelist, file size restrictions, and session authentication for streaming.
- **In-Project PDF Engine**: Native vector PDF generation using `pdf-lib` running directly in Node.js.
- **Financial Precision**: Floating-point drift eliminated using authoritative banker's rounding algorithms and integer-safe transactional operations.

---

## Features

1. **Dashboard**: High-level financial KPIs (Lifetime Invoiced, Collected, Outstanding, Overdue, Active Clients, MRR), 12-month revenue trend chart, invoice status distribution donut, top clients ranking, and upcoming renewal/due alerts.
2. **Clients**: Client directory, contact details, payment terms, currency preferences, notes, and individual 360° profile with full contract, invoice, payment, and document histories.
3. **Contracts**: Fixed-price and monthly recurring contract management, start/end dates, automatic expiration calculation, renewal lineage tracking, and seamless 1-click renewal.
4. **Recurring Billing**: Automated monthly recurring invoice generator with guaranteed idempotency and period locking (`billingPeriodStart` and `billingPeriodEnd`) to eliminate duplicate billing.
5. **Invoices**: Sequential transactional numbering (`INV-YYYY-XXX`), live client selection, dynamic line items with tax/discount calculation, status lifecycle (`Draft` → `Sent` → `PartiallyPaid` → `Paid` / `Overdue`), and vector PDF generation.
6. **Payments**: Multi-payment tracking against invoices, automatic remaining balance calculation, and real-time status transitions.
7. **Document Vault**: Encrypted/protected in-project storage for contracts, invoices, identity documents, and receipts with categorized filtering.
8. **Financial Reports & CSV Export**: MRR/ARR breakdown, monthly income statements, collection rates, and 1-click streaming CSV exports.
9. **Settings & Admin**: Company invoicing profile (name, tax ID, address, IBAN/SWIFT, footer notes) and owner account credentials management.

---

## Getting Started

### 1. Environment Setup

Create or verify `.env` in the root directory:
```bash
PORT=2027

# In-Project Database (SQLite / Local Protected Database)
DATABASE_URL="file:./billflow.db"

# Better Auth Configuration (100% In-Project, Zero External Services)
BETTER_AUTH_SECRET="bf_sec_8f912a7d4300a4023c914b1820b41058ad9124be3f2a58"
BETTER_AUTH_URL="http://localhost:2027"
AUTH_SECRET="bf_sec_8f912a7d4300a4023c914b1820b41058ad9124be3f2a58"

# In-Project Secure File Storage Vault
STORAGE_DIR="./storage"
```

### 2. Database Sync & Seed

Initialize the SQLite database schema and generate Prisma client:
```bash
# Push Prisma schema to local SQLite database
npm run db:push

# (Optional) Seed realistic demo business data (Clients, Contracts, Invoices, Recurring Schedules)
npm run db:seed
```

### 3. Create Owner Admin Account

Run the interactive CLI setup script to securely create or reset the single owner credentials:
```bash
npm run create-admin
```
*(Default seed credentials if using `npm run db:seed`: `alexandre@billflow.io` / `password123`)*

### 4. Run Development Server

```bash
npm run dev
```
Open [http://localhost:2027](http://localhost:2027) in your browser.

---

## PM2 Production Deployment

The project includes an optimized PM2 production configuration in [`ecosystem.config.js`](file:///c:/Programming/billFlow/ecosystem.config.js) configured specifically for SQLite:
- Single instance (`instances: 1`) and `fork` mode to prevent multi-worker database lock contention.
- Dynamic port loading directly from `.env` (`PORT=2027`).
- Auto-restart on failure with 1GB memory limit.
- Structured daily rotating log files in `./logs/`.

### One-Click Production Launch (Recommended for VPS)

```bash
npm run prod
```
*This single command automatically creates `.env` (if missing), generates Prisma client, pushes database schema to SQLite, builds the Next.js bundle, starts/reloads PM2, and saves process persistence.*

### Granular PM2 Commands

```bash
# Build the production application bundle
npm run build

# Start production server with PM2
npm run prod:start

# View live status of the PM2 process
npm run prod:status

# View production output and error logs
npm run prod:logs

# Restart or reload after code changes
npm run prod:restart
npm run prod:reload

# Stop production server
npm run prod:stop
```

---

## Running Automated Tests

Run the full Vitest test suite covering financial precision, contract renewals, PDF rendering, auth hashing, and multi-step end-to-end business workflows:

```bash
npm test
```
