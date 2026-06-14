# Beta 0.2 Live Sales Setup

## 1. What changed from Beta 0.1

Beta 0.1 was file-driven and safe for demonstration. Beta 0.2 adds a live connector layer so the assistant can use current sales where available.

The app now has:

- A **Live Sales** tab.
- Reporting.site POS sync button.
- Manual Uber/Square snapshot form.
- WhatsApp ZIP/TXT ingestion.
- Browser capture endpoint/bookmarklet.
- Connector status and last-sync messages.

## 2. Security setup

Do not put real credentials in code.

Use either:

- `server/.env` for local testing, or
- deployment secrets/environment variables on the host.

Recommended minimum local `.env`:

```bash
PORT=8787
REPORTING_BASE_URL=https://reporting.site
REPORTING_PHPSESSID=replace_with_current_session_cookie_value
```

If a full cookie header is needed, use:

```bash
REPORTING_COOKIE=PHPSESSID=replace_with_current_session_cookie_value
```

After editing `.env`, restart the server.

## 3. Reporting.site POS live sync

The connector is configured for:

| Store | Slug |
|---|---|
| Beverly Hills | `ladonuts_beverlyhills` |
| Penrith | `ladonuts_penrith` |
| Taren Point | `ladonuts_tarenpoint` |

Views fetched:

- `dashboard.php`
- `eod_summary.php`
- `product_sales_summary.php`
- `product_sales.php`
- `ticket_sales.php`
- `busy_hours.php`

Run from the app by tapping **Sync reporting.site POS**, or from command line:

```bash
cd server
npm run sync:reporting
```

The parser extracts the KPI cards it can read and stores the raw preview text for debugging.

## 4. Uber Eats

Uber is separate from POS and must be added on top of reporting.site sales.

Because the Uber account uses Google login, Beta 0.2 does not store or automate that password. Use one of these paths:

1. Enter the weekly Uber KPIs in **Live Sales → Manual live snapshot**.
2. Use Uber export if available and upload it in a future parser.
3. Use the browser capture bookmarklet on the Uber sales screen.
4. Upgrade later to an approved OAuth/API/export route.

## 5. Square / Frieda's Pies

Square dashboard password scraping is not used. For Beta 0.2 use:

1. Manual snapshot entry for total sales/transactions.
2. Square transaction export upload in a future parser.
3. Square API token using `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID` in a later connector pass.

## 6. WhatsApp groups

The app does not scrape WhatsApp Web. It parses exported ZIP/TXT chats.

Supported groups:

- LA DONUTS PN (reporting)
- LA Donuts BH (reporting)
- LA DONUT TP (reporting)
- Pie Shop Sales

In the app, open **WhatsApp** or **Data & Connectors**, then upload the ZIP/TXT export. The parser creates action candidates such as stock issues, display/photo follow-ups, staff issues, cleaning, closing/leftover, equipment and manager-action items.

## 7. Production deployment

Use a Node-capable HTTPS host, not a static-only host, if live sync is required.

Recommended low-friction options:

- Railway
- Render
- Fly.io
- VPS with Node + PM2
- Vercel with serverless adjustments later

The PWA install will work once the URL is HTTPS.

## 8. Known limitations

- Reporting.site session cookie can expire; refresh the env value when it does.
- Uber/Square live auth requires a safer long-term integration path.
- WhatsApp live scraping is intentionally avoided.
- KPI parsing depends on page labels; if the reporting.site HTML changes, update `server/src/reportingConnector.js`.
