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

function onEdit(event) {
  if (!event || !event.range) return;
  const sheet = event.range.getSheet();
  const sheetName = sheet.getName();

  if (sheetName === SHEETS.INVENTORY && event.range.getRow() >= 2) {
    const headers = currentHeaders_(sheet);
    const stockColumn = findHeaderIndex_(headers, "Stock") + 1;
    const reservedColumn = findHeaderIndex_(headers, "Reserved") + 1;
    const availableColumn = findHeaderIndex_(headers, "Available") + 1;
    const skuColumn = findHeaderIndex_(headers, "SKU") + 1;
    if (event.range.getColumn() === reservedColumn || event.range.getColumn() === availableColumn) {
      event.range.setValue(typeof event.oldValue === "undefined" ? 0 : event.oldValue);
      event.source.toast("Reserved and Available are managed automatically. Edit Stock only.", "MIST OS", 7);
      return;
    }
    if (event.range.getColumn() === stockColumn) {
      try {
        const sku = sheet.getRange(event.range.getRow(), skuColumn).getDisplayValue();
        updateStock_(sku, event.value);
      } catch (error) {
        event.range.setValue(typeof event.oldValue === "undefined" ? 0 : event.oldValue);
        event.source.toast(errorMessage_(error), "MIST OS inventory", 8);
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
