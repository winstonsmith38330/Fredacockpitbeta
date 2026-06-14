# Nicolas Handover Notes — Beta 0.2

## Purpose

Beta 0.2 is the first live-sales capable version of Freda Ops Cockpit. It is still a beta, but it is no longer only a mock structure.

The goal for next week is to let Freda install the PWA and use it as a practical daily operating assistant.

## What to configure first

1. Deploy the Node server + web app to HTTPS.
2. Add reporting.site session secret in the host settings:
   - `REPORTING_PHPSESSID`, or
   - `REPORTING_COOKIE`.
3. Start the app and test `/health`.
4. Open the PWA and tap **Sync reporting.site POS**.
5. Confirm Penrith, Beverly Hills and Taren Point values appear in **Live Sales**.
6. Add Uber and Square manually until a safer export/API path is set.
7. Upload one WhatsApp export to validate action extraction.

## Do not do this

- Do not paste or commit real passwords into code.
- Do not build browser password scraping for Square/Uber.
- Do not treat WhatsApp actions as closed without manager confirmation.
- Do not treat photo audits as AI-scored until reference photos are configured.

## Current live-data behaviour

| Source | Beta 0.2 behaviour |
|---|---|
| reporting.site POS | Server fetches KPI pages using env cookie/session. |
| Uber Eats | Manual snapshot / browser capture / future export. |
| Square | Manual snapshot / future Square token or export. |
| WhatsApp | ZIP/TXT export parser. |
| Production | Seeded from uploaded plans. |
| Hiring/training/audit | Working demo modules, not final content. |

## First acceptance test

Freda should be able to:

1. Open the app on phone.
2. See Today screen.
3. See whether live sales are connected.
4. View Penrith live POS if sync is configured.
5. Add Uber snapshot manually.
6. Upload a WhatsApp export.
7. Ask “What needs my attention today?”
8. Copy a manager message.

If these eight steps work, Beta 0.2 is ready for Freda’s first test.
