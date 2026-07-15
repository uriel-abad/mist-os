# Configuration

## Required before storefront deployment

Edit:

`store/js/config.js`

Replace:

```js
gasEndpoint: "PASTE_YOUR_MIST_OS_WEB_APP_EXEC_URL"
```

with the Apps Script Web App URL ending in `/exec`.

## Admin portal

No admin key or backend URL is stored in GitHub.

Open `/admin/` after deployment and enter:

1. The same Apps Script `/exec` URL
2. The private admin key returned by `setupMistOS()` or `getAdminKey()`

These are stored only in that browser's local storage.

## Product images

The seeded product image paths use:

```text
images/products/airform-studio-set/white/front.png
```

Paths in the Website Catalog sheet are relative to the `store/` folder. Public HTTPS image URLs are also supported.

## Business settings managed from Admin

- Store name
- Announcement text
- Hero eyebrow, title, subtitle, and button text
- Messenger username
- Instagram username

## Values that do not require manual configuration

- Spreadsheet ID: stored automatically by `setupMistOS()`
- Order-number counter: created automatically
- Product prices and totals: read and validated server-side
- Reserved and Available stock: system-managed
