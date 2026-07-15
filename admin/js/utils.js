"use strict";
window.MIST_ADMIN = window.MIST_ADMIN || {};
MIST_ADMIN.utils = (() => {
  function toNumber(value, fallback = 0) {
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
    const cleaned = String(value ?? "").replace(/\s/g, "").replace(/₱|PHP/gi, "").replace(/,/g, "").replace(/[^0-9.+-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function money(value) { return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Math.max(0, toNumber(value, 0))); }
  function escape(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function date(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("en-PH"); }
  return { toNumber, money, escape, date };
})();
