# Security Notes for Credentials

Beta 0.2 was prepared without embedding any real passwords, emails, cookies or API tokens.

Before using with real data:

1. Rotate any password or cookie that was pasted during planning.
2. Put secrets only in `.env` or the host secret manager.
3. Do not commit `.env`.
4. Use a dedicated account/session where possible.
5. Remove any old PHP session cookie from scripts.
6. Keep candidate/staff data out of demo exports.
7. Treat WhatsApp exports as private because they can contain phone numbers, staff names and internal issues.

Recommended secret names:

```bash
REPORTING_PHPSESSID=
REPORTING_COOKIE=
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
OPENAI_API_KEY=
```

The package accepts `REPORTING_EMAIL` and `REPORTING_PASSWORD` placeholders for a future login flow, but Beta 0.2 prefers session-cookie based reporting.site sync and does not need to store the password.
