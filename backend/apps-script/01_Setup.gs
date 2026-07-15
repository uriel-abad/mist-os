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

  SpreadsheetApp.flush();
  return {
    ok: true,
    version: MIST_OS_VERSION,
    schema: SCHEMA_VERSION,
    adminKey,
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
