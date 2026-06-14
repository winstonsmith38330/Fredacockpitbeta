# Freda Ops Cockpit - Beta 0.2.2 Changelog

## Purpose

This patch makes the sales labels safer before Freda tests the beta. It is still a beta interface / workflow validation build, not the final live-data system.

## Changes

- Updated app version to Beta 0.2.2.
- Reporting.site POS is labelled as POS Today when live sync is successful.
- Seeded Penrith POS is labelled as sample/offline if live sync has not confirmed it.
- Uber values are labelled Uber WTD when they come from the Uber Eats Manager `dateRange=this_week` page.
- Daily Uber can be entered manually using the Manual Snapshot form with a date period such as `2026-06-14`.
- Frieda's Pies is labelled Square MTD / captured period, not Uber.
- Square screenshot data for Frieda's Pies is labelled MTD Jun 2026.
- The assistant copy warns that captured totals may mix periods.
- Reporting connector is more tolerant if `REPORTING_PHPSESSID` is pasted with or without `PHPSESSID=`.
- Browser text capture now has basic French KPI parsing for Uber/Square dashboard text.

## Important notes

- The server cannot reliably fetch Uber or Square directly from Render while those services are behind logged-in Google/Square sessions.
- Uber current-day values should be entered manually from the chart hover or future export/API.
- Square MTD values should be entered manually from the Square dashboard or future Square API.
- WhatsApp integration is still based on ZIP/TXT export. Direct WhatsApp sending/posting is a later iteration.
