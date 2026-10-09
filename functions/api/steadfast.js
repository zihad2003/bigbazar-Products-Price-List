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

export async function steadfastStatusByCid(env, consignmentId) {
  const cfg = getSteadfastConfig(env);
  if (!cfg.configured) throw new Error('Steadfast is not configured');
  const res = await fetch(
    `${cfg.baseUrl}/status_by_cid/${encodeURIComponent(consignmentId)}`,
    { headers: headers(cfg) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Steadfast HTTP ${res.status}`);
  }
  return data;
}

/**
 * Customer delivery history across Steadfast merchants.
 * GET /fraud_check/{phone} → total_parcels, total_delivered, total_cancelled.
 */
export async function steadfastFraudCheck(env, phone) {
  const cfg = getSteadfastConfig(env);
  if (!cfg.configured) return { configured: false };
  const normalized = normalizeBdPhone(phone);
  if (!/^01[3-9]\d{8}$/.test(normalized)) {
    return { configured: true, error: 'Invalid phone' };
  }
  const res = await fetch(`${cfg.baseUrl}/fraud_check/${encodeURIComponent(normalized)}`, {
    headers: headers(cfg),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { configured: true, error: data.message || data.error || `Steadfast HTTP ${res.status}` };
  }
  const body = data?.data && typeof data.data === 'object' ? { ...data, ...data.data } : data;
  const parcels = Number(body.total_parcels ?? body.Total_parcels) || 0;
  const delivered = Number(body.total_delivered ?? body.total_delivered_parcels) || 0;
  const cancelled = Number(body.total_cancelled ?? body.total_cancelled_parcels) || 0;
  const reportsRaw = body.total_fraud_reports ?? body.fraud_reports;
  const reports = Array.isArray(reportsRaw) ? reportsRaw.length : Number(reportsRaw) || 0;
  const finished = delivered + cancelled;
  return {
    configured: true,
    phone: normalized,
    total: parcels,
    delivered,
    cancelled,
    fraudReports: reports,
    successRate: finished > 0 ? Math.round((delivered / finished) * 100) : null,
  };
}

async function steadfastRequest(env, path, { method = 'GET', body } = {}) {
  const cfg = getSteadfastConfig(env);
  if (!cfg.configured) {
    const err = new Error('Steadfast is not configured');
    err.status = 503;
    throw err;
  }
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: headers(cfg),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const bodyStatus = Number(data?.status);
  if (!res.ok || (Number.isFinite(bodyStatus) && bodyStatus >= 400)) {
    const err = new Error(data.message || data.error || `Steadfast HTTP ${res.status}`);
    err.status = res.status || bodyStatus || 502;
    err.payload = data;
    throw err;
  }
  return data;
}

export function steadfastList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  for (const key of ['items', 'payments', 'return_requests', 'police_stations', 'trackings']) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

export async function steadfastGetBalance(env) {
  return steadfastRequest(env, '/get_balance');
}

export async function steadfastPayments(env, page = 1) {
  return steadfastRequest(env, `/payments?page=${encodeURIComponent(page)}`);
}

export async function steadfastPayment(env, paymentId) {
  const id = String(paymentId || '').replace(/\D/g, '');
  return steadfastRequest(env, `/payments/${encodeURIComponent(id)}`);
}

export async function steadfastReturnRequests(env, page = 1) {
  return steadfastRequest(env, `/get_return_requests?page=${encodeURIComponent(page)}`);
}

export async function steadfastCreateReturn(env, target, reason) {
  const body = { ...target };
  if (reason) body.reason = String(reason).slice(0, 500);
  return steadfastRequest(env, '/create_return_request', { method: 'POST', body });
}

export async function steadfastPoliceStations(env) {
  return steadfastRequest(env, '/police_stations');
}

export async function steadfastCreatePickup(env, payload) {
  return steadfastRequest(env, '/create_pickup_request', { method: 'POST', body: payload });
}

export async function steadfastTrackingByInvoice(env, invoice) {
  return steadfastRequest(env, `/trackings_by_invoice/${encodeURIComponent(invoice)}`);
}

export async function steadfastReturnStatusByCid(env, consignmentId) {
  return steadfastRequest(env, `/status_with_return_status_by_cid/${encodeURIComponent(consignmentId)}`);
}
