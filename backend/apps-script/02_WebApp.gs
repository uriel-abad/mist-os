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
