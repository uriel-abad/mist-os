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
