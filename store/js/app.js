"use strict";
window.MIST = window.MIST || {};
MIST.app = (() => {
  const state = { products: [], productsById: new Map(), selections: {} };

  function applySettings(settings) {
    const values = settings || {};
    const textMap = [
      [".marquee-bar", "announcement_text"], [".hero .eyebrow", "hero_eyebrow"],
      [".hero h1", "hero_title"], [".hero p", "hero_subtitle"], [".hero .btn", "hero_button"],
      ["header .logo", "store_name"], ["footer .footer-brand .logo", "store_name"]
    ];
    textMap.forEach(([selector, key]) => { const element = document.querySelector(selector); if (element && values[key]) element.textContent = values[key]; });
    if (values.messenger_username) MIST.config.messengerUsername = String(values.messenger_username).replace(/^@/, "");
    const instagram = String(values.instagram_username || "").replace(/^@/, "");
    const link = document.getElementById("instagram-link");
    if (link && instagram) link.href = `https://www.instagram.com/${encodeURIComponent(instagram)}/`;
  }

  function prepareProducts(rawProducts) {
    const products = rawProducts.map(MIST.utils.normalizeProduct).filter(product => product.id && product.name && product.sizes.length && Object.keys(product.colors).length && Number.isFinite(product.price));
    const uniqueIds = new Set();
    products.forEach(product => { if (uniqueIds.has(product.id)) throw new Error(`Duplicate product ID: ${product.id}`); uniqueIds.add(product.id); });
    state.products = products;
    state.productsById = new Map(products.map(product => [product.id, product]));
    state.selections = {};
    products.forEach(product => {
      const colors = Object.keys(product.colors);
      state.selections[product.id] = { color: product.colors[product.defaultColor] ? product.defaultColor : colors[0], size: null };
    });
  }

  function handleProductClick(event) {
    const button = event.target.closest("[data-action][data-product-id]");
    if (!button) return;
    const product = state.productsById.get(button.dataset.productId);
    const selection = state.selections[button.dataset.productId];
    if (!product || !selection) return;
    if (button.dataset.action === "select-color" && product.colors[button.dataset.color]) selection.color = button.dataset.color;
    if (button.dataset.action === "select-size" && product.sizes.includes(button.dataset.size)) selection.size = button.dataset.size;
    if (button.dataset.action === "add-to-order") {
      if (!selection.size) return MIST.ui.showToast("Select a size first");
      try { const result = MIST.cart.add(product.id, selection.color, selection.size); MIST.ui.showToast(result.merged ? "Quantity updated in your Shopping Bag" : "Added to your Shopping Bag"); } catch (error) { MIST.ui.showToast(error.message); }
      return;
    }
    MIST.ui.updateProductSelection(product, selection);
  }

  function validateForm() {
    const form = MIST.ui.elements.orderForm;
    form.querySelectorAll(".field-error").forEach(element => element.remove());
    form.querySelectorAll(".input-invalid").forEach(element => element.classList.remove("input-invalid"));
    if (!form.reportValidity()) return false;
    const mobile = document.getElementById("f-mobile");
    if (String(mobile.value).replace(/\D/g, "").length < 7) {
      mobile.classList.add("input-invalid"); mobile.insertAdjacentHTML("afterend", '<div class="field-error">Enter a valid mobile number.</div>'); mobile.focus(); return false;
    }
    return true;
  }

  function orderPayload() {
    return {
      name: document.getElementById("f-name").value.trim(), mobile: document.getElementById("f-mobile").value.trim(),
      email: document.getElementById("f-email").value.trim(), address: document.getElementById("f-address").value.trim(),
      notes: document.getElementById("f-notes").value.trim(), items: MIST.cart.payloadItems()
    };
  }

  function messageFor(payload, result) {
    const lines = payload.items.map(item => `• ${item.name} — ${item.color}, size ${item.size} × ${item.qty} (${MIST.utils.money(item.lineTotal)})`).join("\n");
    return `New order request — MIST\n\nOrder Number: ${result.orderNumber}\nName: ${payload.name}\nMobile: ${payload.mobile}\nEmail: ${payload.email}\nAddress: ${payload.address}\n\nItems:\n${lines}\n\nEstimated subtotal: ${MIST.utils.money(result.subtotal)}\nNotes: ${payload.notes || "—"}\n\nNo payment yet — please confirm stock and shipping first.`;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const field = document.createElement("textarea"); field.value = text; field.readOnly = true; field.style.position = "fixed"; field.style.opacity = "0"; document.body.appendChild(field); field.select();
    const copied = document.execCommand("copy"); field.remove(); if (!copied) throw new Error("Clipboard is unavailable.");
  }

  function messengerUrl(username) { return `https://m.me/${encodeURIComponent(username)}`; }
  function openMessenger(username) {
    const fallback = messengerUrl(username);
    if (/Android/i.test(navigator.userAgent)) { window.location.href = `intent://user/${encodeURIComponent(username)}#Intent;scheme=fb-messenger;package=com.facebook.orca;S.browser_fallback_url=${encodeURIComponent(fallback)};end`; return; }
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) { window.location.href = fallback; return; }
    const opened = window.open(fallback, "_blank", "noopener,noreferrer"); if (!opened) window.location.assign(fallback);
  }

  async function sendOrder() {
    const button = MIST.ui.elements.submitButton;
    if (!validateForm() || MIST.cart.isEmpty()) return;
    const username = String(MIST.config.messengerUsername || "").trim().replace(/^@/, "");
    if (!username) return MIST.ui.showToast("Messenger username is missing.");
    const originalText = button.textContent;
    MIST.ui.setSubmitting(true, "Creating order number…");
    try {
      const payload = orderPayload();
      const result = await MIST.api.createOrder(payload);
      const message = messageFor(payload, result);
      try { await copyText(message); } catch (error) { console.warn(error); }
      MIST.ui.elements.orderNumberResult.hidden = false;
      MIST.ui.elements.orderNumberResult.innerHTML = `<strong>Order Number</strong><span>${MIST.utils.escapeHtml(result.orderNumber)}</span><small>Use this number when following up in Messenger.</small>`;
      MIST.ui.showToast(`Order ${result.orderNumber} created and copied.`);
      MIST.cart.clear(); MIST.ui.elements.orderForm.reset(); openMessenger(username);
    } catch (error) {
      console.error(error); MIST.ui.showToast(error.message || "Order submission failed.", 4200);
    } finally { button.textContent = originalText; MIST.ui.setSubmitting(false); }
  }

  function bindNavigation() {
    const nav = document.querySelector("header.site-nav");
    const update = () => document.documentElement.style.setProperty("--site-nav-height", `${Math.ceil(nav?.getBoundingClientRect().height || 0)}px`);
    update(); window.addEventListener("resize", update, { passive: true });
    document.addEventListener("click", event => {
      const link = event.target.closest('a[href^="#"]'); if (!link) return;
      const targetId = link.getAttribute("href"); if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId); if (!target) return;
      event.preventDefault(); MIST.ui.elements.navLinks.classList.remove("mobile-open");
      const top = target.getBoundingClientRect().top + window.scrollY - (nav?.getBoundingClientRect().height || 0) - 16;
      history.pushState(null, "", targetId); window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }

  function bindEvents() {
    const elements = MIST.ui.elements;
    elements.productGrid.addEventListener("click", handleProductClick);
    elements.orderPanel.addEventListener("change", event => { const control = event.target.closest('[data-action^="cart-"]'); if (control) { const result = MIST.cart.update(control); if (result.merged) MIST.ui.showToast("Matching variants were combined."); } });
    elements.orderPanel.addEventListener("click", event => { const button = event.target.closest('[data-action="cart-remove"]'); if (button) MIST.cart.remove(Number(button.dataset.row)); });
    elements.submitButton.addEventListener("click", sendOrder);
    elements.menuToggle.addEventListener("click", () => elements.navLinks.classList.toggle("mobile-open"));
  }

  async function initialize() {
    bindNavigation(); bindEvents(); MIST.ui.renderLoading();
    try {
      const response = await MIST.api.getCatalog(); applySettings(response.settings); prepareProducts(response.products);
      MIST.ui.renderProducts(state.products, state.selections); MIST.cart.initialize(state.products);
      if (response.source === "fallback") MIST.ui.setCatalogStatus("Live catalog unavailable. Showing the local backup catalog.", "error");
      const username = String(MIST.config.messengerUsername || "").replace(/^@/, "");
      if (username) { MIST.ui.elements.helpMessengerLink.href = messengerUrl(username); MIST.ui.elements.helpMessengerLink.target = "_blank"; MIST.ui.elements.helpMessengerLink.rel = "noopener noreferrer"; }
    } catch (error) { console.error(error); MIST.ui.renderLoadError(error.message); }
  }
  return { initialize };
})();
document.addEventListener("DOMContentLoaded", MIST.app.initialize);
