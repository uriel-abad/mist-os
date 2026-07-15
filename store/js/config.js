"use strict";
window.MIST = window.MIST || {};
MIST.config = Object.freeze({
  // REQUIRED: replace this with the deployed Apps Script URL ending in /exec.
  gasEndpoint: "PASTE_YOUR_MIST_OS_WEB_APP_EXEC_URL",
  productsUrl: "data/products.json",
  useLiveCatalog: true,
  catalogAction: "catalog",
  requestTimeoutMs: 15000,
  messengerUsername: "marichris.milanes",
  currency: "PHP",
  locale: "en-PH"
});
