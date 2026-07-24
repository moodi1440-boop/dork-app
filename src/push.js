// إشعارات Web Push (بدون Firebase) — نُقلت من App.jsx (بند 28: مشروع تقسيم الملف)
import { supabase } from "./api.js";

const VAPID_PUBLIC_KEY = "BAiPrlWpzRxfgx_BJoi0SX46F6ZwuJNnl20nmPwO3KcCedIUq5ghPqE6qSDSpye3Ogx7OQT-51jAUwdibazE8g4";

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function _callRegisterPushSub(userType, userId, sub) {
  if (!sub || !userType || !userId) return;
  await supabase.functions.invoke("register-push-sub", {
    body: { subscription: sub, user_type: userType, user_id: userId },
  }).catch(() => {});
}

async function requestNotificationPermission() {
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
      localStorage.setItem("fcm_debug", "permission-denied");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      localStorage.setItem("fcm_debug", "permission-" + permission);
      return false;
    }
    return true;
  } catch (err) {
    localStorage.setItem("fcm_debug", "permission-error:" + err.message);
    return false;
  }
}

export async function initializeWebPushNotifications() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const swReg = await navigator.serviceWorker.register("/push-sw.js", { updateViaCache: "none", scope: "/" });
    await navigator.serviceWorker.ready;

    let sub = await swReg.pushManager.getSubscription();
    if (sub) {
      const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const currentKey = sub.options?.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
      const keyMatches = currentKey && currentKey.length === expectedKey.length && currentKey.every((v, i) => v === expectedKey[i]);
      if (!keyMatches) { await sub.unsubscribe().catch(() => {}); sub = null; }
    }
    if (!sub) {
      localStorage.setItem("fcm_debug", "subscribing...");
      sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = sub.toJSON();
    localStorage.setItem("fcm_debug", "ok:" + sub.endpoint.slice(-16));
    localStorage.setItem("fcm_token", sub.endpoint);
    localStorage.setItem("fcm_registered_at", String(Date.now()));

    const ow = localStorage.getItem("dork_owner");
    const cu = localStorage.getItem("dork_customer");
    if (ow) await _callRegisterPushSub("salon", +ow, subJson);
    if (cu) { try { const cp = JSON.parse(cu); await _callRegisterPushSub("customer", cp.id, subJson); } catch {} }

  } catch (error) {
    if (error.message?.includes("permission") || error.message?.includes("blocked")) {
      localStorage.removeItem("fcm_token");
    }
    localStorage.setItem("fcm_debug", "ERROR:" + error.message);
    console.error("Push Error:", error.message);
  }
}

export async function registerPushSubForUser(userType, userId) {
  try {
    const swReg = await navigator.serviceWorker.getRegistration("/push-sw.js").catch(() => null);
    if (!swReg) return;
    const sub = await swReg.pushManager.getSubscription().catch(() => null);
    if (!sub) return;
    await _callRegisterPushSub(userType, userId, sub.toJSON());
  } catch {}
}

export async function smartPushRefresh() {
  try {
    const swReg = await navigator.serviceWorker.getRegistration("/push-sw.js").catch(() => null);
    if (!swReg) return;
    const sub = await swReg.pushManager.getSubscription().catch(() => null);
    if (!sub) return;
    const cachedEndpoint = localStorage.getItem("fcm_token");
    const lastReg = parseInt(localStorage.getItem("fcm_registered_at") || "0");
    const hoursSince = (Date.now() - lastReg) / 3_600_000;
    if (sub.endpoint === cachedEndpoint && hoursSince < 24) return;
    const subJson = sub.toJSON();
    localStorage.setItem("fcm_token", sub.endpoint);
    localStorage.setItem("fcm_registered_at", String(Date.now()));
    const ow = localStorage.getItem("dork_owner");
    const cu = localStorage.getItem("dork_customer");
    if (ow) await _callRegisterPushSub("salon", +ow, subJson);
    if (cu) { try { const cp = JSON.parse(cu); await _callRegisterPushSub("customer", cp.id, subJson); } catch {} }
  } catch {}
}
