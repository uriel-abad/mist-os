"use strict";
window.MIST = window.MIST || {};
MIST.config = Object.freeze({
  // REQUIRED: replace this with the deployed Apps Script URL ending in /exec.
  gasEndpoint: "https://script.google.com/macros/s/AKfycbyBSBs1zBVOzzu3n2clTXe7DDai__bfmh7VQNm3qqNMzRpvYIJtuiIgbKbL_76AACLb/exec",
  productsUrl: "data/products.json",
  useLiveCatalog: true,
  catalogAction: "catalog",
  requestTimeoutMs: 15000,
  messengerUsername: "marichris.milanes",
  currency: "PHP",
  locale: "en-PH"
});
