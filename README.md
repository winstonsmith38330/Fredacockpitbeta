# Freda Ops Cockpit — Beta 0.2

Mobile-first PWA prototype for the L.A. Donuts AI Operations Assistant.

Beta 0.2 upgrades Beta 0.1 from a file-driven mock prototype to a **live-sales capable operating cockpit**:

- Reporting.site POS connector scaffold for Beverly Hills, Penrith and Taren Point.
- Secure environment-variable configuration for POS session/cookie.
- Live Sales screen that separates POS, Uber and Square so Freda does not understate revenue.
- Manual Uber/Square/POS snapshot form.
- WhatsApp ZIP/TXT export ingestion into action items.
- Browser capture endpoint/bookmarklet for difficult authenticated pages.
- Existing Phase 1 modules remain: Today briefing, Stores, Production, WhatsApp Actions, Ask AI, Training/SOP, Hiring, Audits and Market.

## Important security note

No real credentials are stored in this package. Any passwords or cookies must be placed in `server/.env` locally or in the deployment secrets panel.

Because credentials were shared during planning, rotate the relevant passwords/session cookies before using this beyond a controlled beta.

## Quick local run

```bash
cd server
cp .env.example .env
npm install
npm start
```

Open:

```text
http://localhost:8787
```

## Enable reporting.site live POS sync

Add one of these to `server/.env`:

```bash
REPORTING_PHPSESSID=your_session_value_here
```

or:

```bash
REPORTING_COOKIE=PHPSESSID=your_session_value_here
```

Then restart the server and tap **Sync reporting.site POS** in the app.

## Mobile install

Deploy the server/app to an HTTPS host such as Railway, Render, Fly.io, a VPS, or another Node-capable host. Then Freda opens the URL on her phone:

- iPhone: Safari → Share → Add to Home Screen.
- Android: Chrome → Install app / Add to Home screen.

A static-only deployment still works in sample/offline mode, but live POS sync requires the Node server.

## What is live vs mocked

Live-capable now:

- Reporting.site POS pages: `dashboard.php`, `eod_summary.php`, `product_sales_summary.php`, `product_sales.php`, `ticket_sales.php`, `busy_hours.php`.
- Manual / browser-captured Uber snapshot.
- Manual / browser-captured Square snapshot.
- WhatsApp ZIP/TXT import.

Still mocked/demo:

- Odoo HR/finance connector.
- Deputy roster and labour insights.
- Uber Google OAuth/live API.
- Square API until `SQUARE_ACCESS_TOKEN` and location ID are provided.
- Real OpenAI natural-language/vision scoring.
- Hiring scoring with real job roles and questions.
- SOPs pending Freda-approved documents.
- Photo audit scoring pending reference photos.

## Folder structure

```text
web/                Mobile-first PWA
server/             Express API + live connector layer
server/src/         Reporting and WhatsApp parsers
server/scripts/     CLI sync tools
db/                 Target PostgreSQL schema
scripts/            Legacy/local ingestion helpers
docs/               Setup and handover notes
seed-data.json      Seed analysis + sample live snapshots
```

## Main user flow

1. Freda opens the PWA.
2. Nicolas or the server refreshes reporting.site POS.
3. Uber/Square snapshots are added manually, by export, or browser capture.
4. WhatsApp exports are uploaded when needed.
5. Freda asks “What needs my attention today?” and receives one-screen actions.

## Beta 0.2.1 Render fix
This package includes `web/assets/seed-data.js`, required by `web/index.html` before `web/app.js` starts. If the live Render page stays on "Loading Freda Ops Cockpit...", confirm this file exists in GitHub under `web/assets/seed-data.js`.

## Beta 0.2.2 note

This patched build separates sales periods more clearly:

- reporting.site POS = POS Today when live sync succeeds.
- Uber = WTD unless a daily value is manually captured.
- Square / Frieda's Pies = MTD or captured period, not Uber.

For Freda's first test, the goal is to validate interface, workflow and decision format. POS, Uber, Square and WhatsApp live automation remain next-week hardening items.
