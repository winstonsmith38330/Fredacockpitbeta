# Freda Ops Cockpit - Beta 0.2.7

## Purpose
Beta 0.2.7 fixes the View Sync flow so browser/paste captures can actually replace the seed/sample values shown in Live Sales.

## Main fixes

- POS browser captures now update Live Sales correctly.
  - Root cause fixed: POS captures were being saved under a generic `capture` view, but the POS summariser only looked at named views such as `dashboard.php` and `eod_summary.php`.
  - The summariser now reads `capture`, `manual-paste`, and `browser-capture` metrics.

- View Sync is now local-first.
  - Successful captures are cached in browser localStorage.
  - If the server save fails, the browser still parses and updates the dashboard locally.
  - This avoids the app appearing frozen when Render restarts or cannot persist local files.

- Backend POS sync is now labelled as a diagnostic.
  - The old button is renamed from “Sync reporting.site POS” to “Backend POS diagnostic”.
  - View Sync is the recommended beta workflow.

- View Sync UI is clearer.
  - Paste capture is now shown before bookmarklet capture.
  - Capture history is visible in the browser.
  - A “Clear local captures” button is included for retesting.

- Parser improvements.
  - Added stronger patterns for reporting.site daily sales, Uber French/English KPI cards, and Square French cards.
  - Better fallback parsing when copied page text changes card order.

## Recommended test

1. Open reporting.site Penrith `daily_sales.php`.
2. Press Ctrl+A, then Ctrl+C.
3. Open Freda Ops Cockpit > View Sync.
4. Choose Reporting POS / Penrith / the current date.
5. Paste and save.
6. Go to Live Sales and check that Penrith POS Today changes from the seed value to the captured page value.

## Render settings

Root Directory:

```text
freda_ops_cockpit_beta_0_2_7_clean_repo/server
```

Build Command:

```text
npm install
```

Start Command:

```text
npm start
```
