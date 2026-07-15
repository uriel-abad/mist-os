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
