// A visitor identity lives in localStorage so refreshes and additional tabs
// from the same browser are reported as one anonymous visitor. It is not a
// fingerprint and deliberately does not attempt to identify people across
// browsers or private windows.
const VISITOR_KEY = "ps_visitor_id";

export function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `visitor_${crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch (_) {
    // Storage can be unavailable in privacy-restricted contexts. The fallback
    // still keeps this page functional, although it cannot survive a reload.
    return `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function getPresenceTabId() {
  try {
    let id = sessionStorage.getItem("ps_presence_tab_id");
    if (!id) {
      id = `tab_${crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
      sessionStorage.setItem("ps_presence_tab_id", id);
    }
    return id;
  } catch (_) {
    return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
