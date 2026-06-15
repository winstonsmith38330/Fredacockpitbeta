# Freda Ops Cockpit - Beta 0.2.7 changelog

## Main change
Beta 0.2.7 adds **View Sync**, a browser-capture workflow for the dashboards Nicolas already opens manually.

This is the recommended beta workaround for POS / Uber / Square pages that are difficult to scrape from Render because the final KPI cards are rendered inside a logged-in browser session.

## New capabilities

- New **View Sync** tab.
- Bookmarklet generator for:
  - Reporting POS pages,
  - Uber Eats pages,
  - Square pages.
- Paste-page-text fallback for users who cannot use bookmarklets.
- Better parsing for:
  - Reporting daily-sales KPI cards,
  - Uber French KPI cards: sales, orders, AOV,
  - Square French KPI cards: collected/sales/transactions.
- Captures script text as well as visible text where available, to improve chances of retrieving chart data.
- Daily Uber support: open Uber on current day, then capture with period `YYYY-MM-DD`.
- WTD Uber support: open Uber with `this_week`, then capture with period `this_week`.
- Square support: label as daily if period is `YYYY-MM-DD`, otherwise MTD/captured period.

## Important limitation
The browser view capture can read visible KPI cards and some embedded chart data. It may not recover all hourly chart points if the chart is rendered as canvas or if values only appear on hover. For the hourly comparison engine, the next stronger step is either:

1. exports/API access,
2. the exact internal network endpoint from DevTools > Network,
3. regular manual hourly checkpoints during beta.

## Freda feedback covered

- Hour-by-hour view exists.
- Same-day last week / last 4 weeks comparison structure exists.
- Sell-out timing / planned FOMO vs early sell-out logic exists.
- POS, Uber and Square periods are separated.
- Daily Uber can now be captured from the current-day Uber dashboard.
