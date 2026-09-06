/**
 * Browser Web Push helpers (client-side).
 */
import { API_URL, getCustomerToken } from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service worker not supported');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

export async function getPushPermissionState() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Ask permission, subscribe, and save to backend.
 */
export async function enableBrowserPush() {
  if (!pushSupported()) throw new Error('Browser push not supported on this device');
  const token = getCustomerToken();
  if (!token) throw new Error('Sign in with Google first');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted');

  const keyRes = await fetch(`${API_URL}/api/push/vapid-public-key`);
  const keyJson = await keyRes.json().catch(() => ({}));
  if (!keyRes.ok || !keyJson.publicKey) {
    throw new Error(keyJson.error || 'Push is not configured on the server');
  }

  const reg = await ensureServiceWorker();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
    });
  }

  const payload = sub.toJSON();
  const res = await fetch(`${API_URL}/api/account/push-subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to save push subscription');
  return { success: true };
}

export async function disableBrowserPush() {
  const token = getCustomerToken();
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (sub) {
    if (token) {
      await fetch(`${API_URL}/api/account/push-subscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }
    await sub.unsubscribe().catch(() => {});
  }
}

export async function hasActivePushSubscription() {
  if (!pushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  return !!sub;
}
