# Pre-Rebuild Code Audit

## Working features preserved

- Responsive MIST storefront and pickleball hero
- Product front/back images
- Color and size selection
- Shopping bag and editable variants
- Messenger order handoff
- Unique order numbers
- Google Apps Script Web App integration
- Products, Website Catalog, Orders, Order Items, Inventory, Customers, Website Settings, Dashboard, and Error Log
- Admin dashboard, order status, payment status, products, inventory, customers, and website settings
- Inventory reservation at confirmation and deduction at shipment

## Bugs and likely causes found

1. **`₱NaN` in Admin product prices**
   - Admin formatted `product.Price`, while different backend versions returned different property names.
   - Legacy headers `ProductID` and `ProductName` did not match backend headers `Product ID` and `Product Name`.
   - Number conversion relied on raw `Number(value)` in several paths.

2. **Fallback catalog initialization bug**
   - The storefront's live catalog returned an array, while the local fallback returned an object containing the array.
   - Store settings were fetched but not consistently applied.

3. **Mixed API contracts**
   - Some modules returned raw spreadsheet objects with header names and spaces.
   - Other modules expected camelCase fields.

4. **Inventory inconsistencies**
   - Older scripts mixed product-name keys and SKU keys.
   - Manual Reserved or Available edits could bypass calculations.
   - Unsafe status jumps could deduct stock early.

5. **Dashboard low-stock bug**
   - Spreadsheet formulas counted blank rows or subtracted blanks, producing impossible negative values.

6. **Accumulated versions and conflicting setup functions**
   - Multiple backend versions used different schemas and setup names.

## Validation and security findings

- Client-supplied prices and totals must never be trusted.
- Spreadsheet values must be treated as untrusted because currency text, blanks, and malformed values can occur.
- Public order creation requires strict customer and SKU validation.
- Admin actions require a private key; the key must not be committed to GitHub.
- Apps Script remains a lightweight backend, not a high-security payment processor. No payment-card data should be collected.

## Refactoring completed

- Stable camelCase JSON API models
- Header alias and schema migration system
- Hidden backups before schema repair
- Shared defensive number parser
- Centralized product pricing and status transitions
- Split storefront API, UI, cart, and utilities
- Split Admin API, utilities, and application logic
- One canonical setup function: `setupMistOS()`
- One documented configuration placeholder
