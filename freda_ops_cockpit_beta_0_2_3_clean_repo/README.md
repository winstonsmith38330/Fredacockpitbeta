# Freda Ops Cockpit — Beta 0.2.3 Clean Repo Package

This is a clean, full package intended to be uploaded to a **new GitHub branch or new GitHub repository at the repository root**. It avoids the previous nested-folder confusion.

## What is included

- Mobile-first PWA app in `web/`
- Node/Express server in `server/`
- Valid JavaScript seed file: `web/assets/seed-data.js`
- Pure JSON seed file: `seed-data.json`
- POS connector diagnostics for reporting.site
- Clear sales period labels:
  - POS Today / POS captured period
  - Uber WTD unless a daily snapshot is entered
  - Square MTD / captured period for Frieda's Pies
- Freda feedback section:
  - hour-by-hour same-day comparison requirement
  - sell-out timing tracker
  - planned FOMO vs operational sell-out distinction
  - leftovers and first-sold-out tracker
  - balls vs rings production mix, with the current seed assumption around 65% balls for specials
  - stock photo / two-trip stock planner
  - hiring and training as top management priorities
- Cache-busted service worker: `freda-ops-cockpit-beta-0-2-3-final-v3`

## Recommended GitHub setup

Create a new branch or a new repository and upload the **contents of this folder** so the GitHub root shows:

```text
db
docs
scripts
server
web
README.md
seed-data.json
```

Do not upload it as:

```text
freda_ops_cockpit_beta_0_2_3_clean_repo/server
```

The files above should be directly visible at the repo root.

## Render settings for a clean repo

Use these settings:

```text
Root Directory: server
Build Command: npm install
Start Command: npm start
```

Environment variables:

```text
NODE_ENV=production
PORT=10000
REPORTING_PHPSESSID=<raw PHPSESSID cookie value only>
```

Use only the raw cookie value for `REPORTING_PHPSESSID`, not `PHPSESSID=...`.

Alternative:

```text
REPORTING_COOKIE=PHPSESSID=<cookie value>
```

## After deployment

Open:

```text
https://YOUR-RENDER-URL.onrender.com/?v=023clean
```

You should see:

```text
Beta 0.2.3
Freda Priorities
POS Today
Uber WTD
Square MTD / captured period
```

If an older version still appears, clear browser/PWA cache or uninstall/reinstall the home-screen app.

## Important note on POS sync

Beta 0.2.3 has better diagnostics, but if reporting.site loads KPI values through browser-side JavaScript, server-side fetch may see the page but not the rendered KPI values. In that case, the app will show diagnostics and you can use manual/browser capture until a stable API/export path is confirmed.
