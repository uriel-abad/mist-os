"use strict";
window.MIST_ADMIN = window.MIST_ADMIN || {};
MIST_ADMIN.api = (() => {
  const state = {
    endpoint: localStorage.getItem("mistOsEndpoint") || "",
    adminKey: localStorage.getItem("mistOsAdminKey") || ""
  };
  function configured() { return Boolean(state.endpoint && state.adminKey && !state.endpoint.includes("PASTE_YOUR")); }
  function save(endpoint, adminKey) {
    state.endpoint = String(endpoint || "").trim(); state.adminKey = String(adminKey || "").trim();
    localStorage.setItem("mistOsEndpoint", state.endpoint); localStorage.setItem("mistOsAdminKey", state.adminKey);
  }
  async function request(action, payload = {}) {
    if (!configured()) throw new Error("Connect the Apps Script backend first.");
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(state.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, adminKey: state.adminKey, ...payload }), redirect: "follow", signal: controller.signal });
      if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`);
      const text = await response.text(); let result;
      try { result = JSON.parse(text); } catch (_) { throw new Error("Backend returned an invalid response."); }
      if (!result.ok) throw new Error(result.error || "Request failed.");
      return result;
    } catch (error) { if (error.name === "AbortError") throw new Error("Request timed out."); throw error; }
    finally { clearTimeout(timeout); }
  }
  return { state, configured, save, request };
})();
