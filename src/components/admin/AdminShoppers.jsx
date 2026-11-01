import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, RefreshCw, CheckCircle2, Phone, MessageSquare, Gift, MessageCircle } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';
import { getOptimizedUrl } from '../../utils/media';
import { formatLocation, localityName, placeLabel } from '../../data/bdLocations';

function isContacted(row) {
  return Boolean(row?.contacted_at);
}

const FOLLOW_UP_MS = 30 * 60 * 1000;

/** Hostinger/proxy hops — never treat as a real visitor (blocks fake "Near Bologna" etc.). */
const IGNORE_VISITOR_IPS = new Set(['5.90.143.78']);

/** True when API gave a real customer IP (not empty / edge hop). Used only to gate location display. */
function hasRealVisitorIp(ip) {
  const value = String(ip || '').trim().replace(/^::ffff:/i, '');
  return Boolean(value && !IGNORE_VISITOR_IPS.has(value));
}

function productPhoto(product) {
  if (!product) return '';
  if (product.image_url) return product.image_url;
  if (Array.isArray(product.images) && product.images[0]) return product.images[0];
  return '';
}

function formatWhen(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-BD', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function sessionItems(row) {
  if (row.checkout_items && row.checkout_items.length) return row.checkout_items;
  return row.cart || [];
}

/** Abandoned cart/checkout: no order, activity older than 30 minutes. */
function needsFollowUp(row, now = Date.now()) {
  if (!row || row.order_id) return false;
  const hasCart = (row.cart_count > 0) || (Array.isArray(row.cart) && row.cart.length > 0);
  const hasCheckout = Boolean(row.checkout_source);
  if (!hasCart && !hasCheckout) return false;
  const seen = new Date(row.last_seen_at || row.created_at || 0).getTime();
  if (!seen || Number.isNaN(seen)) return false;
  return now - seen >= FOLLOW_UP_MS;
}

function missingToOrder(row, items) {
  const missing = [];
  if (!String(row.name || '').trim()) missing.push('name');
  if (!String(row.phone || '').trim()) missing.push('phone');
  if (!String(row.form?.address || '').trim()) missing.push('address');
  if (!items.length) missing.push('a product');
  const gift = row.form?.is_gift === true || row.form?.is_gift === 1 || row.form?.is_gift === '1';
  if (gift) {
    if (!String(row.form?.recipient_name || '').trim()) missing.push('gift recipient name');
    if (!String(row.form?.recipient_phone || '').trim()) missing.push('gift recipient phone');
  }
  return missing;
}

function isReadyToConvert(row, items) {
  return missingToOrder(row, items).length === 0;
}

/** BD local `01…` → `8801…` for wa.me */
function waMeNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('88')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return `88${digits}`;
}

function followUpWhatsAppHref(row) {
  const num = waMeNumber(row.phone);
  if (!num) return '';
  const items = sessionItems(row);
  const names = items
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean)
    .join(', ');
  const kind = row.checkout_source ? 'চেকআউট' : 'কার্ট';
  let text = `আসসালামু আলাইকুম${row.name ? ` ${row.name}` : ''}!\nBigBazar থেকে বলছি। `;
  text += `আপনি আমাদের সাইটে ${kind} শুরু করেছিলেন`;
  if (names) text += ` (${names})`;
  text += `, কিন্তু অর্ডার সম্পন্ন হয়নি। সাহায্য লাগলে এখানে জানান।`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function ItemRow({ item, photo }) {
  const src = photo ? getOptimizedUrl(photo, { w: 120, h: 150 }) : '';
  const meta = [item.color, item.size].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-9 h-11 rounded-md overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <ShoppingBag size={12} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-white truncate">{item.name || 'Item'}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
          {item.quantity || 1} pcs{meta ? ` · ${meta}` : ''}
        </p>
      </div>
    </div>
  );
}

function paymentLabel(method, option) {
  const name = method === 'bkash' ? 'bKash' : method === 'bangla_qr' ? 'Bangla QR' : method === 'cod' ? 'COD' : method;
  if (!name) return '';
  if (option === 'full') return `${name} · full`;
  if (option === 'advance') return `${name} · advance`;
  return name;
}

function englishPlace(form) {
  if (!form) return '';
  const raw = form.upazila || form.thana || form.city || '';
  const fromFmt = formatLocation(form.district, raw, 'en');
  if (fromFmt) return fromFmt;
  const parts = [
    placeLabel(localityName(raw), 'en'),
    placeLabel(form.district, 'en'),
  ].filter(Boolean);
  return parts.join(', ');
}

function DetailLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[3.25rem_1fr] gap-x-2 text-[10px] leading-snug">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-200 break-words line-clamp-2">{value}</span>
    </div>
  );
}

function FormDetails({ form }) {
  if (!form) return null;
  const place = englishPlace(form);
  const pay = paymentLabel(form.payment_method, form.payment_option);
  const isGift = form.is_gift === true || form.is_gift === 1 || form.is_gift === '1';
  const giftLine = isGift
    ? [form.recipient_name, form.recipient_phone].filter(Boolean).join(' · ')
    : '';
  const hasAny = form.address || place || pay || form.sender_number || form.note || giftLine;
  if (!hasAny) return null;
  return (
    <div className="space-y-1 border-t border-white/10 pt-2">
      <DetailLine label="Address" value={form.address} />
      <DetailLine label="Place" value={place} />
      <DetailLine label="Payment" value={pay} />
      <DetailLine label="Sender" value={form.sender_number} />
      <DetailLine label="Note" value={form.note} />
      {isGift && (
        <div className="grid grid-cols-[3.25rem_1fr] gap-x-2 text-[10px] leading-snug">
          <span className="text-zinc-500 inline-flex items-center gap-0.5"><Gift size={9} /> Gift</span>
          <span className="text-zinc-200 break-words line-clamp-2">{giftLine || 'Recipient filled'}</span>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  row, items, badge, followUp, ready, photos, canConvert, missing, busy, contactBusy, onConvert, onToggleContacted,
}) {
  const waHref = followUpWhatsAppHref(row);
  const telHref = row.phone ? `tel:${String(row.phone).replace(/[^\d+]/g, '')}` : '';
  const isGift = row.form?.is_gift === true || row.form?.is_gift === 1 || row.form?.is_gift === '1';
  const contacted = isContacted(row);
  const area = hasRealVisitorIp(row.ip) ? String(row.area || '').trim() : '';
  const shownItems = items.slice(0, 2);
  const extraItems = items.length - shownItems.length;

  return (
    <article className={`rounded-xl border px-3 py-2.5 flex flex-col gap-2 h-full min-w-0 ${
      contacted
        ? 'border-sky-500/30 bg-sky-500/[0.04]'
        : followUp
          ? 'border-amber-500/30 bg-amber-500/[0.04]'
          : ready
            ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
            : 'border-white/10 bg-black/30'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 flex-wrap">
            <p className="text-[13px] font-semibold text-white truncate">{row.name || 'Guest'}</p>
            {ready && !row.order_id && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Ready
              </span>
            )}
            {followUp && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                Follow-up
              </span>
            )}
            {contacted && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300">
                <MessageCircle size={9} /> Contacted
              </span>
            )}
            {Number(row.prior_orders) > 0 && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300">
                Returning · {row.prior_orders}
              </span>
            )}
            {isGift && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#ce112d]/10 border border-[#ce112d]/25 text-[#ce112d]">
                <Gift size={9} /> Gift
              </span>
            )}
          </div>
          {row.phone && (
            <div className="flex items-center gap-1.5 mt-1">
              <p className="text-[11px] text-zinc-300 tabular-nums truncate">{row.phone}</p>
              <div className="flex gap-0.5 shrink-0">
                {telHref && (
                  <a
                    href={telHref}
                    className="w-6 h-6 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/20 inline-flex items-center justify-center"
                    title="Call"
                  >
                    <Phone size={11} />
                  </a>
                )}
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-6 h-6 rounded-md bg-green-500/15 text-green-400 border border-green-500/20 inline-flex items-center justify-center"
                    title="WhatsApp"
                  >
                    <MessageSquare size={11} />
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-[10px] text-zinc-500 tabular-nums leading-tight">{formatWhen(row.last_seen_at)}</p>
          {badge && (
            <span className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
              {badge}
            </span>
          )}
        </div>
      </div>

      {shownItems.length > 0 && (
        <div className="space-y-1.5">
          {shownItems.map((item, index) => (
            <ItemRow key={`${item.id || item.name}-${index}`} item={item} photo={photos(item)} />
          ))}
          {extraItems > 0 && (
            <p className="text-[10px] text-zinc-500 pl-0.5">+{extraItems} more item{extraItems > 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      <FormDetails form={row.form} />

      {area ? (
        <p className="text-[10px] text-zinc-500 truncate">Near {area}</p>
      ) : null}

      <div className="mt-auto flex flex-col gap-1.5 pt-0.5">
        {row.order_id ? (
          <p className="w-full h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-[11px] font-semibold inline-flex items-center justify-center gap-1">
            <CheckCircle2 size={12} />
            Converted · #{String(row.order_id).slice(0, 8)}
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !canConvert}
              onClick={() => onConvert(row)}
              className="w-full h-8 rounded-lg bg-[#ce112d] text-white text-[11px] font-semibold hover:bg-[#b00e26] disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {busy ? 'Sending…' : 'Convert'}
            </button>
            {!canConvert && missing && (
              <p className="text-[10px] text-zinc-500 line-clamp-2">Needs {missing}</p>
            )}
          </>
        )}
        <button
          type="button"
          disabled={contactBusy}
          onClick={() => onToggleContacted?.(row)}
          className={`w-full h-7 rounded-lg text-[10px] font-medium border inline-flex items-center justify-center gap-1 disabled:opacity-50 ${
            contacted
              ? 'bg-sky-500/10 border-sky-500/25 text-sky-300 hover:bg-sky-500/20'
              : 'bg-transparent border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
          }`}
        >
          <MessageCircle size={12} />
          {contactBusy ? 'Saving…' : contacted ? 'Contacted · Undo' : 'Mark contacted'}
        </button>
      </div>
    </article>
  );
}

function byRecent(a, b) {
  return new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0);
}

function Column({ title, hint, rows, empty, render, accent, grid = true }) {
  return (
    <section className="space-y-2.5 min-w-0">
      <div className="flex items-end justify-between gap-3 pb-1 border-b border-white/[0.06]">
        <div className="min-w-0">
          <h3 className={`text-sm font-semibold tracking-tight ${accent || 'text-white'}`}>{title}</h3>
          {hint ? <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{hint}</p> : null}
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-zinc-400 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 shrink-0">
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500 py-7 text-center border border-dashed border-white/10 rounded-xl">{empty}</p>
      ) : (
        <div className={grid
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5'
          : 'space-y-2.5'}
        >
          {rows.map(render)}
        </div>
      )}
    </section>
  );
}

/** Compact interest report for Browsing — not convert cards. */
function BrowsingReport({ rows, photos, loading }) {
  const stats = useMemo(() => {
    let withPhone = 0;
    let withName = 0;
    let followUp = 0;
    const productMap = new Map();
    rows.forEach((entry) => {
      if (String(entry.row.phone || '').trim()) withPhone += 1;
      if (String(entry.row.name || '').trim()) withName += 1;
      if (entry.followUp) followUp += 1;
      (entry.items || []).forEach((item) => {
        const key = String(item.id || item.name || '');
        if (!key) return;
        const prev = productMap.get(key) || {
          id: item.id,
          name: item.name || 'Item',
          qty: 0,
          sessions: 0,
          photo: photos?.(item) || '',
        };
        prev.qty += Number(item.quantity) || 1;
        prev.sessions += 1;
        if (!prev.photo && photos) prev.photo = photos(item) || '';
        productMap.set(key, prev);
      });
    });
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.sessions - a.sessions || b.qty - a.qty)
      .slice(0, 12);
    return {
      total: rows.length,
      withPhone,
      withName,
      followUp,
      missingPhone: rows.length - withPhone,
      topProducts,
    };
  }, [rows, photos]);

  const recent = rows.slice(0, 40);

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/25 px-4 py-8 text-center text-sm text-zinc-500">
        Loading browsing report…
      </section>
    );
  }

  if (!rows.length) {
    return (
      <section className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
        No browsing sessions in the last 30 days.
      </section>
    );
  }

  return (
    <section className="space-y-4 min-w-0">
      <div className="flex items-end justify-between gap-3 pb-1 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-white">Browsing report</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Interest summary only — partial carts without full convert details.
          </p>
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-zinc-400 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
          {stats.total}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Sessions', value: stats.total },
          { label: 'With phone', value: stats.withPhone },
          { label: 'Missing phone', value: stats.missingPhone },
          { label: 'Need follow-up', value: stats.followUp },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#121215]/80 px-3 py-2.5">
            <p className="text-[10px] font-medium text-zinc-500">{card.label}</p>
            <p className="text-lg font-semibold text-white mt-0.5 tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden">
        <div className="px-3 py-2 border-b border-white/[0.06]">
          <h4 className="text-xs font-semibold text-zinc-300">Top products in browsing carts</h4>
        </div>
        {stats.topProducts.length === 0 ? (
          <p className="text-xs text-zinc-500 px-3 py-4">No products in browsing sessions.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {stats.topProducts.map((product) => {
              const src = product.photo ? getOptimizedUrl(product.photo, { w: 80, h: 100 }) : '';
              return (
                <li key={product.id || product.name} className="flex items-center gap-2.5 px-3 py-2">
                  <div className="w-8 h-10 rounded overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                    {src ? (
                      <img src={src} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <ShoppingBag size={12} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white truncate">{product.name}</p>
                    <p className="text-[10px] text-zinc-500">
                      {product.sessions} session{product.sessions === 1 ? '' : 's'} · {product.qty} pcs
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden">
        <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold text-zinc-300">Recent activity</h4>
          <span className="text-[10px] text-zinc-500">Showing {Math.min(recent.length, 40)} of {stats.total}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="text-zinc-500 border-b border-white/[0.05]">
                <th className="font-medium px-3 py-2">Shopper</th>
                <th className="font-medium px-3 py-2">Interest</th>
                <th className="font-medium px-3 py-2 hidden sm:table-cell">Missing</th>
                <th className="font-medium px-3 py-2 text-right">Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {recent.map((entry) => {
                const names = (entry.items || []).slice(0, 2).map((i) => i.name).filter(Boolean).join(', ');
                const extra = Math.max(0, (entry.items || []).length - 2);
                return (
                  <tr key={`br-${entry.row.id}`} className="text-zinc-300">
                    <td className="px-3 py-2 align-top min-w-[7rem]">
                      <p className="font-medium text-white truncate max-w-[10rem]">{entry.row.name || 'Guest'}</p>
                      <p className="text-zinc-500 tabular-nums truncate">{entry.row.phone || 'No phone'}</p>
                      {entry.followUp && (
                        <span className="inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                          Follow-up
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="line-clamp-2 text-zinc-300">
                        {names || '—'}{extra ? ` +${extra}` : ''}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{entry.badge}</p>
                    </td>
                    <td className="px-3 py-2 align-top text-zinc-500 hidden sm:table-cell">
                      {(entry.missing || []).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-right text-zinc-500 tabular-nums whitespace-nowrap">
                      {formatWhen(entry.row.last_seen_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function AdminShoppers({ products = [], onConverted }) {
  const [shoppers, setShoppers] = useState({ today: { carts: 0, checkouts: 0, orders: 0 }, carts: [], checkouts: [], converted: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [contactBusyId, setContactBusyId] = useState('');
  const [filter, setFilter] = useState('ready'); // ready | browsing | followup | contacted | converted | all

  const photos = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      if (product?.id) map.set(String(product.id), productPhoto(product));
    });
    return (item) => item?.image || map.get(String(item?.id || '')) || '';
  }, [products]);

  const load = () => {
    setLoading(true);
    setError('');
    const base = (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
    const token = getToken();
    fetch(`${base}/api/admin/shoppers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Could not load carts');
        setShoppers({
          today: json.today || { carts: 0, checkouts: 0, orders: 0 },
          carts: Array.isArray(json.carts) ? json.carts : [],
          checkouts: Array.isArray(json.checkouts) ? json.checkouts : [],
          converted: Array.isArray(json.converted) ? json.converted : [],
        });
      })
      .catch((err) => {
        setError(err.message || 'Could not load carts');
        setShoppers({ today: { carts: 0, checkouts: 0, orders: 0 }, carts: [], checkouts: [], converted: [] });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const convertToOrder = (row) => {
    if (busyId) return;
    setBusyId(row.id);
    setError('');
    setNotice('');
    const base = (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
    const token = getToken();
    fetch(`${base}/api/admin/shoppers/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ browser_id: row.id }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setNotice('Already sent to orders.');
        } else if (!res.ok) {
          throw new Error(json.error || 'Could not create the order');
        } else {
          setNotice('Sent to orders.');
        }
        try { if (onConverted) onConverted(); } catch (_) {}
        load();
      })
      .catch((err) => setError(err.message || 'Could not create the order'))
      .finally(() => setBusyId(''));
  };

  const patchShopperContacted = (id, patch) => {
    const apply = (list) => (list || []).map((row) => (row.id === id ? { ...row, ...patch } : row));
    setShoppers((prev) => ({
      ...prev,
      carts: apply(prev.carts),
      checkouts: apply(prev.checkouts),
      converted: apply(prev.converted),
    }));
  };

  const toggleContacted = (row) => {
    if (!row?.id || contactBusyId) return;
    const next = !isContacted(row);
    setContactBusyId(row.id);
    setError('');
    const base = (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
    const token = getToken();
    fetch(`${base}/api/admin/shoppers/${encodeURIComponent(row.id)}/contacted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ contacted: next }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Could not update contacted mark');
        patchShopperContacted(row.id, {
          contacted_at: json.contacted_at || null,
          contacted_by: json.contacted_by || null,
        });
      })
      .catch((err) => setError(err.message || 'Could not update contacted mark'))
      .finally(() => setContactBusyId(''));
  };

  const now = Date.now();
  const checkoutsAll = [...shoppers.checkouts].sort(byRecent);
  const checkoutIds = new Set(checkoutsAll.map((row) => row.id));
  const cartsAll = shoppers.carts.filter((row) => !checkoutIds.has(row.id)).sort(byRecent);
  const converted = [...(shoppers.converted || [])].sort(byRecent);

  const annotate = (row, kind) => {
    const items = kind === 'checkout' ? sessionItems(row) : (row.cart || []);
    const missing = missingToOrder(row, items);
    return {
      row,
      kind,
      items,
      missing,
      ready: missing.length === 0,
      followUp: needsFollowUp(row, now),
      badge: kind === 'checkout'
        ? (row.checkout_source === 'buy_now' ? 'Buy Now' : 'From cart')
        : 'In cart',
    };
  };
  const openSessions = [
    ...checkoutsAll.map((row) => annotate(row, 'checkout')),
    ...cartsAll.map((row) => annotate(row, 'cart')),
  ].sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    if (a.followUp !== b.followUp) return a.followUp ? -1 : 1;
    return byRecent(a.row, b.row);
  });

  const readyRows = openSessions.filter((entry) => entry.ready);
  const browsingRows = openSessions.filter((entry) => !entry.ready);
  const followUpCount = openSessions.filter((entry) => entry.followUp).length;
  const contactedOpen = openSessions.filter((entry) => isContacted(entry.row));
  const contactedConverted = converted.filter((row) => isContacted(row));
  const contactedCount = contactedOpen.length + contactedConverted.length;
  const allCount = openSessions.length + converted.length;

  const convertedEntries = converted.map((row) => ({
    row,
    kind: 'converted',
    items: sessionItems(row),
    missing: [],
    ready: false,
    followUp: false,
    badge: row.checkout_source === 'buy_now' ? 'Buy Now' : row.checkout_source ? 'From cart' : 'Converted',
  }));

  const visibleReady = filter === 'followup'
    ? readyRows.filter((entry) => entry.followUp)
    : filter === 'ready' || filter === 'all'
      ? readyRows
      : [];

  const visibleBrowsing = filter === 'browsing' || filter === 'all'
    ? browsingRows
    : filter === 'followup'
      ? browsingRows.filter((entry) => entry.followUp)
      : [];

  const visibleContacted = filter === 'contacted'
    ? [
        ...contactedOpen,
        ...contactedConverted.map((row) => ({
          row,
          kind: 'converted',
          items: sessionItems(row),
          missing: [],
          ready: false,
          followUp: false,
          badge: row.checkout_source === 'buy_now' ? 'Buy Now' : row.checkout_source ? 'From cart' : 'Converted',
        })),
      ]
    : [];

  const visibleConverted = filter === 'converted' || filter === 'all' ? convertedEntries : [];

  const renderEntry = (entry) => (
    <SessionCard
      key={`${entry.kind}-${entry.row.id}`}
      row={entry.row}
      badge={entry.badge}
      followUp={entry.followUp}
      ready={entry.ready}
      items={entry.items}
      photos={photos}
      canConvert={entry.ready && !entry.row.order_id}
      missing={entry.missing.join(', ')}
      busy={busyId === entry.row.id}
      contactBusy={contactBusyId === entry.row.id}
      onConvert={convertToOrder}
      onToggleContacted={toggleContacted}
    />
  );

  // Same chip pattern as Orders admin filters (solid selected, neutral idle hover).
  const filters = [
    { id: 'ready', label: 'Ready', count: readyRows.length },
    { id: 'browsing', label: 'Browsing', count: browsingRows.length },
    { id: 'followup', label: 'Follow-up', count: followUpCount },
    { id: 'contacted', label: 'Contacted', count: contactedCount },
    { id: 'converted', label: 'Converted', count: converted.length },
    { id: 'all', label: 'All', count: allCount },
  ];

  const filterHint = {
    ready: 'Name, phone, and address complete — convert is available.',
    browsing: 'Interest report for partial carts — not the convert card grid.',
    followup: 'Idle 30+ min with cart or checkout, no order yet.',
    contacted: 'Marked after you spoke with the shopper.',
    converted: 'Sessions already sent to Orders — kept for follow-up history.',
    all: 'Ready cards, browsing report, and converted sessions.',
  }[filter] || '';

  return (
    <div className="max-w-[90rem] space-y-4 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Carts & <span className="text-[#ce112d]">Checkouts</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
            Ready shoppers first · converted sessions stay listed
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-8 px-2.5 rounded-lg border border-white/10 text-[11px] font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Ready', value: readyRows.length },
          { label: 'Browsing', value: browsingRows.length },
          { label: 'Checkouts today', value: shoppers.today.checkouts },
          { label: 'Converted · 30d', value: converted.length },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#121215]/80 px-3 py-2.5">
            <p className="text-[10px] font-medium text-zinc-500 truncate">{card.label}</p>
            <p className="text-xl font-semibold text-white mt-0.5 tabular-nums">{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((chip) => {
            const selected = filter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(chip.id)}
                className={`group h-8 px-2.5 rounded-md text-[11px] font-semibold border inline-flex items-center gap-1.5 cursor-pointer select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0 ${
                  selected
                    ? 'bg-[#ce112d] border-[#ce112d] text-white hover:bg-[#b00e26] hover:border-[#b00e26]'
                    : 'bg-[#121215] border-white/10 text-zinc-400 hover:bg-zinc-800 hover:border-white/25 hover:text-white'
                }`}
              >
                {chip.label}
                <span
                  className={`text-[10px] font-bold tabular-nums transition-colors duration-150 ${
                    selected ? 'text-white/80' : 'text-zinc-600 group-hover:text-zinc-300'
                  }`}
                >
                  {loading ? '…' : chip.count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5 px-1">{filterHint}</p>
      </div>

      {notice && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="space-y-5">
        {(filter === 'ready' || filter === 'followup' || filter === 'all') && (
          <Column
            title="Ready to convert"
            hint="Four-across on desktop · name, phone, and address complete."
            accent="text-emerald-300"
            rows={visibleReady}
            empty={loading
              ? 'Loading…'
              : filter === 'followup'
                ? 'No convert-ready shoppers need follow-up right now.'
                : 'No convert-ready carts yet.'}
            render={renderEntry}
          />
        )}

        {(filter === 'browsing'
          || ((filter === 'all' || filter === 'followup') && (loading || visibleBrowsing.length > 0))) && (
          <BrowsingReport
            rows={visibleBrowsing}
            photos={photos}
            loading={loading}
          />
        )}

        {filter === 'contacted' && (
          <Column
            title="Contacted"
            hint="Already spoken with — follow up or convert when ready."
            accent="text-sky-300"
            rows={visibleContacted}
            empty={loading ? 'Loading…' : 'No contacted shoppers yet. Mark a card after you call.'}
            render={renderEntry}
          />
        )}

        {(filter === 'converted' || filter === 'all') && (
          <Column
            title="Converted"
            hint="Already sent to Orders — kept here so nothing disappears after convert."
            accent="text-emerald-400"
            rows={visibleConverted}
            empty={loading ? 'Loading…' : 'Nothing converted in the last 30 days.'}
            render={renderEntry}
          />
        )}
      </div>
    </div>
  );
}
