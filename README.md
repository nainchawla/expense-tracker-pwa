# My Budget — offline expense tracker

A no-build, browser-only Progressive Web App based on the supplied blueprint. Financial data stays in IndexedDB on the device; it is never sent to a server.

## Run it locally

Serve this directory rather than opening `index.html` directly, because browsers only enable service workers from HTTP(S) origins. For example, with Python installed:

```powershell
Set-Location 'C:\Users\naing\Documents\Codex\2026-09-02\files-mentioned-by-the-user-expense\outputs\expense-tracker-pwa'
python -m http.server 8080
```

Then visit `http://localhost:8080`. Use the browser's install option to add it as an app.

## Included in this first build

- Salary and extra-income entries with percentage or one-category allocation.
- Exact two-decimal allocation rounding and salary-date cycles with carry-over.
- Expense entry and deletion, with live derived balances.
- Editable category names, colors, percentages, and currency settings.
- Complete JSON backup/restore, CSV export, and a protected reset.
- App-shell offline caching with a service worker.

## Data safety

This is local-only storage. Export a JSON backup regularly; clearing browser/site data removes the records. Before a production deployment, create PNG 192px and 512px icons and add them to `manifest.json` for widest platform install compatibility.
