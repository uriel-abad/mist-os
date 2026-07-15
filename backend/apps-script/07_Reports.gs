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
