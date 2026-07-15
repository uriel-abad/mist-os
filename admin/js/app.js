"use strict";
window.MIST_ADMIN = window.MIST_ADMIN || {};
MIST_ADMIN.app = (() => {
  const state = { orders: [], products: [], catalog: [], activeView: "dashboard" };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const statuses = ["New", "Suspicious", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled", "Duplicate"];
  const payments = ["Pending", "Paid", "COD", "Refunded"];
  let toastTimer;

  function toast(message, duration = 3000) { const element = $("#toast"); element.textContent = message; element.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, duration); }
  function notice(message, type = "") { const element = $("#pageNotice"); element.hidden = !message; element.className = `notice ${type}`.trim(); element.textContent = message || ""; }
  function empty(columns, message) { return `<tr><td colspan="${columns}" class="empty-row">${MIST_ADMIN.utils.escape(message)}</td></tr>`; }
  function setBusy(isBusy) { document.querySelector("main").classList.toggle("loading", isBusy); $("#refreshBtn").disabled = isBusy; }

  function setView(name) {
    state.activeView = name;
    $$(".view").forEach(view => view.classList.toggle("active", view.id === `${name}View`));
    $$(".nav").forEach(button => button.classList.toggle("active", button.dataset.view === name));
    $("#pageTitle").textContent = name.charAt(0).toUpperCase() + name.slice(1);
    notice("");
    if (MIST_ADMIN.api.configured()) loadView(name);
  }

  async function loadView(name) {
    setBusy(true);
    try {
      $("#statusText").textContent = "Connected";
      if (name === "dashboard") renderDashboard((await MIST_ADMIN.api.request("dashboard")).dashboard);
      if (name === "orders") { state.orders = (await MIST_ADMIN.api.request("orders")).orders || []; renderOrders(); }
      if (name === "products") { const result = await MIST_ADMIN.api.request("products"); state.products = result.products || []; state.catalog = result.catalog || []; renderProducts(); renderCatalog(); }
      if (name === "inventory") renderInventory((await MIST_ADMIN.api.request("inventory")).inventory || []);
      if (name === "customers") renderCustomers((await MIST_ADMIN.api.request("customers")).customers || []);
      if (name === "website") renderWebsiteSettings((await MIST_ADMIN.api.request("websiteSettings")).settings || {});
      notice("");
    } catch (error) {
      $("#statusText").textContent = "Connection error"; notice(error.message || "Request failed.", "error"); toast(error.message || "Request failed.", 4500);
    } finally { setBusy(false); }
  }

  function renderDashboard(data = {}) {
    const cards = [
      ["Total orders", data.totalOrders], ["Paid revenue", MIST_ADMIN.utils.money(data.paidRevenue)],
      ["Available units", data.available], ["Low stock SKUs", data.lowStock], ["Out of stock", data.outOfStock],
      ["Reserved units", data.reserved], ["Total stock", data.totalStock]
    ];
    $("#cards").innerHTML = cards.map(([label, value]) => `<div class="card"><div class="label">${MIST_ADMIN.utils.escape(label)}</div><div class="value">${MIST_ADMIN.utils.escape(value ?? 0)}</div></div>`).join("");
    $("#statusGrid").innerHTML = Object.entries(data.byStatus || {}).map(([status, count]) => `<div class="status-item"><span>${MIST_ADMIN.utils.escape(status)}</span><strong>${MIST_ADMIN.utils.escape(count)}</strong></div>`).join("") || '<p class="help">No order data yet.</p>';
  }

  function renderOrders() {
    const query = $("#orderSearch").value.toLowerCase(); const filter = $("#statusFilter").value;
    const rows = state.orders.filter(order => (!filter || order.status === filter) && (!query || [order.orderNumber, order.customerName, order.email, order.mobile].join(" ").toLowerCase().includes(query)));
    $("#ordersBody").innerHTML = rows.length ? rows.map(order => `<tr><td>${MIST_ADMIN.utils.escape(order.orderNumber)}</td><td>${MIST_ADMIN.utils.escape(order.customerName)}<br><small>${MIST_ADMIN.utils.escape(order.email)}</small></td><td>${MIST_ADMIN.utils.money(order.subtotal)}</td><td><select class="status-select" data-order="${MIST_ADMIN.utils.escape(order.orderNumber)}">${statuses.map(status => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></td><td><select class="payment-select" data-order="${MIST_ADMIN.utils.escape(order.orderNumber)}">${payments.map(status => `<option value="${status}" ${status === order.paymentStatus ? "selected" : ""}>${status}</option>`).join("")}</select></td><td>${MIST_ADMIN.utils.date(order.submittedAt)}</td></tr>`).join("") : empty(6, "No matching orders.");
    $$(".status-select").forEach(element => element.addEventListener("change", async () => { try { await MIST_ADMIN.api.request("updateOrderStatus", { orderNumber: element.dataset.order, status: element.value }); toast("Order updated."); await loadView("orders"); } catch (error) { toast(error.message, 4500); await loadView("orders"); } }));
    $$(".payment-select").forEach(element => element.addEventListener("change", async () => { try { await MIST_ADMIN.api.request("updatePaymentStatus", { orderNumber: element.dataset.order, paymentStatus: element.value }); toast("Payment updated."); } catch (error) { toast(error.message, 4500); await loadView("orders"); } }));
  }

  function renderProducts() {
    $("#productsBody").innerHTML = state.products.length ? state.products.map(product => `<tr><td>${MIST_ADMIN.utils.escape(product.sku)}</td><td>${MIST_ADMIN.utils.escape(product.name)}</td><td>${MIST_ADMIN.utils.escape(product.color)}</td><td>${MIST_ADMIN.utils.escape(product.size)}</td><td>${MIST_ADMIN.utils.money(product.price)}</td><td><span class="badge-state">${product.active ? "Yes" : "No"}</span></td><td><button type="button" class="table-action edit-product" data-sku="${MIST_ADMIN.utils.escape(product.sku)}">Edit</button></td></tr>`).join("") : empty(7, "No products found.");
    $$(".edit-product").forEach(button => button.addEventListener("click", () => fillProductForm(button.dataset.sku)));
  }

  function renderCatalog() {
    $("#catalogBody").innerHTML = state.catalog.length ? state.catalog.map(entry => `<tr><td>${MIST_ADMIN.utils.escape(entry.name)}</td><td>${MIST_ADMIN.utils.escape(entry.color)}</td><td>${MIST_ADMIN.utils.escape(entry.badge)}</td><td>${MIST_ADMIN.utils.escape(entry.sortOrder)}</td><td>${entry.featured ? "Yes" : "No"}</td><td>${entry.active ? "Yes" : "No"}</td><td><button type="button" class="table-action edit-catalog" data-key="${MIST_ADMIN.utils.escape(entry.productId + "|" + entry.color)}">Edit</button></td></tr>`).join("") : empty(7, "No website showcase entries found.");
    $$(".edit-catalog").forEach(button => button.addEventListener("click", () => fillCatalogForm(button.dataset.key)));
  }

  function fillProductForm(sku) {
    const product = state.products.find(item => item.sku === sku); if (!product) return;
    const form = $("#productForm"); ["productId", "sku", "name", "color", "size", "price", "active"].forEach(name => { if (form.elements[name]) form.elements[name].value = name === "active" ? (product.active ? "Yes" : "No") : product[name]; });
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function fillCatalogForm(key) {
    const entry = state.catalog.find(item => `${item.productId}|${item.color}` === key); if (!entry) return;
    const form = $("#catalogForm"); const mapping = { productId:"productId", slug:"slug", name:"name", description:"description", badge:"badge", defaultColor:"defaultColor", color:"color", colorCode:"colorCode", frontImage:"frontImage", backImage:"backImage", sortOrder:"sortOrder" };
    Object.entries(mapping).forEach(([source, field]) => { form.elements[field].value = entry[source] ?? ""; });
    form.elements.featured.value = entry.featured ? "Yes" : "No"; form.elements.active.value = entry.active ? "Yes" : "No";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderInventory(rows) {
    $("#inventoryBody").innerHTML = rows.length ? rows.map(item => `<tr><td>${MIST_ADMIN.utils.escape(item.sku)}</td><td>${MIST_ADMIN.utils.escape(item.name)}</td><td>${MIST_ADMIN.utils.escape(item.color)}</td><td>${MIST_ADMIN.utils.escape(item.size)}</td><td><input class="stock-input" type="number" min="0" step="1" value="${Math.max(0, Math.floor(MIST_ADMIN.utils.toNumber(item.stock, 0)))}" data-sku="${MIST_ADMIN.utils.escape(item.sku)}"></td><td>${Math.max(0, MIST_ADMIN.utils.toNumber(item.reserved, 0))}</td><td>${Math.max(0, MIST_ADMIN.utils.toNumber(item.available, 0))}</td></tr>`).join("") : empty(7, "No inventory rows found.");
    $$(".stock-input").forEach(input => input.addEventListener("change", async () => { try { const stock = Math.floor(MIST_ADMIN.utils.toNumber(input.value, NaN)); if (!Number.isFinite(stock) || stock < 0) throw new Error("Stock must be zero or higher."); await MIST_ADMIN.api.request("updateStock", { sku: input.dataset.sku, stock }); toast("Stock updated."); await loadView("inventory"); } catch (error) { toast(error.message, 4500); await loadView("inventory"); } }));
  }

  function renderCustomers(rows) { $("#customersBody").innerHTML = rows.length ? rows.map(customer => `<tr><td>${MIST_ADMIN.utils.escape(customer.email)}</td><td>${MIST_ADMIN.utils.escape(customer.name)}</td><td>${MIST_ADMIN.utils.escape(customer.mobile)}</td><td>${MIST_ADMIN.utils.escape(customer.orders)}</td><td>${MIST_ADMIN.utils.money(customer.lifetimeSpend)}</td><td>${MIST_ADMIN.utils.date(customer.lastOrder)}</td></tr>`).join("") : empty(6, "No customers yet."); }
  function renderWebsiteSettings(settings) { const form = $("#websiteForm"); Object.entries(settings || {}).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ""; }); }

  async function connect(event) {
    event.preventDefault(); const data = new FormData(event.currentTarget); MIST_ADMIN.api.save(data.get("endpoint"), data.get("adminKey"));
    try { const result = await MIST_ADMIN.api.request("systemCheck"); if (!result.system?.ok) throw new Error("Connected, but the backend schema needs repair. Run setupMistOS()."); toast("Connection verified."); $("#statusText").textContent = "Connected"; setView("dashboard"); } catch (error) { notice(error.message, "error"); toast(error.message, 4500); }
  }

  function bindForms() {
    $("#settingsForm").addEventListener("submit", connect);
    $("#productForm").addEventListener("submit", async event => { event.preventDefault(); try { const product = Object.fromEntries(new FormData(event.currentTarget)); await MIST_ADMIN.api.request("saveProduct", { product }); toast("SKU saved."); event.currentTarget.reset(); await loadView("products"); } catch (error) { toast(error.message, 4500); } });
    $("#catalogForm").addEventListener("submit", async event => { event.preventDefault(); try { const entry = Object.fromEntries(new FormData(event.currentTarget)); await MIST_ADMIN.api.request("saveCatalogEntry", { entry }); toast("Showcase saved."); event.currentTarget.reset(); await loadView("products"); } catch (error) { toast(error.message, 4500); } });
    $("#websiteForm").addEventListener("submit", async event => { event.preventDefault(); try { const values = Object.fromEntries(new FormData(event.currentTarget)); for (const [key, value] of Object.entries(values)) await MIST_ADMIN.api.request("saveSetting", { key, value }); toast("Website settings saved."); } catch (error) { toast(error.message, 4500); } });
    $("#clearProductForm").addEventListener("click", () => $("#productForm").reset()); $("#clearCatalogForm").addEventListener("click", () => $("#catalogForm").reset());
  }

  function initialize() {
    statuses.forEach(status => $("#statusFilter").insertAdjacentHTML("beforeend", `<option value="${status}">${status}</option>`));
    $("#settingsForm").elements.endpoint.value = MIST_ADMIN.api.state.endpoint; $("#settingsForm").elements.adminKey.value = MIST_ADMIN.api.state.adminKey;
    $("#orderSearch").addEventListener("input", renderOrders); $("#statusFilter").addEventListener("change", renderOrders);
    $("#connectBtn").addEventListener("click", () => setView("settings")); $("#refreshBtn").addEventListener("click", () => loadView(state.activeView));
    $$(".nav").forEach(button => button.addEventListener("click", () => setView(button.dataset.view))); bindForms();
    if (MIST_ADMIN.api.configured()) loadView("dashboard"); else setView("settings");
  }
  return { initialize };
})();
document.addEventListener("DOMContentLoaded", MIST_ADMIN.app.initialize);
