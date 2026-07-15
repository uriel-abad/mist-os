"use strict";
window.MIST = window.MIST || {};
MIST.cart = (() => {
  let productsById = new Map();
  let items = [];
  let nextRowId = 1;

  function initialize(products) {
    productsById = new Map(products.map(product => [product.id, product]));
    items = [];
    nextRowId = 1;
    render();
  }

  function keyOf(item) { return `${item.productId}|${item.color}|${item.size}`; }
  function productFor(item) { return productsById.get(item.productId); }
  function mergeDuplicates() {
    const merged = new Map();
    items.forEach(item => {
      const key = keyOf(item);
      if (!merged.has(key)) merged.set(key, { ...item });
      else merged.get(key).qty += item.qty;
    });
    const changed = merged.size !== items.length;
    items = [...merged.values()];
    return changed;
  }

  function add(productId, color, size) {
    const product = productsById.get(productId);
    if (!product || !product.colors[color] || !product.sizes.includes(size)) throw new Error("Invalid product selection.");
    const existing = items.find(item => item.productId === productId && item.color === color && item.size === size);
    if (existing) { existing.qty += 1; render(); return { merged: true }; }
    items.push({ rowId: nextRowId++, productId, color, size, qty: 1 });
    render();
    return { merged: false };
  }

  function remove(rowId) { items = items.filter(item => item.rowId !== rowId); render(); }

  function update(control) {
    const rowId = Number(control.dataset.row);
    const item = items.find(entry => entry.rowId === rowId);
    if (!item) return { merged: false };
    const product = productFor(item);
    if (control.dataset.action === "cart-size" && product.sizes.includes(control.value)) item.size = control.value;
    if (control.dataset.action === "cart-color" && product.colors[control.value]) item.color = control.value;
    if (control.dataset.action === "cart-qty") item.qty = MIST.utils.positiveInteger(control.value, 1);
    const merged = mergeDuplicates();
    render();
    return { merged };
  }

  function subtotal() { return items.reduce((sum, item) => { const product = productFor(item); return sum + (product ? product.price * item.qty : 0); }, 0); }
  function isEmpty() { return items.length === 0; }
  function clear() { items = []; render(); }

  function skuFor(product, color, size) {
    if (!product || !product.productCode || !product.colors[color]) return "";
    const colorCode = String(product.colors[color].code || "").trim().toUpperCase();
    return colorCode ? `${product.productCode}-${colorCode}-${size}`.toUpperCase() : "";
  }

  function payloadItems() {
    return items.map(item => {
      const product = productFor(item);
      const sku = skuFor(product, item.color, item.size);
      if (!sku) throw new Error(`Missing SKU mapping for ${product ? product.name : item.productId}.`);
      return { sku, qty: item.qty, name: product.name, color: item.color, size: item.size, unitPrice: product.price, lineTotal: product.price * item.qty };
    });
  }

  function render() {
    const { elements } = MIST.ui;
    elements.navCount.textContent = items.reduce((sum, item) => sum + item.qty, 0);
    if (!items.length) {
      elements.orderPanel.innerHTML = '<div class="order-empty"><p>Your Shopping Bag is empty.</p><a href="#catalogue" class="btn outline">Browse products</a></div>';
      elements.summaryLines.innerHTML = '<p class="summary-empty">Add products first</p>';
      elements.submitButton.disabled = true;
      return;
    }
    const rows = items.map(item => {
      const product = productFor(item);
      if (!product) return "";
      const image = product.colors[item.color].front;
      const sizeOptions = product.sizes.map(size => `<option value="${MIST.utils.escapeHtml(size)}" ${size === item.size ? "selected" : ""}>${MIST.utils.escapeHtml(size)}</option>`).join("");
      const colorOptions = Object.keys(product.colors).map(color => `<option value="${MIST.utils.escapeHtml(color)}" ${color === item.color ? "selected" : ""}>${MIST.utils.escapeHtml(color)}</option>`).join("");
      return `<div class="order-row order-cols"><img src="${MIST.utils.escapeHtml(image)}" alt="${MIST.utils.escapeHtml(product.name)}"><div class="order-item-name">${MIST.utils.escapeHtml(product.name)}<div class="order-item-price">${MIST.utils.money(product.price)}</div></div><div class="field-size"><select class="order-select" data-action="cart-size" data-row="${item.rowId}" aria-label="Size">${sizeOptions}</select></div><div class="field-colour"><select class="order-select" data-action="cart-color" data-row="${item.rowId}" aria-label="Colour">${colorOptions}</select></div><div class="field-qty"><input type="number" min="1" step="1" inputmode="numeric" class="qty-input" data-action="cart-qty" data-row="${item.rowId}" value="${item.qty}" aria-label="Quantity"></div><div class="price-remove"><span class="line-total">${MIST.utils.money(product.price * item.qty)}</span><button type="button" class="remove-btn" data-action="cart-remove" data-row="${item.rowId}">Remove</button></div></div>`;
    }).join("");
    elements.orderPanel.innerHTML = `<div class="order-cols order-header"><div></div><div></div><div class="col-label">Size</div><div class="col-label">Colour</div><div class="col-label">Qty</div><div></div></div>${rows}<div class="order-summary-block"><div class="order-summary-row"><span>Estimated product subtotal</span><span class="sub-amt">${MIST.utils.money(subtotal())}</span></div><p class="shipping-note">Shipping is calculated after we confirm your location and stock.</p><a href="#order" class="btn continue-btn">Continue to your details</a></div>`;
    elements.summaryLines.innerHTML = items.map(item => { const product = productFor(item); return `<div class="summary-line"><span>${MIST.utils.escapeHtml(product.name)} (${MIST.utils.escapeHtml(item.size)}, ${MIST.utils.escapeHtml(item.color)}) × ${item.qty}</span><span>${MIST.utils.money(product.price * item.qty)}</span></div>`; }).join("") + `<div class="summary-line summary-total"><span>Estimated subtotal</span><span>${MIST.utils.money(subtotal())}</span></div>`;
    elements.submitButton.disabled = false;
  }

  function snapshot() { return items.map(item => ({ ...item })); }
  return { initialize, add, remove, update, subtotal, payloadItems, clear, isEmpty, snapshot };
})();
