# Beta 0.2.7 changelog

## Added
- Dedicated Hourly Analysis tab.
- Same-day last week and last 4-week comparison template.
- Sell-out timing rules, including 3+ hour early sell-out alert.
- Manual hourly checkpoint form for sales/orders/sold-out/cabinet notes.
- Reporting.site endpoint probing for `get_data.php`, `get_data_period.php`, `fetch_data.php`, `busy_hours.php`, `daily_sales.php`, and related pages.

## Fixed / clarified
- POS sync no longer silently implies success when pages are reachable but KPIs are not parsed.
- Uber remains labelled WTD unless a daily manual snapshot is entered.
- Square remains labelled MTD/captured period for Frieda's Pies unless a daily export/snapshot is entered.

## Known limitation
If reporting.site injects sales into the browser after page load and does not expose data in the attempted endpoints, Render cannot parse it server-side yet. Use the Data tab browser-capture/manual snapshot while endpoint mapping is completed.
