/**
 * Steadfast Courier (Packzy) API client.
 * Credentials: STEADFAST_API_KEY + STEADFAST_SECRET_KEY (env / Hostinger).
 * Docs base: https://portal.packzy.com/api/v1
 */

const DEFAULT_BASE = 'https://portal.packzy.com/api/v1';

export function getSteadfastConfig(env) {
  const apiKey =
    env?.STEADFAST_API_KEY ||
    (typeof process !== 'undefined' && process.env?.STEADFAST_API_KEY) ||
    '';
  const secretKey =
    env?.STEADFAST_SECRET_KEY ||
    (typeof process !== 'undefined' && process.env?.STEADFAST_SECRET_KEY) ||
    '';
  const baseUrl = (
    env?.STEADFAST_BASE_URL ||
    (typeof process !== 'undefined' && process.env?.STEADFAST_BASE_URL) ||
    DEFAULT_BASE
  ).replace(/\/$/, '');
  return { apiKey, secretKey, baseUrl, configured: !!(apiKey && secretKey) };
}

function headers(cfg) {
  return {
    'Api-Key': cfg.apiKey,
    'Secret-Key': cfg.secretKey,
    'Content-Type': 'application/json',
  };
}

/** Normalize BD mobile to 11 digits starting with 01 */
export function normalizeBdPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('880') && d.length >= 13) d = d.slice(2);
  if (d.startsWith('88') && d.length === 13) d = d.slice(2);
  if (d.length === 10 && d.startsWith('1')) d = '0' + d;
  return d;
}

export async function steadfastCreateOrder(env, payload) {
  const cfg = getSteadfastConfig(env);
  if (!cfg.configured) {
    throw new Error('Steadfast is not configured (STEADFAST_API_KEY / STEADFAST_SECRET_KEY)');
  }
  const res = await fetch(`${cfg.baseUrl}/create_order`, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.status && data.status !== 200)) {
    const msg =
      data.message ||
      data.error ||
      (typeof data.errors === 'object' ? JSON.stringify(data.errors) : null) ||
      `Steadfast HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function steadfastStatusByInvoice(env, invoice) {
  const cfg = getSteadfastConfig(env);
  if (!cfg.configured) throw new Error('Steadfast is not configured');
  const res = await fetch(`${cfg.baseUrl}/status_by_invoice/${encodeURIComponent(invoice)}`, {
    headers: headers(cfg),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Steadfast HTTP ${res.status}`);
  }
  return data;
}

export async function steadfastStatusByTracking(env, trackingCode) {
  const cfg = getSteadfastConfig(env);
  if (!cfg.configured) throw new Error('Steadfast is not configured');
  const res = await fetch(
    `${cfg.baseUrl}/status_by_trackingcode/${encodeURIComponent(trackingCode)}`,
    { headers: headers(cfg) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Steadfast HTTP ${res.status}`);
  }
  return data;
}

export async function steadfastGetBalance(env) {
  const cfg = getSteadfastConfig(env);
  if (!cfg.configured) throw new Error('Steadfast is not configured');
  const res = await fetch(`${cfg.baseUrl}/get_balance`, { headers: headers(cfg) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Steadfast HTTP ${res.status}`);
  }
  return data;
}
