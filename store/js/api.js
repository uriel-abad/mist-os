"use strict";
window.MIST = window.MIST || {};
MIST.api = (() => {
  async function fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), MIST.config.requestTimeoutMs || 15000);
    try {
      const response = await fetch(url, { cache: "no-store", redirect: "follow", ...options, signal: controller.signal });
      if (!response.ok) throw new Error(`Service returned HTTP ${response.status}.`);
      const text = await response.text();
      try { return JSON.parse(text); } catch (_) { throw new Error("The service returned an invalid response."); }
    } catch (error) {
      if (error && error.name === "AbortError") throw new Error("The request timed out. Check your connection and try again.");
      throw error;
    } finally { window.clearTimeout(timeout); }
  }

  async function getCatalog() {
    if (MIST.config.useLiveCatalog && MIST.utils.endpointConfigured()) {
      try {
        const url = MIST.utils.withQuery(MIST.config.gasEndpoint, { action: MIST.config.catalogAction || "catalog", v: Date.now() });
        const result = await fetchJson(url);
        if (!result.ok) throw new Error(result.error || "The live catalog could not be loaded.");
        if (!Array.isArray(result.products) || !result.products.length) throw new Error("The live catalog is empty.");
        return { source: "live", products: result.products, settings: result.settings || {} };
      } catch (error) {
        console.warn("Live catalog unavailable; using local fallback.", error);
      }
    }
    const products = await fetchJson(MIST.config.productsUrl);
    if (!Array.isArray(products) || !products.length) throw new Error("No products are available.");
    return { source: "fallback", products, settings: {} };
  }

  async function createOrder(payload) {
    if (!MIST.utils.endpointConfigured()) throw new Error("The order service is not configured. Add the Apps Script URL in store/js/config.js.");
    const result = await fetchJson(MIST.config.gasEndpoint, {
      method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, action: "createOrder" })
    });
    if (!result.ok || !result.orderNumber) throw new Error(result.error || "No order number was returned.");
    return result;
  }
  return { getCatalog, createOrder };
})();
