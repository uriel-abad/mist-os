"use strict";
window.MIST = window.MIST || {};
MIST.utils = (() => {
  function toNumber(value, fallback = 0) {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
    if (value === null || value === undefined || value === "") return fallback;
    const cleaned = String(value).replace(/\s/g, "").replace(/₱|PHP/gi, "").replace(/,/g, "").replace(/[^0-9.+-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function positiveInteger(value, fallback = 1) {
    const parsed = Math.floor(toNumber(value, fallback));
    return parsed >= 1 ? parsed : fallback;
  }
  function money(value) {
    const amount = Math.max(0, toNumber(value, 0));
    return new Intl.NumberFormat(MIST.config.locale || "en-PH", {
      style: "currency", currency: MIST.config.currency || "PHP", maximumFractionDigits: 2
    }).format(amount);
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }
  function endpointConfigured() {
    const endpoint = String(MIST.config.gasEndpoint || "").trim();
    return Boolean(endpoint && !endpoint.includes("PASTE_YOUR") && /^https:\/\/script\.google\.com\//.test(endpoint));
  }
  function withQuery(url, params) {
    const target = new URL(url);
    Object.entries(params || {}).forEach(([key, value]) => target.searchParams.set(key, value));
    return target.toString();
  }
  function normalizeProduct(raw) {
    const product = raw && typeof raw === "object" ? raw : {};
    const colors = product.colors && typeof product.colors === "object" ? product.colors : {};
    const normalizedColors = {};
    Object.entries(colors).forEach(([name, images]) => {
      if (!name || !images || !images.front || !images.back) return;
      normalizedColors[String(name)] = { code: String(images.code || ""), front: String(images.front), back: String(images.back) };
    });
    const sizes = [...new Set((Array.isArray(product.sizes) ? product.sizes : []).map(String).filter(Boolean))];
    return {
      id: String(product.id || "").trim(), productCode: String(product.productCode || "").trim(),
      name: String(product.name || "").trim(), description: String(product.description || "").trim(),
      badge: String(product.badge || "").trim(), defaultColor: String(product.defaultColor || "").trim(),
      price: Math.max(0, toNumber(product.price, 0)), sizes, colors: normalizedColors,
      featured: Boolean(product.featured), sortOrder: toNumber(product.sortOrder, 999)
    };
  }
  return { toNumber, positiveInteger, money, escapeHtml, endpointConfigured, withQuery, normalizeProduct };
})();
