/**
 * MIST OS Production — shared constants and schemas.
 * Apps Script loads every .gs file in this directory as one project.
 */

const MIST_OS_VERSION = "3.0.1";
const SCHEMA_VERSION = "MIST-OS-3";
const ORDER_PREFIX = "MIST";
const DUPLICATE_WINDOW_MINUTES = 30;
const LOW_STOCK_THRESHOLD = 5;
const ADMIN_KEY_PROPERTY = "MIST_OS_ADMIN_KEY";
const SPREADSHEET_ID_PROPERTY = "MIST_OS_SPREADSHEET_ID";

const SHEETS = Object.freeze({
  PRODUCTS: "Products",
  CATALOG: "Website Catalog",
  ORDERS: "Orders",
  ITEMS: "Order Items",
  INVENTORY: "Inventory",
  CUSTOMERS: "Customers",
  SETTINGS: "Website Settings",
  DASHBOARD: "Dashboard",
  ERRORS: "Error Log"
});

const PRODUCT_HEADERS = ["Product ID", "SKU", "Product Name", "Color", "Size", "Price", "Active"];
const CATALOG_HEADERS = [
  "Product ID", "Slug", "Product Name", "Description", "Badge", "Default Color",
  "Color", "Color Code", "Front Image URL", "Back Image URL", "Sort Order", "Featured", "Active"
];
const ORDER_HEADERS = [
  "Submitted At", "Order Number", "Customer Name", "Email", "Mobile", "Delivery Address",
  "Total Quantity", "Subtotal", "Status", "Payment Status", "Duplicate Check",
  "Inventory State", "Notes", "Order Signature"
];
const ITEM_HEADERS = [
  "Submitted At", "Order Number", "Product ID", "SKU", "Product Name", "Color", "Size",
  "Quantity", "Unit Price", "Line Total"
];
const INVENTORY_HEADERS = ["SKU", "Product Name", "Color", "Size", "Stock", "Reserved", "Available"];
const CUSTOMER_HEADERS = ["Email", "Customer Name", "Mobile", "Orders", "Lifetime Spend", "Last Order"];
const SETTINGS_HEADERS = ["Key", "Value"];
const ERROR_HEADERS = ["Timestamp", "Function", "Order Number", "Error", "Details"];

const SCHEMAS = Object.freeze({
  [SHEETS.PRODUCTS]: PRODUCT_HEADERS,
  [SHEETS.CATALOG]: CATALOG_HEADERS,
  [SHEETS.ORDERS]: ORDER_HEADERS,
  [SHEETS.ITEMS]: ITEM_HEADERS,
  [SHEETS.INVENTORY]: INVENTORY_HEADERS,
  [SHEETS.CUSTOMERS]: CUSTOMER_HEADERS,
  [SHEETS.SETTINGS]: SETTINGS_HEADERS,
  [SHEETS.ERRORS]: ERROR_HEADERS
});

const HEADER_ALIASES = Object.freeze({
  "Product ID": ["ProductID", "Product Id", "product_id"],
  "Product Name": ["ProductName", "Product", "product_name"],
  "Order Number": ["OrderNumber", "Order No", "Order #"],
  "Customer Name": ["CustomerName", "Name"],
  "Delivery Address": ["DeliveryAddress", "Address"],
  "Total Quantity": ["TotalQuantity", "Total Qty"],
  "Payment Status": ["PaymentStatus"],
  "Duplicate Check": ["DuplicateCheck", "Duplicate Flag"],
  "Inventory State": ["InventoryState"],
  "Order Signature": ["OrderSignature"],
  "Unit Price": ["UnitPrice"],
  "Line Total": ["LineTotal"],
  "Lifetime Spend": ["LifetimeSpend"],
  "Last Order": ["LastOrder"],
  "Default Color": ["DefaultColor"],
  "Color Code": ["ColorCode"],
  "Front Image URL": ["FrontImageURL", "Front Image", "FrontImage"],
  "Back Image URL": ["BackImageURL", "Back Image", "BackImage"],
  "Sort Order": ["SortOrder"]
});

const ORDER_STATUSES = ["New", "Suspicious", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Duplicate"];
const PAYMENT_STATUSES = ["Pending", "Paid", "COD", "Refunded"];
const ALLOWED_TRANSITIONS = Object.freeze({
  New: ["Confirmed", "Cancelled", "Suspicious", "Duplicate"],
  Suspicious: ["Confirmed", "Cancelled", "Duplicate"],
  Confirmed: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
  Duplicate: []
});

const DEFAULT_PRODUCTS = (() => {
  const rows = [];
  const sizes = ["XS", "S", "M", "L", "XL"];
  const colors = [
    { name: "White", code: "WHT" },
    { name: "Black", code: "BLK" },
    { name: "Light Pink", code: "PNK" }
  ];
  colors.forEach(color => sizes.forEach(size => rows.push([
    "AFS", `AFS-${color.code}-${size}`, "AirForm Studio Set", color.name, size, 899, "Yes"
  ])));
  return rows;
})();

const DEFAULT_CATALOG = [
  ["AFS", "airform-studio-set", "AirForm Studio Set", "Sculpting support with a smooth, breathable feel for training, walking, and everyday movement.", "NEW", "White", "White", "WHT", "images/products/airform-studio-set/white/front.png", "images/products/airform-studio-set/white/back.png", 1, "Yes", "Yes"],
  ["AFS", "airform-studio-set", "AirForm Studio Set", "Sculpting support with a smooth, breathable feel for training, walking, and everyday movement.", "NEW", "White", "Black", "BLK", "images/products/airform-studio-set/black/front.png", "images/products/airform-studio-set/black/back.png", 1, "Yes", "Yes"],
  ["AFS", "airform-studio-set", "AirForm Studio Set", "Sculpting support with a smooth, breathable feel for training, walking, and everyday movement.", "NEW", "White", "Light Pink", "PNK", "images/products/airform-studio-set/light-pink/front.png", "images/products/airform-studio-set/light-pink/back.png", 1, "Yes", "Yes"]
];

const DEFAULT_SETTINGS = [
  ["store_name", "MIST"],
  ["hero_title", "Move Light. Move Free."],
  ["hero_subtitle", "Versatile activewear for studio sessions, city walks, and everything between."],
  ["hero_button", "Browse the collection"],
  ["hero_eyebrow", "The Airform Collection"],
  ["announcement_text", "MIST CATALOGUE · ORDERS ARE CONFIRMED MANUALLY BEFORE PAYMENT"],
  ["messenger_username", "marichris.milanes"],
  ["instagram_username", "Chrissygotosleep"],
  ["currency", "PHP"]
];
/** Shared validation, parsing, sheet, and response helpers. */

function normalizeHeader_(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function headerCandidates_(canonical) {
  return [canonical].concat(HEADER_ALIASES[canonical] || []).map(normalizeHeader_);
}

function findHeaderIndex_(headers, canonical) {
  const normalized = headers.map(normalizeHeader_);
  const candidates = headerCandidates_(canonical);
  for (let index = 0; index < normalized.length; index += 1) {
    if (candidates.includes(normalized[index])) return index;
  }
  return -1;
}

function parseNumber_(value, fallback) {
  const defaultValue = typeof fallback === "number" ? fallback : 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : defaultValue;
  if (value === null || typeof value === "undefined" || value === "") return defaultValue;
  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/₱|PHP/gi, "")
    .replace(/,/g, "")
    .replace(/[^0-9.+-]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "+" || cleaned === "-") return defaultValue;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseNonNegativeNumber_(value, fieldName) {
  const parsed = parseNumber_(value, NaN);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error((fieldName || "Value") + " must be zero or higher.");
  return parsed;
}

function parsePositiveInteger_(value, fieldName) {
  const parsed = parseNumber_(value, NaN);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error((fieldName || "Quantity") + " must be a whole number of 1 or higher.");
  return parsed;
}

function isYes_(value) {
  return /^(yes|true|1|active)$/i.test(String(value || "").trim());
}

function yesNo_(value) {
  return isYes_(value) ? "Yes" : "No";
}

function normalizePhone_(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function errorMessage_(error) {
  return String(error && error.message ? error.message : error || "Unknown error");
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(SPREADSHEET_ID_PROPERTY);
  if (storedId) return SpreadsheetApp.openById(storedId);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    properties.setProperty(SPREADSHEET_ID_PROPERTY, active.getId());
    return active;
  }
  throw new Error("No spreadsheet is configured. Run setupMistOS() from the spreadsheet-bound Apps Script project.");
}

function parsePayload_(event) {
  if (!event || !event.postData || !event.postData.contents) throw new Error("No request data was received.");
  try {
    const parsed = JSON.parse(event.postData.contents);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Request body must be an object.");
    return parsed;
  } catch (error) {
    throw new Error("The submitted request is not valid JSON.");
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function requireAdmin_(candidate) {
  const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_KEY_PROPERTY);
  const supplied = String(candidate || "");
  if (!expected || !supplied || expected.length !== supplied.length) throw new Error("Admin authorization failed.");
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  if (difference !== 0) throw new Error("Admin authorization failed.");
}

function sheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error("Missing required sheet: " + name + ". Run setupMistOS().");
  return sheet;
}

function currentHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
}

function rowsAsCanonicalObjects_(sheetName, canonicalHeaders, displayValues) {
  const sheet = sheet_(sheetName);
  if (sheet.getLastRow() < 2) return [];
  const headers = currentHeaders_(sheet);
  const indexes = canonicalHeaders.map(header => findHeaderIndex_(headers, header));
  const missing = canonicalHeaders.filter((header, index) => indexes[index] < 0);
  if (missing.length) throw new Error(sheetName + " has missing columns: " + missing.join(", ") + ". Run setupMistOS() to repair the schema.");
  const values = (displayValues ? sheet.getDisplayValues() : sheet.getDataRange().getValues()).slice(1);
  return values
    .filter(row => row.some(value => String(value || "").trim() !== ""))
    .map(row => {
      const object = {};
      canonicalHeaders.forEach((header, index) => { object[header] = row[indexes[index]]; });
      return object;
    });
}

function appendCanonicalRow_(sheetName, canonicalHeaders, object) {
  const sheet = sheet_(sheetName);
  const headers = currentHeaders_(sheet);
  const row = new Array(headers.length).fill("");
  canonicalHeaders.forEach(header => {
    const index = findHeaderIndex_(headers, header);
    if (index < 0) throw new Error(sheetName + " is missing column " + header + ". Run setupMistOS().");
    row[index] = object[header];
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function writeCanonicalObject_(sheetName, canonicalHeaders, rowNumber, object) {
  const sheet = sheet_(sheetName);
  const headers = currentHeaders_(sheet);
  canonicalHeaders.forEach(header => {
    if (!Object.prototype.hasOwnProperty.call(object, header)) return;
    const index = findHeaderIndex_(headers, header);
    if (index < 0) throw new Error(sheetName + " is missing column " + header + ". Run setupMistOS().");
    sheet.getRange(rowNumber, index + 1).setValue(object[header]);
  });
}

function findRowByCanonicalValue_(sheetName, canonicalHeader, expectedValue) {
  const sheet = sheet_(sheetName);
  if (sheet.getLastRow() < 2) return 0;
  const headers = currentHeaders_(sheet);
  const index = findHeaderIndex_(headers, canonicalHeader);
  if (index < 0) throw new Error(sheetName + " is missing column " + canonicalHeader + ".");
  const values = sheet.getRange(2, index + 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  const expected = String(expectedValue || "").trim().toLowerCase();
  for (let row = 0; row < values.length; row += 1) {
    if (String(values[row][0] || "").trim().toLowerCase() === expected) return row + 2;
  }
  return 0;
}

function upsertCanonical_(sheetName, canonicalHeaders, keyHeader, object) {
  const key = String(object[keyHeader] || "").trim();
  if (!key) throw new Error(keyHeader + " is required.");
  const row = findRowByCanonicalValue_(sheetName, keyHeader, key);
  if (row) {
    writeCanonicalObject_(sheetName, canonicalHeaders, row, object);
    return row;
  }
  return appendCanonicalRow_(sheetName, canonicalHeaders, object);
}

function logError_(functionName, orderNumber, error, details) {
  try {
    const ss = getSpreadsheet_();
    let sheet = ss.getSheetByName(SHEETS.ERRORS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.ERRORS);
      sheet.getRange(1, 1, 1, ERROR_HEADERS.length).setValues([ERROR_HEADERS]);
    }
    sheet.appendRow([new Date(), functionName || "", orderNumber || "", errorMessage_(error), String(details || "").slice(0, 5000)]);
  } catch (_) {}
}

function settingsObject_() {
  const settings = {};
  rowsAsCanonicalObjects_(SHEETS.SETTINGS, SETTINGS_HEADERS, false).forEach(row => {
    const key = String(row.Key || "").trim();
    if (key) settings[key] = String(row.Value || "");
  });
  return settings;
}

function nextOrderNumber_() {
  const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy");
  const key = "ORDER_COUNTER_" + year;
  const properties = PropertiesService.getScriptProperties();
  const current = Math.max(0, Math.floor(parseNumber_(properties.getProperty(key), 0)));
  const next = current + 1;
  properties.setProperty(key, String(next));
  return ORDER_PREFIX + "-" + year + "-" + String(next).padStart(4, "0");
}
/** Spreadsheet setup, safe schema migration, formatting, and health checks. */

function setupMistOS() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Open Apps Script from the target Google Sheet using Extensions → Apps Script.");
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROPERTY, spreadsheet.getId());

  Object.keys(SCHEMAS).forEach(sheetName => ensureCanonicalSheet_(spreadsheet, sheetName, SCHEMAS[sheetName]));
  ensurePlainSheet_(spreadsheet, SHEETS.DASHBOARD);

  seedIfEmpty_(sheet_(SHEETS.PRODUCTS), DEFAULT_PRODUCTS);
  seedIfEmpty_(sheet_(SHEETS.CATALOG), DEFAULT_CATALOG);
  seedIfEmpty_(sheet_(SHEETS.SETTINGS), DEFAULT_SETTINGS);
  syncInventoryFromProducts_();
  rebuildCustomers_();
  formatAllSheets_();
  rebuildDashboardSheet_();

  const properties = PropertiesService.getScriptProperties();
  let adminKey = properties.getProperty(ADMIN_KEY_PROPERTY);
  if (!adminKey) {
    adminKey = Utilities.getUuid().replace(/-/g, "");
    properties.setProperty(ADMIN_KEY_PROPERTY, adminKey);
  }

  // Install an authorized edit trigger. A simple onEdit trigger cannot call
  // services such as SpreadsheetApp.openById(), which MIST OS uses internally.
  installMistEditTrigger();

  SpreadsheetApp.flush();
  return {
    ok: true,
    version: MIST_OS_VERSION,
    schema: SCHEMA_VERSION,
    adminKey,
    editTriggerInstalled: hasMistEditTrigger_(),
    sheets: Object.values(SHEETS)
  };
}

function ensureCanonicalSheet_(spreadsheet, sheetName, canonicalHeaders) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);
    return sheet;
  }

  const existingHeaders = currentHeaders_(sheet);
  const indexes = canonicalHeaders.map(header => findHeaderIndex_(existingHeaders, header));
  const hasAllColumns = indexes.every(index => index >= 0);
  const isCanonicalOrder = hasAllColumns && canonicalHeaders.every((header, index) => normalizeHeader_(existingHeaders[index]) === normalizeHeader_(header));
  if (isCanonicalOrder && existingHeaders.length === canonicalHeaders.length) {
    sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);
    return sheet;
  }

  if (sheet.getLastRow() > 1 || existingHeaders.some(value => String(value || "").trim())) {
    backupSheet_(spreadsheet, sheet, sheetName + " Backup");
  }

  const sourceRows = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, existingHeaders.length).getValues()
    : [];
  const migratedRows = hasAllColumns
    ? sourceRows.map(row => indexes.map(index => row[index]))
    : [];

  sheet.clear();
  sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);
  if (migratedRows.length) sheet.getRange(2, 1, migratedRows.length, canonicalHeaders.length).setValues(migratedRows);
  return sheet;
}

function ensurePlainSheet_(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function backupSheet_(spreadsheet, sourceSheet, baseName) {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  let name = (baseName + " " + timestamp).slice(0, 99);
  let suffix = 2;
  while (spreadsheet.getSheetByName(name)) {
    name = (baseName + " " + timestamp + " " + suffix).slice(0, 99);
    suffix += 1;
  }
  const backup = sourceSheet.copyTo(spreadsheet);
  backup.setName(name);
  backup.hideSheet();
}

function seedIfEmpty_(sheet, rows) {
  if (sheet.getLastRow() <= 1 && rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function formatAllSheets_() {
  const spreadsheet = getSpreadsheet_();
  Object.keys(SCHEMAS).forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;
    const headers = SCHEMAS[sheetName];
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#111111")
      .setFontColor("#ffffff");
    sheet.setColumnWidths(1, headers.length, 145);
  });

  sheet_(SHEETS.PRODUCTS).getRange("F:F").setNumberFormat('₱#,##0.00');
  sheet_(SHEETS.ORDERS).getRange("A:A").setNumberFormat("mmm d, yyyy h:mm AM/PM");
  sheet_(SHEETS.ORDERS).getRange("H:H").setNumberFormat('₱#,##0.00');
  sheet_(SHEETS.ITEMS).getRange("A:A").setNumberFormat("mmm d, yyyy h:mm AM/PM");
  sheet_(SHEETS.ITEMS).getRange("I:J").setNumberFormat('₱#,##0.00');
  sheet_(SHEETS.CUSTOMERS).getRange("E:E").setNumberFormat('₱#,##0.00');
  sheet_(SHEETS.INVENTORY).getRange("E:G").setNumberFormat("0");
  sheet_(SHEETS.ERRORS).getRange("A:A").setNumberFormat("mmm d, yyyy h:mm:ss AM/PM");

  setValidation_(sheet_(SHEETS.ORDERS), 9, ORDER_STATUSES);
  setValidation_(sheet_(SHEETS.ORDERS), 10, PAYMENT_STATUSES);
  setValidation_(sheet_(SHEETS.PRODUCTS), 7, ["Yes", "No"]);
  setValidation_(sheet_(SHEETS.CATALOG), 12, ["Yes", "No"]);
  setValidation_(sheet_(SHEETS.CATALOG), 13, ["Yes", "No"]);
}

function setValidation_(sheet, column, values) {
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sheet.getRange(2, column, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function getAdminKey() {
  return PropertiesService.getScriptProperties().getProperty(ADMIN_KEY_PROPERTY) || "Run setupMistOS first.";
}

function setAdminKey(newKey) {
  const key = String(newKey || "").trim();
  if (key.length < 12) throw new Error("Use an admin key with at least 12 characters.");
  PropertiesService.getScriptProperties().setProperty(ADMIN_KEY_PROPERTY, key);
  return "Admin key updated.";
}

function resetCurrentYearCounter(lastUsedNumber) {
  const value = parseNumber_(lastUsedNumber, NaN);
  if (!Number.isInteger(value) || value < 0) throw new Error("Enter a whole number of 0 or higher.");
  const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy");
  PropertiesService.getScriptProperties().setProperty("ORDER_COUNTER_" + year, String(value));
  return "Next order will be " + ORDER_PREFIX + "-" + year + "-" + String(value + 1).padStart(4, "0");
}

function runSystemCheck() {
  const spreadsheet = getSpreadsheet_();
  const missingSheets = Object.values(SHEETS).filter(name => !spreadsheet.getSheetByName(name));
  const errors = [];
  Object.keys(SCHEMAS).forEach(sheetName => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;
    const headers = currentHeaders_(sheet);
    const missingHeaders = SCHEMAS[sheetName].filter(header => findHeaderIndex_(headers, header) < 0);
    if (missingHeaders.length) errors.push(sheetName + " missing: " + missingHeaders.join(", "));
  });

  let catalogProducts = 0;
  try { catalogProducts = buildPublicCatalog_().length; } catch (error) { errors.push(errorMessage_(error)); }
  const result = {
    ok: missingSheets.length === 0 && errors.length === 0 && catalogProducts > 0,
    version: MIST_OS_VERSION,
    schema: SCHEMA_VERSION,
    spreadsheet: spreadsheet.getName(),
    missingSheets,
    errors,
    catalogProducts,
    productVariants: rowsAsCanonicalObjects_(SHEETS.PRODUCTS, PRODUCT_HEADERS, false).length,
    inventoryRows: rowsAsCanonicalObjects_(SHEETS.INVENTORY, INVENTORY_HEADERS, false).length,
    orders: rowsAsCanonicalObjects_(SHEETS.ORDERS, ORDER_HEADERS, false).length
  };
  return result;
}

function testMistOS() {
  return runSystemCheck();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("MIST OS")
    .addItem("Run setup / repair schema", "setupMistOS")
    .addItem("Run system check", "showSystemCheck")
    .addItem("Show admin key", "showAdminKey")
    .addItem("Install / repair edit trigger", "installMistEditTrigger")
    .addItem("Refresh dashboard", "rebuildDashboardSheet")
    .addToUi();
}

function showSystemCheck() {
  const result = runSystemCheck();
  SpreadsheetApp.getUi().alert("MIST OS system check", JSON.stringify(result, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
}

function showAdminKey() {
  SpreadsheetApp.getUi().alert(
    "MIST OS Admin Key",
    "Keep this private and enter it only in your admin portal.\n\n" + getAdminKey(),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
/** Product catalog, website showcase, and settings. */

function serializeProduct_(row) {
  return {
    productId: String(row["Product ID"] || "").trim(),
    sku: String(row.SKU || "").trim().toUpperCase(),
    name: String(row["Product Name"] || "").trim(),
    color: String(row.Color || "").trim(),
    size: String(row.Size || "").trim(),
    price: parseNonNegativeNumber_(row.Price, "Price"),
    active: isYes_(row.Active)
  };
}

function productMap_() {
  const map = {};
  rowsAsCanonicalObjects_(SHEETS.PRODUCTS, PRODUCT_HEADERS, false).forEach(row => {
    const product = serializeProduct_(row);
    if (!product.sku) return;
    if (map[product.sku]) throw new Error("Duplicate SKU in Products: " + product.sku);
    map[product.sku] = product;
  });
  return map;
}

function saveProduct_(input) {
  const product = input || {};
  const normalized = {
    "Product ID": String(product.productId || product["Product ID"] || "").trim().toUpperCase(),
    SKU: String(product.sku || product.SKU || "").trim().toUpperCase(),
    "Product Name": String(product.name || product["Product Name"] || "").trim(),
    Color: String(product.color || product.Color || "").trim(),
    Size: String(product.size || product.Size || "").trim().toUpperCase(),
    Price: parseNonNegativeNumber_(product.price ?? product.Price, "Price"),
    Active: yesNo_(product.active ?? product.Active)
  };
  if (!normalized["Product ID"] || !normalized.SKU || !normalized["Product Name"] || !normalized.Color || !normalized.Size) {
    throw new Error("Product ID, SKU, product name, color, and size are required.");
  }
  upsertCanonical_(SHEETS.PRODUCTS, PRODUCT_HEADERS, "SKU", normalized);
  syncInventoryFromProducts_();
  return { ok: true, product: serializeProduct_(normalized) };
}

function saveCatalogEntry_(input) {
  const entry = input || {};
  const normalized = {
    "Product ID": String(entry.productId || entry["Product ID"] || "").trim().toUpperCase(),
    Slug: String(entry.slug || entry.Slug || "").trim().toLowerCase(),
    "Product Name": String(entry.name || entry["Product Name"] || "").trim(),
    Description: String(entry.description || entry.Description || "").trim(),
    Badge: String(entry.badge || entry.Badge || "").trim(),
    "Default Color": String(entry.defaultColor || entry["Default Color"] || "").trim(),
    Color: String(entry.color || entry.Color || "").trim(),
    "Color Code": String(entry.colorCode || entry["Color Code"] || "").trim().toUpperCase(),
    "Front Image URL": String(entry.frontImage || entry["Front Image URL"] || "").trim(),
    "Back Image URL": String(entry.backImage || entry["Back Image URL"] || "").trim(),
    "Sort Order": Math.floor(parseNonNegativeNumber_(entry.sortOrder ?? entry["Sort Order"], "Sort order")),
    Featured: yesNo_(entry.featured ?? entry.Featured),
    Active: yesNo_(entry.active ?? entry.Active)
  };
  if (!normalized["Product ID"] || !normalized.Slug || !normalized["Product Name"] || !normalized.Color || !normalized["Color Code"] || !normalized["Front Image URL"] || !normalized["Back Image URL"]) {
    throw new Error("Complete the required website showcase fields.");
  }

  const rows = rowsAsCanonicalObjects_(SHEETS.CATALOG, CATALOG_HEADERS, false);
  const existingIndex = rows.findIndex(row =>
    String(row["Product ID"] || "").trim().toUpperCase() === normalized["Product ID"] &&
    String(row.Color || "").trim().toLowerCase() === normalized.Color.toLowerCase()
  );
  if (existingIndex >= 0) writeCanonicalObject_(SHEETS.CATALOG, CATALOG_HEADERS, existingIndex + 2, normalized);
  else appendCanonicalRow_(SHEETS.CATALOG, CATALOG_HEADERS, normalized);
  return { ok: true, productId: normalized["Product ID"], color: normalized.Color };
}

function saveSetting_(key, value) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) throw new Error("Setting key is required.");
  upsertCanonical_(SHEETS.SETTINGS, SETTINGS_HEADERS, "Key", { Key: normalizedKey, Value: String(value ?? "") });
  return { ok: true, key: normalizedKey, value: String(value ?? "") };
}

function buildPublicCatalog_() {
  const products = productMap_();
  const catalogRows = rowsAsCanonicalObjects_(SHEETS.CATALOG, CATALOG_HEADERS, false);
  const grouped = {};

  catalogRows.forEach(row => {
    if (!isYes_(row.Active)) return;
    const productId = String(row["Product ID"] || "").trim().toUpperCase();
    const color = String(row.Color || "").trim();
    const variants = Object.values(products).filter(product =>
      product.active && product.productId === productId && product.color.toLowerCase() === color.toLowerCase()
    );
    if (!variants.length) return;

    const prices = variants.map(variant => variant.price).filter(Number.isFinite);
    if (!prices.length) return;
    if (!grouped[productId]) {
      grouped[productId] = {
        id: String(row.Slug || "").trim(),
        productCode: productId,
        name: String(row["Product Name"] || variants[0].name).trim(),
        description: String(row.Description || "").trim(),
        badge: String(row.Badge || "").trim(),
        defaultColor: String(row["Default Color"] || "").trim(),
        price: Math.min.apply(null, prices),
        sizes: [],
        colors: {},
        sortOrder: Math.floor(parseNumber_(row["Sort Order"], 999)),
        featured: isYes_(row.Featured)
      };
    }

    const groupedProduct = grouped[productId];
    groupedProduct.price = Math.min(groupedProduct.price, Math.min.apply(null, prices));
    variants.forEach(variant => {
      if (!groupedProduct.sizes.includes(variant.size)) groupedProduct.sizes.push(variant.size);
    });
    groupedProduct.colors[color] = {
      code: String(row["Color Code"] || "").trim().toUpperCase(),
      front: String(row["Front Image URL"] || "").trim(),
      back: String(row["Back Image URL"] || "").trim()
    };
  });

  const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
  return Object.values(grouped)
    .filter(product => product.id && product.name && Number.isFinite(product.price) && product.price >= 0 && Object.keys(product.colors).length)
    .map(product => {
      product.sizes.sort((a, b) => {
        const first = sizeOrder.indexOf(a);
        const second = sizeOrder.indexOf(b);
        if (first < 0 && second < 0) return a.localeCompare(b);
        if (first < 0) return 1;
        if (second < 0) return -1;
        return first - second;
      });
      if (!product.colors[product.defaultColor]) product.defaultColor = Object.keys(product.colors)[0] || "";
      return product;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function publicCatalogResponse_() {
  return {
    ok: true,
    version: MIST_OS_VERSION,
    schema: SCHEMA_VERSION,
    settings: settingsObject_(),
    products: buildPublicCatalog_()
  };
}

function adminProductsResponse_() {
  return {
    ok: true,
    products: rowsAsCanonicalObjects_(SHEETS.PRODUCTS, PRODUCT_HEADERS, false).map(serializeProduct_),
    catalog: rowsAsCanonicalObjects_(SHEETS.CATALOG, CATALOG_HEADERS, false).map(row => ({
      productId: String(row["Product ID"] || "").trim(),
      slug: String(row.Slug || "").trim(),
      name: String(row["Product Name"] || "").trim(),
      description: String(row.Description || "").trim(),
      badge: String(row.Badge || "").trim(),
      defaultColor: String(row["Default Color"] || "").trim(),
      color: String(row.Color || "").trim(),
      colorCode: String(row["Color Code"] || "").trim(),
      frontImage: String(row["Front Image URL"] || "").trim(),
      backImage: String(row["Back Image URL"] || "").trim(),
      sortOrder: Math.floor(parseNumber_(row["Sort Order"], 999)),
      featured: isYes_(row.Featured),
      active: isYes_(row.Active)
    }))
  };
}

function validateAndPriceItems_(rawItems, catalog) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new Error("The order has no items.");
  return rawItems.map(raw => {
    const sku = String(raw && raw.sku || "").trim().toUpperCase();
    const quantity = parsePositiveInteger_(raw && raw.qty, "Quantity");
    const product = catalog[sku];
    if (!product) throw new Error("Unknown SKU: " + sku);
    if (!product.active) throw new Error("This product variation is unavailable: " + sku);
    return {
      productId: product.productId,
      sku: product.sku,
      name: product.name,
      color: product.color,
      size: product.size,
      price: product.price,
      qty: quantity,
      lineTotal: product.price * quantity
    };
  });
}
/** Inventory synchronization and guarded stock transitions. */

function inventoryMap_() {
  const map = {};
  rowsAsCanonicalObjects_(SHEETS.INVENTORY, INVENTORY_HEADERS, false).forEach((row, index) => {
    const sku = String(row.SKU || "").trim().toUpperCase();
    if (!sku) return;
    map[sku] = {
      row: index + 2,
      sku,
      name: String(row["Product Name"] || "").trim(),
      color: String(row.Color || "").trim(),
      size: String(row.Size || "").trim(),
      stock: Math.max(0, Math.floor(parseNumber_(row.Stock, 0))),
      reserved: Math.max(0, Math.floor(parseNumber_(row.Reserved, 0))),
      available: Math.max(0, Math.floor(parseNumber_(row.Available, 0)))
    };
  });
  return map;
}

function syncInventoryFromProducts_() {
  const products = productMap_();
  const inventory = inventoryMap_();
  let added = 0;
  Object.values(products).forEach(product => {
    if (!product.active || inventory[product.sku]) return;
    appendCanonicalRow_(SHEETS.INVENTORY, INVENTORY_HEADERS, {
      SKU: product.sku,
      "Product Name": product.name,
      Color: product.color,
      Size: product.size,
      Stock: 0,
      Reserved: 0,
      Available: 0
    });
    added += 1;
  });
  return added;
}

function updateStock_(skuValue, stockValue) {
  const sku = String(skuValue || "").trim().toUpperCase();
  if (!sku) throw new Error("SKU is required.");
  const stock = Math.floor(parseNonNegativeNumber_(stockValue, "Stock"));
  const inventory = inventoryMap_();
  const record = inventory[sku];
  if (!record) throw new Error("SKU is missing from Inventory: " + sku);
  if (stock < record.reserved) throw new Error("Stock cannot be lower than the reserved quantity (" + record.reserved + ").");
  writeCanonicalObject_(SHEETS.INVENTORY, INVENTORY_HEADERS, record.row, {
    Stock: stock,
    Reserved: record.reserved,
    Available: stock - record.reserved
  });
  return { ok: true, sku, stock, reserved: record.reserved, available: stock - record.reserved };
}

function combineSkuItems_(items) {
  const combined = {};
  items.forEach(item => {
    const sku = String(item.sku || "").trim().toUpperCase();
    const quantity = Math.floor(parseNumber_(item.quantity ?? item.qty, 0));
    if (!sku || quantity <= 0) return;
    if (!combined[sku]) combined[sku] = { sku, quantity: 0 };
    combined[sku].quantity += quantity;
  });
  return Object.values(combined);
}

function changeInventoryState_(items, fromState, toState) {
  if (fromState === toState) return;
  const combinations = {
    "NONE>RESERVED": { stock: 0, reserved: 1 },
    "RESERVED>NONE": { stock: 0, reserved: -1 },
    "RESERVED>SOLD": { stock: -1, reserved: -1 },
    "NONE>SOLD": { stock: -1, reserved: 0 }
  };
  const multipliers = combinations[fromState + ">" + toState];
  if (!multipliers) throw new Error("Unsupported inventory transition: " + fromState + " → " + toState);

  const inventory = inventoryMap_();
  const changes = combineSkuItems_(items).map(item => {
    const record = inventory[item.sku];
    if (!record) throw new Error("SKU is missing from Inventory: " + item.sku);
    const stock = record.stock + multipliers.stock * item.quantity;
    const reserved = record.reserved + multipliers.reserved * item.quantity;
    const available = stock - reserved;
    if (stock < 0) throw new Error("Not enough stock for " + item.sku + ".");
    if (reserved < 0) throw new Error("Reserved stock cannot be negative for " + item.sku + ".");
    if (available < 0) throw new Error("Not enough available stock for " + item.sku + ".");
    return { row: record.row, sku: item.sku, stock, reserved, available };
  });

  changes.forEach(change => writeCanonicalObject_(SHEETS.INVENTORY, INVENTORY_HEADERS, change.row, {
    Stock: change.stock,
    Reserved: change.reserved,
    Available: change.available
  }));
}

function inventoryStateForStatus_(status) {
  if (status === "Confirmed" || status === "Packed") return "RESERVED";
  if (status === "Shipped" || status === "Delivered") return "SOLD";
  return "NONE";
}

function orderItemsForInventory_(orderNumber) {
  return rowsAsCanonicalObjects_(SHEETS.ITEMS, ITEM_HEADERS, false)
    .filter(row => String(row["Order Number"] || "").trim() === orderNumber)
    .map(row => ({ sku: String(row.SKU || "").trim().toUpperCase(), quantity: Math.floor(parseNumber_(row.Quantity, 0)) }))
    .filter(item => item.sku && item.quantity > 0);
}

function adminInventoryResponse_() {
  return {
    ok: true,
    inventory: rowsAsCanonicalObjects_(SHEETS.INVENTORY, INVENTORY_HEADERS, false).map(row => {
      const stock = Math.max(0, Math.floor(parseNumber_(row.Stock, 0)));
      const reserved = Math.max(0, Math.floor(parseNumber_(row.Reserved, 0)));
      return {
        sku: String(row.SKU || "").trim(),
        name: String(row["Product Name"] || "").trim(),
        color: String(row.Color || "").trim(),
        size: String(row.Size || "").trim(),
        stock,
        reserved,
        available: Math.max(0, stock - reserved)
      };
    })
  };
}

/**
 * Parses inventory values defensively. Blank, formatted, or malformed values
 * become zero instead of producing NaN.
 */
function parseInventoryNumber_(value) {
  const parsed = parseNumber_(value, 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Recalculates Available = Stock - Reserved for every inventory row.
 * Run this once after replacing Code.gs to repair stale Available values.
 */
function recalculateAllInventory() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEETS.INVENTORY);
  if (!sheet) throw new Error("Inventory sheet was not found.");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return "No inventory rows found.";

  const headers = currentHeaders_(sheet);
  const stockColumn = findHeaderIndex_(headers, "Stock") + 1;
  const reservedColumn = findHeaderIndex_(headers, "Reserved") + 1;
  const availableColumn = findHeaderIndex_(headers, "Available") + 1;
  const skuColumn = findHeaderIndex_(headers, "SKU") + 1;

  if (!stockColumn || !reservedColumn || !availableColumn || !skuColumn) {
    throw new Error("Inventory headers are incomplete.");
  }

  const rowCount = lastRow - 1;
  const skuValues = sheet.getRange(2, skuColumn, rowCount, 1).getDisplayValues();
  const stockValues = sheet.getRange(2, stockColumn, rowCount, 1).getValues();
  const reservedValues = sheet.getRange(2, reservedColumn, rowCount, 1).getValues();

  const availableValues = skuValues.map((skuRow, index) => {
    const sku = String(skuRow[0] || "").trim();
    if (!sku) return [""];

    const stock = Math.floor(parseInventoryNumber_(stockValues[index][0]));
    const reserved = Math.floor(parseInventoryNumber_(reservedValues[index][0]));

    if (reserved > stock) {
      throw new Error(
        "Reserved stock is greater than Stock for " + sku +
        ". Fix Stock or cancel/release the reservation first."
      );
    }

    return [stock - reserved];
  });

  sheet.getRange(2, availableColumn, rowCount, 1).setValues(availableValues);
  SpreadsheetApp.flush();
  return rowCount + " inventory row(s) recalculated.";
}

/**
 * Installs the authorized spreadsheet edit trigger used by MIST OS.
 * Run this once manually if setupMistOS() was completed before this fix.
 */
function installMistEditTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet() || getSpreadsheet_();
  if (!spreadsheet) throw new Error("No spreadsheet is configured.");

  const handlerName = "handleMistEdit";
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === handlerName) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger(handlerName)
    .forSpreadsheet(spreadsheet)
    .onEdit()
    .create();

  return "MIST OS edit trigger installed for: " + spreadsheet.getName();
}

function hasMistEditTrigger_() {
  return ScriptApp.getProjectTriggers().some(
    trigger => trigger.getHandlerFunction() === "handleMistEdit"
  );
}

function handleMistEdit(event) {
  if (!event || !event.range) return;

  const sheet = event.range.getSheet();
  const sheetName = sheet.getName();

  if (sheetName === SHEETS.INVENTORY && event.range.getRow() >= 2) {
    const headers = currentHeaders_(sheet);
    const stockColumn = findHeaderIndex_(headers, "Stock") + 1;
    const reservedColumn = findHeaderIndex_(headers, "Reserved") + 1;
    const availableColumn = findHeaderIndex_(headers, "Available") + 1;
    const skuColumn = findHeaderIndex_(headers, "SKU") + 1;

    const editedStartColumn = event.range.getColumn();
    const editedEndColumn = editedStartColumn + event.range.getNumColumns() - 1;
    const touchesReserved = reservedColumn >= editedStartColumn && reservedColumn <= editedEndColumn;
    const touchesAvailable = availableColumn >= editedStartColumn && availableColumn <= editedEndColumn;
    const touchesStock = stockColumn >= editedStartColumn && stockColumn <= editedEndColumn;

    if (touchesReserved || touchesAvailable) {
      event.source.toast(
        "Reserved and Available are managed automatically. Edit Stock only.",
        "MIST OS",
        7
      );
      recalculateAllInventory();
      return;
    }

    if (touchesStock) {
      try {
        const startRow = event.range.getRow();
        const rowCount = event.range.getNumRows();
        const skuValues = sheet.getRange(startRow, skuColumn, rowCount, 1).getDisplayValues();
        const stockValues = sheet.getRange(startRow, stockColumn, rowCount, 1).getValues();
        const reservedValues = sheet.getRange(startRow, reservedColumn, rowCount, 1).getValues();

        const availableValues = [];

        for (let index = 0; index < rowCount; index += 1) {
          const sku = String(skuValues[index][0] || "").trim();
          if (!sku) {
            availableValues.push([""]);
            continue;
          }

          const stock = Math.floor(parseInventoryNumber_(stockValues[index][0]));
          const reserved = Math.floor(parseInventoryNumber_(reservedValues[index][0]));

          if (stock < reserved) {
            throw new Error(
              "Stock cannot be lower than Reserved for " + sku +
              " (Reserved: " + reserved + ")."
            );
          }

          availableValues.push([stock - reserved]);
        }

        sheet.getRange(startRow, availableColumn, rowCount, 1).setValues(availableValues);
        SpreadsheetApp.flush();
      } catch (error) {
        event.source.toast(errorMessage_(error), "MIST OS inventory", 9);
      }
      return;
    }
  }

  if (sheetName === SHEETS.ORDERS && event.range.getRow() >= 2) {
    const headers = currentHeaders_(sheet);
    const statusColumn = findHeaderIndex_(headers, "Status") + 1;
    if (event.range.getColumn() !== statusColumn) return;

    const orderNumberColumn = findHeaderIndex_(headers, "Order Number") + 1;
    const orderNumber = sheet.getRange(event.range.getRow(), orderNumberColumn).getDisplayValue();

    try {
      updateOrderStatus_(orderNumber, event.value, event.oldValue || "New", true);
    } catch (error) {
      event.range.setValue(event.oldValue || "New");
      event.source.toast(errorMessage_(error), "MIST OS order update", 9);
    }
  }
}
/** Customer order creation and fulfillment status workflow. */

function validateCustomer_(payload) {
  const name = String(payload.name || "").trim();
  const email = normalizeEmail_(payload.email);
  const mobile = normalizePhone_(payload.mobile);
  const address = String(payload.address || "").trim();
  if (name.length < 2) throw new Error("Enter the customer's full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (mobile.length < 7 || mobile.length > 15) throw new Error("Enter a valid mobile number.");
  if (address.length < 5) throw new Error("Enter a complete delivery address.");
}

function createOrder_(payload) {
  validateCustomer_(payload);
  const catalog = productMap_();
  const items = validateAndPriceItems_(payload.items, catalog);
  const submittedAt = new Date();
  const signature = orderSignature_(payload, items);
  const duplicate = findLikelyDuplicate_(signature, submittedAt);
  const orderNumber = nextOrderNumber_();
  const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const status = duplicate ? "Suspicious" : "New";

  appendCanonicalRow_(SHEETS.ORDERS, ORDER_HEADERS, {
    "Submitted At": submittedAt,
    "Order Number": orderNumber,
    "Customer Name": String(payload.name || "").trim(),
    Email: normalizeEmail_(payload.email),
    Mobile: String(payload.mobile || "").trim(),
    "Delivery Address": String(payload.address || "").trim(),
    "Total Quantity": totalQuantity,
    Subtotal: subtotal,
    Status: status,
    "Payment Status": "Pending",
    "Duplicate Check": duplicate ? "Possible duplicate of " + duplicate : "Clear",
    "Inventory State": "NONE",
    Notes: String(payload.notes || "").trim(),
    "Order Signature": signature
  });

  items.forEach(item => appendCanonicalRow_(SHEETS.ITEMS, ITEM_HEADERS, {
    "Submitted At": submittedAt,
    "Order Number": orderNumber,
    "Product ID": item.productId,
    SKU: item.sku,
    "Product Name": item.name,
    Color: item.color,
    Size: item.size,
    Quantity: item.qty,
    "Unit Price": item.price,
    "Line Total": item.lineTotal
  }));

  rebuildCustomers_();
  rebuildDashboardSheet_();
  return { ok: true, orderNumber, totalQuantity, subtotal, possibleDuplicate: Boolean(duplicate) };
}

function orderSignature_(payload, items) {
  const normalizedItems = items.map(item => item.sku + "|" + item.qty).sort().join(";");
  return [normalizeEmail_(payload.email), normalizePhone_(payload.mobile), normalizedItems].join("::");
}

function findLikelyDuplicate_(signature, submittedAt) {
  const cutoff = submittedAt.getTime() - DUPLICATE_WINDOW_MINUTES * 60 * 1000;
  const orders = rowsAsCanonicalObjects_(SHEETS.ORDERS, ORDER_HEADERS, false);
  for (let index = orders.length - 1; index >= 0; index -= 1) {
    const order = orders[index];
    const time = new Date(order["Submitted At"]).getTime();
    if (Number.isFinite(time) && time < cutoff) break;
    if (String(order["Order Signature"] || "") === signature) return String(order["Order Number"] || "");
  }
  return "";
}

function updateOrderStatus_(orderNumberValue, newStatusValue, oldStatusValue, sheetAlreadyEdited) {
  const orderNumber = String(orderNumberValue || "").trim();
  const newStatus = String(newStatusValue || "").trim();
  if (!orderNumber) throw new Error("Order number is required.");
  if (!ORDER_STATUSES.includes(newStatus)) throw new Error("Invalid order status.");
  const row = findRowByCanonicalValue_(SHEETS.ORDERS, "Order Number", orderNumber);
  if (!row) throw new Error("Order not found: " + orderNumber);

  const orderRows = rowsAsCanonicalObjects_(SHEETS.ORDERS, ORDER_HEADERS, false);
  const order = orderRows[row - 2];
  const oldStatus = String(oldStatusValue || order.Status || "New").trim();
  if (newStatus === oldStatus) return { ok: true, orderNumber, status: newStatus };
  const allowed = ALLOWED_TRANSITIONS[oldStatus] || [];
  if (!allowed.includes(newStatus)) throw new Error("Invalid status change: " + oldStatus + " → " + newStatus + ".");

  const currentState = String(order["Inventory State"] || "NONE").trim();
  const targetState = inventoryStateForStatus_(newStatus);
  if (currentState === "SOLD" && targetState !== "SOLD") throw new Error("Stock has already been deducted. Process a return separately.");
  if (currentState !== targetState) {
    const items = orderItemsForInventory_(orderNumber);
    if (!items.length) throw new Error("No order items were found for " + orderNumber + ".");
    changeInventoryState_(items, currentState, targetState);
  }

  writeCanonicalObject_(SHEETS.ORDERS, ORDER_HEADERS, row, {
    Status: newStatus,
    "Inventory State": targetState
  });
  rebuildCustomers_();
  rebuildDashboardSheet_();
  return { ok: true, orderNumber, status: newStatus, inventoryState: targetState };
}

function updatePaymentStatus_(orderNumberValue, paymentStatusValue) {
  const orderNumber = String(orderNumberValue || "").trim();
  const paymentStatus = String(paymentStatusValue || "").trim();
  if (!PAYMENT_STATUSES.includes(paymentStatus)) throw new Error("Invalid payment status.");
  const row = findRowByCanonicalValue_(SHEETS.ORDERS, "Order Number", orderNumber);
  if (!row) throw new Error("Order not found: " + orderNumber);
  writeCanonicalObject_(SHEETS.ORDERS, ORDER_HEADERS, row, { "Payment Status": paymentStatus });
  rebuildCustomers_();
  rebuildDashboardSheet_();
  return { ok: true, orderNumber, paymentStatus };
}

function serializeOrder_(row) {
  return {
    submittedAt: row["Submitted At"] instanceof Date ? row["Submitted At"].toISOString() : String(row["Submitted At"] || ""),
    orderNumber: String(row["Order Number"] || "").trim(),
    customerName: String(row["Customer Name"] || "").trim(),
    email: normalizeEmail_(row.Email),
    mobile: String(row.Mobile || "").trim(),
    address: String(row["Delivery Address"] || "").trim(),
    totalQuantity: Math.max(0, Math.floor(parseNumber_(row["Total Quantity"], 0))),
    subtotal: Math.max(0, parseNumber_(row.Subtotal, 0)),
    status: String(row.Status || "New").trim(),
    paymentStatus: String(row["Payment Status"] || "Pending").trim(),
    duplicateCheck: String(row["Duplicate Check"] || "").trim(),
    inventoryState: String(row["Inventory State"] || "NONE").trim(),
    notes: String(row.Notes || "").trim()
  };
}

function adminOrdersResponse_() {
  return { ok: true, orders: rowsAsCanonicalObjects_(SHEETS.ORDERS, ORDER_HEADERS, false).map(serializeOrder_).reverse() };
}
/** Customer rollup generated from canonical order data. */

function rebuildCustomers_() {
  const orders = rowsAsCanonicalObjects_(SHEETS.ORDERS, ORDER_HEADERS, false).map(serializeOrder_);
  const customers = {};
  orders.forEach(order => {
    if (!order.email) return;
    if (!customers[order.email]) customers[order.email] = {
      email: order.email,
      name: order.customerName,
      mobile: order.mobile,
      orders: 0,
      lifetimeSpend: 0,
      lastOrder: ""
    };
    const customer = customers[order.email];
    customer.orders += 1;
    if (order.paymentStatus === "Paid") customer.lifetimeSpend += order.subtotal;
    if (!customer.lastOrder || new Date(order.submittedAt).getTime() > new Date(customer.lastOrder).getTime()) {
      customer.lastOrder = order.submittedAt;
      customer.name = order.customerName || customer.name;
      customer.mobile = order.mobile || customer.mobile;
    }
  });

  const sheet = sheet_(SHEETS.CUSTOMERS);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, CUSTOMER_HEADERS.length).clearContent();
  const rows = Object.values(customers).sort((a, b) => b.lifetimeSpend - a.lifetimeSpend).map(customer => [
    customer.email, customer.name, customer.mobile, customer.orders, customer.lifetimeSpend,
    customer.lastOrder ? new Date(customer.lastOrder) : ""
  ]);
  if (rows.length) sheet.getRange(2, 1, rows.length, CUSTOMER_HEADERS.length).setValues(rows);
  return rows.length;
}

function adminCustomersResponse_() {
  return {
    ok: true,
    customers: rowsAsCanonicalObjects_(SHEETS.CUSTOMERS, CUSTOMER_HEADERS, false).map(row => ({
      email: normalizeEmail_(row.Email),
      name: String(row["Customer Name"] || "").trim(),
      mobile: String(row.Mobile || "").trim(),
      orders: Math.max(0, Math.floor(parseNumber_(row.Orders, 0))),
      lifetimeSpend: Math.max(0, parseNumber_(row["Lifetime Spend"], 0)),
      lastOrder: row["Last Order"] instanceof Date ? row["Last Order"].toISOString() : String(row["Last Order"] || "")
    }))
  };
}
/** Dashboard calculations that never depend on spreadsheet formulas. */

function dashboardData_() {
  const orders = rowsAsCanonicalObjects_(SHEETS.ORDERS, ORDER_HEADERS, false).map(serializeOrder_);
  const inventory = adminInventoryResponse_().inventory;
  const byStatus = {};
  ORDER_STATUSES.forEach(status => { byStatus[status] = 0; });
  let paidRevenue = 0;
  orders.forEach(order => {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    if (order.paymentStatus === "Paid") paidRevenue += order.subtotal;
  });
  return {
    totalOrders: orders.length,
    paidRevenue,
    totalStock: inventory.reduce((sum, item) => sum + item.stock, 0),
    reserved: inventory.reduce((sum, item) => sum + item.reserved, 0),
    available: inventory.reduce((sum, item) => sum + item.available, 0),
    lowStock: inventory.filter(item => item.available >= 0 && item.available <= LOW_STOCK_THRESHOLD).length,
    outOfStock: inventory.filter(item => item.available === 0).length,
    byStatus
  };
}

function rebuildDashboardSheet_() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(SHEETS.DASHBOARD) || spreadsheet.insertSheet(SHEETS.DASHBOARD);
  const data = dashboardData_();
  sheet.clear();
  sheet.getRange("A1:B1").merge().setValue("MIST ORDER DASHBOARD")
    .setFontWeight("bold").setFontSize(16).setBackground("#111111").setFontColor("#ffffff")
    .setHorizontalAlignment("center");
  const rows = [
    ["Metric", "Value"],
    ["Total Orders", data.totalOrders],
    ["New", data.byStatus.New || 0],
    ["Suspicious", data.byStatus.Suspicious || 0],
    ["Confirmed", data.byStatus.Confirmed || 0],
    ["Packed", data.byStatus.Packed || 0],
    ["Shipped", data.byStatus.Shipped || 0],
    ["Delivered", data.byStatus.Delivered || 0],
    ["Cancelled", data.byStatus.Cancelled || 0],
    ["Paid Revenue", data.paidRevenue],
    ["Low Stock SKUs", data.lowStock],
    ["Out of Stock SKUs", data.outOfStock],
    ["Total Stock Units", data.totalStock],
    ["Reserved Units", data.reserved],
    ["Available Units", data.available]
  ];
  sheet.getRange(3, 1, rows.length, 2).setValues(rows);
  sheet.getRange("A3:B3").setFontWeight("bold").setBackground("#eeeeee");
  sheet.getRange("B12").setNumberFormat('₱#,##0.00');
  sheet.setColumnWidth(1, 210);
  sheet.setColumnWidth(2, 160);
  return data;
}

function rebuildDashboardSheet() {
  return rebuildDashboardSheet_();
}
/** Public storefront API and private admin API. */

function doGet(event) {
  try {
    const action = String(event && event.parameter && event.parameter.action || "health").trim().toLowerCase();
    if (action === "catalog") return json_(publicCatalogResponse_());
    if (action === "settings") return json_({ ok: true, settings: settingsObject_() });
    return json_({ ok: true, message: "MIST OS API is running.", version: MIST_OS_VERSION, schema: SCHEMA_VERSION });
  } catch (error) {
    logError_("doGet", "", error, "");
    return json_({ ok: false, error: errorMessage_(error) });
  }
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const payload = parsePayload_(event);
    const action = String(payload.action || "createOrder").trim();
    if (action === "createOrder") return json_(createOrder_(payload));

    requireAdmin_(payload.adminKey);
    if (action === "dashboard") return json_({ ok: true, dashboard: dashboardData_() });
    if (action === "orders") return json_(adminOrdersResponse_());
    if (action === "products") return json_(adminProductsResponse_());
    if (action === "inventory") return json_(adminInventoryResponse_());
    if (action === "customers") return json_(adminCustomersResponse_());
    if (action === "websiteSettings") return json_({ ok: true, settings: settingsObject_() });
    if (action === "updateOrderStatus") return json_(updateOrderStatus_(payload.orderNumber, payload.status));
    if (action === "updatePaymentStatus") return json_(updatePaymentStatus_(payload.orderNumber, payload.paymentStatus));
    if (action === "saveProduct") return json_(saveProduct_(payload.product));
    if (action === "saveCatalogEntry") return json_(saveCatalogEntry_(payload.entry));
    if (action === "updateStock") return json_(updateStock_(payload.sku, payload.stock));
    if (action === "saveSetting") return json_(saveSetting_(payload.key, payload.value));
    if (action === "syncInventory") return json_({ ok: true, added: syncInventoryFromProducts_() });
    if (action === "rebuildCustomers") return json_({ ok: true, customers: rebuildCustomers_() });
    if (action === "rebuildDashboard") return json_({ ok: true, dashboard: rebuildDashboardSheet_() });
    if (action === "systemCheck") return json_({ ok: true, system: runSystemCheck() });
    throw new Error("Unknown action: " + action);
  } catch (error) {
    logError_("doPost", "", error, event && event.postData ? event.postData.contents : "");
    return json_({ ok: false, error: errorMessage_(error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}
