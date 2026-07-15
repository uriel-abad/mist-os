"use strict";
window.MIST = window.MIST || {};
MIST.ui = (() => {
  const elements = {
    productGrid: document.getElementById("product-grid"), orderPanel: document.getElementById("order-panel"),
    navCount: document.getElementById("nav-count"), submitButton: document.getElementById("submit-order"),
    summaryLines: document.getElementById("summary-lines"), orderForm: document.getElementById("order-form"),
    toast: document.getElementById("toast"), menuToggle: document.getElementById("menuToggle"),
    navLinks: document.querySelector(".nav-links"), helpMessengerLink: document.getElementById("help-messenger-link"),
    orderNumberResult: document.getElementById("order-number-result"), catalogStatus: document.getElementById("catalog-status")
  };
  let toastTimer;
  function showToast(message, duration = 2600) {
    elements.toast.textContent = String(message || ""); elements.toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => elements.toast.classList.remove("show"), duration);
  }
  function setCatalogStatus(message, type = "") {
    if (!elements.catalogStatus) return;
    elements.catalogStatus.hidden = !message;
    elements.catalogStatus.className = `status-banner ${type}`.trim();
    elements.catalogStatus.textContent = message || "";
  }
  function renderLoading() { elements.productGrid.innerHTML = '<p class="catalogue-message">Loading products…</p>'; }
  function renderEmpty() { elements.productGrid.innerHTML = '<p class="catalogue-message">No active products are currently available.</p>'; }
  function renderLoadError(message) { elements.productGrid.innerHTML = `<div class="catalogue-message catalogue-error"><strong>Products could not be loaded.</strong><br>${MIST.utils.escapeHtml(message || "Please refresh and try again.")}</div>`; }
  function imageError(event) { event.currentTarget.classList.add("image-fallback"); event.currentTarget.removeAttribute("src"); event.currentTarget.alt = "Product image unavailable"; }
  function productCard(product, selection) {
    const images = product.colors[selection.color];
    const colorButtons = Object.keys(product.colors).map(name => `<button type="button" class="color-btn ${name === selection.color ? "active" : ""}" data-action="select-color" data-product-id="${MIST.utils.escapeHtml(product.id)}" data-color="${MIST.utils.escapeHtml(name)}" aria-pressed="${name === selection.color}">${MIST.utils.escapeHtml(name)}</button>`).join("");
    const sizeButtons = product.sizes.map(size => `<button type="button" class="size-btn ${size === selection.size ? "active" : ""}" data-action="select-size" data-product-id="${MIST.utils.escapeHtml(product.id)}" data-size="${MIST.utils.escapeHtml(size)}" aria-pressed="${size === selection.size}">${MIST.utils.escapeHtml(size)}</button>`).join("");
    return `<article class="card" data-product-id="${MIST.utils.escapeHtml(product.id)}"><div class="card-img">${product.badge ? `<span class="badge">${MIST.utils.escapeHtml(product.badge)}</span>` : ""}<img class="img-front" src="${MIST.utils.escapeHtml(images.front)}" alt="${MIST.utils.escapeHtml(product.name)} in ${MIST.utils.escapeHtml(selection.color)}, front view"><img class="img-back" src="${MIST.utils.escapeHtml(images.back)}" alt="${MIST.utils.escapeHtml(product.name)} in ${MIST.utils.escapeHtml(selection.color)}, back view"><button type="button" class="quick-add" data-action="add-to-order" data-product-id="${MIST.utils.escapeHtml(product.id)}">Add to Order</button></div><div class="card-body"><div class="card-body-top"><h3>${MIST.utils.escapeHtml(product.name)}</h3><div class="price">${MIST.utils.money(product.price)}</div></div>${product.description ? `<p class="product-description">${MIST.utils.escapeHtml(product.description)}</p>` : ""}<div class="colors" aria-label="Choose a color">${colorButtons}</div><div class="sizes" aria-label="Choose a size">${sizeButtons}</div></div></article>`;
  }
  function renderProducts(products, selections) {
    if (!products.length) return renderEmpty();
    elements.productGrid.innerHTML = products.map(product => productCard(product, selections[product.id])).join("");
    elements.productGrid.querySelectorAll("img").forEach(image => image.addEventListener("error", imageError, { once: true }));
  }
  function updateProductSelection(product, selection) {
    const card = elements.productGrid.querySelector(`[data-product-id="${CSS.escape(product.id)}"]`); if (!card) return;
    const images = product.colors[selection.color];
    [[".img-front", images.front, "front"], [".img-back", images.back, "back"]].forEach(([selector, source, view]) => { const image = card.querySelector(selector); image.src = source; image.alt = `${product.name} in ${selection.color}, ${view} view`; });
    card.querySelectorAll('[data-action="select-color"]').forEach(button => { const active = button.dataset.color === selection.color; button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active)); });
    card.querySelectorAll('[data-action="select-size"]').forEach(button => { const active = button.dataset.size === selection.size; button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active)); });
  }
  function setSubmitting(isSubmitting, text) { elements.submitButton.disabled = isSubmitting || MIST.cart.isEmpty(); elements.submitButton.classList.toggle("is-loading", isSubmitting); if (text) elements.submitButton.textContent = text; }
  return { elements, showToast, setCatalogStatus, renderLoading, renderEmpty, renderLoadError, renderProducts, updateProductSelection, setSubmitting };
})();
