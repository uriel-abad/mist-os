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
