# Testing Report

## Static checks completed

- All storefront JavaScript syntax checked with Node.js
- All Admin Portal JavaScript syntax checked with Node.js
- Consolidated Apps Script syntax checked with Node.js V8 syntax rules
- `products.json`, `appsscript.json`, and configuration JSON parsed successfully
- HTML parsed for duplicate IDs and missing local script/style references
- CSS checked for balanced braces
- Searched for placeholder deployment URLs and documented the one required replacement
- Verified frontend customer field names match backend request properties
- Verified backend writes canonical Google Sheet headers

## Logic checks completed

- Price parser accepts `899`, `899.00`, `₱899.00`, `PHP 899`, commas, blanks, and malformed text without returning `NaN`
- Invalid prices are rejected by product saving instead of displayed as `NaN`
- Server calculates official prices and totals from Products, ignoring customer-supplied totals
- Duplicate product/color/size cart entries merge quantities
- Quantity is constrained to positive integers
- Blank and malformed customer fields are rejected
- Stock cannot be negative or lower than Reserved
- Available stock is always calculated as Stock minus Reserved and cannot become negative
- Status changes reserve stock at Confirmed and deduct it at Shipped
- Unsafe status jumps are rejected
- Duplicate order signatures are flagged within the configured time window
- Backend errors are returned as readable JSON and logged to Error Log
- Live catalog failures fall back to local `products.json`

## Important environment limitations

The container cannot deploy into your Google account, execute real Apps Script services, send a real Messenger deep link on every phone model, or perform a live GitHub Pages deployment. Final end-to-end verification must therefore include:

1. Running `setupMistOS()` in your target Google Sheet
2. Running `runSystemCheck()` and confirming `ok: true`
3. Submitting a test order from the deployed storefront
4. Confirming the order in Admin and checking Reserved/Available
5. Moving it through Packed and Shipped and checking Stock
6. Testing Messenger on your own Android/iPhone and desktop browsers
