# Freda Ops Cockpit - Beta 0.2.7 Changelog

## Purpose

Beta 0.2.7 responds to Freda's first positive beta feedback and makes the app a better operating-template test. It also improves reporting.site sync diagnostics so a sync that reaches pages but does not parse KPI data is no longer treated as fully successful.

## Key changes

### 1. Reporting.site POS sync remediation

- Added stricter KPI validation: sync is only treated as successful when a store returns usable numeric KPI metrics.
- Added per-store diagnostics for Beverly Hills, Penrith and Taren Point.
- Added more parser patterns for POS pages where amounts appear before labels, after labels, or inside JavaScript/chart payloads.
- Added support for `sold_out_date.php` and `category_sales.php` in the reporting.site view list.
- If pages are fetched but KPI data is still missing, the app now says this clearly and points to browser capture/manual snapshot until endpoint parsing is confirmed.

### 2. Uber / Square period clarity

- Uber remains labelled as WTD when the source page is `dateRange=this_week`.
- Daily Uber can be entered manually using a date period such as `2026-06-14`.
- Frieda's Pies is labelled as Square MTD / captured period, not Uber.

### 3. Freda feedback incorporated

New **Freda Priorities** tab added with:

- Hour-by-hour comparison vs the same day last week and the last 4 weeks.
- Sell-out timing tracker concept.
- Planned FOMO vs early operational sell-out distinction.
- Leftover and first-sold-out tracker.
- Balls vs rings production mix monitor, with seed assumption that specials may need around 65% balls.
- WhatsApp stock-order photo to weekly usage / two-trip stock planner.
- Pie/social momentum note after the NZ pie video lift.
- Hiring and training as the top management priorities.

### 4. Today and production changes

- Today priorities now mention hour-by-hour variance, sell-out timing and balls/rings mix.
- Production tab now has Freda production controls for balls/rings and sell-out/leftover monitoring.

## What is still not solved automatically

- True Uber daily API sync is not implemented because Uber Manager is behind Google/login protections.
- True Square API sync is not implemented yet; Square remains manual/export/captured-period for the beta.
- WhatsApp direct posting is not implemented yet; the app currently supports export parsing and copy-ready manager messages.
- Reporting.site may require endpoint-specific parsing if server-fetched pages contain shell HTML but KPI data is injected client-side.

