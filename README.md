# MIST OS Production 3.0

A separate, deployment-ready repository for the MIST storefront, admin portal, Google Sheets database, and Apps Script API.

## Included

- `store/` — responsive customer website
- `admin/` — private browser-based management portal
- `backend/apps-script/` — modular Apps Script backend
- `backend/apps-script/single-file/Code.gs` — easier copy-and-paste backend
- `docs/DEPLOYMENT.md` — exact deployment order
- `docs/CONFIG.md` — every value that requires attention
- `docs/TESTING_REPORT.md` — checks completed and environment limitations
- `original-reference/` — untouched v2.1 source ZIP used as the rebuild baseline

## Major reliability improvements

- Defensive parsing for currency-formatted and text-formatted numbers
- Canonical API models, so the Admin Portal no longer reads raw spreadsheet header names
- Safe schema migration for headers such as `ProductID` and `ProductName`
- Automatic hidden backups before sheet schema repair
- Server-side pricing and order-total calculation
- Duplicate cart variants merge automatically
- Negative stock and negative available inventory are blocked
- Valid order-status transitions are enforced
- Live catalog with a local JSON fallback
- Loading, empty, success, timeout, and error states
- Mobile navigation and navbar-aware anchor scrolling

Start with `docs/DEPLOYMENT.md`.


## Frontend configuration fix

Runtime website settings no longer modify the frozen `MIST.config` object. Dynamic values such as the Messenger username are stored in application state, preventing the browser error `Cannot assign to read only property`.
