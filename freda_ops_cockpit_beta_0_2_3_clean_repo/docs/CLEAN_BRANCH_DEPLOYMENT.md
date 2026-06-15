# Clean branch deployment steps

1. Create a new GitHub branch, for example `beta-0.2.4-clean`, or create a new repository.
2. Upload the package contents at the repository root.
3. Confirm the root contains `server`, `web`, `db`, `docs`, `README.md`, and `seed-data.json`.
4. In Render, create a new Web Service or change the existing service to use the new branch.
5. Use:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add `REPORTING_PHPSESSID` directly in the Render service environment, not only in an unattached environment group.
7. Deploy.
8. Test with `/?v=023clean`.

Visual confirmation checklist:

- Header says `Beta 0.2.4`.
- There is a `Freda Priorities` tab.
- Live Sales labels show `POS Today`, `Uber WTD`, and `Square MTD / captured period`.
- Data tab shows connector diagnostics.
