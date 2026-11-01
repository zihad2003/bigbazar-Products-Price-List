import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, RefreshCw, CheckCircle2, Phone, MessageSquare, Gift } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';
import { getOptimizedUrl } from '../../utils/media';

const FOLLOW_UP_MS = 30 * 60 * 1000;

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
  const src = photo ? getOptimizedUrl(photo, { w: 160, h: 200 }) : '';
  const meta = [item.color, item.size].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-14 h-[4.5rem] rounded-lg overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <ShoppingBag size={16} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{item.name || 'Item'}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {item.quantity || 1} pcs{meta ? ` · ${meta}` : ''}
        </p>
      </div>
    </div>
  );
}

function paymentLabel(method, option) {
  const name = method === 'bkash' ? 'bKash' : method === 'bangla_qr' ? 'Bangla QR' : method === 'cod' ? 'Cash on delivery' : method;
  if (!name) return '';
  if (option === 'full') return `${name} · full payment`;
  if (option === 'advance') return `${name} · advance`;
  return name;
}

function DetailLine({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[4.75rem_1fr] gap-x-3 gap-y-0.5 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 break-words">{value}</span>
    </div>
  );
}

function FormDetails({ form }) {
  if (!form) return null;
  const place = [form.upazila, form.district].filter(Boolean).join(', ');
  const pay = paymentLabel(form.payment_method, form.payment_option);
  const isGift = form.is_gift === true || form.is_gift === 1 || form.is_gift === '1';
  const giftLine = isGift
    ? [form.recipient_name, form.recipient_phone].filter(Boolean).join(' · ')
    : '';
  const hasAny = form.address || place || pay || form.sender_number || form.note || giftLine;
  if (!hasAny) return null;
  return (
    <div className="space-y-1.5 border-t border-white/10 pt-3">
      <DetailLine label="Address" value={form.address} />
      <DetailLine label="Place" value={place} />
      <DetailLine label="Payment" value={pay} />
      <DetailLine label="Sender" value={form.sender_number} />
      <DetailLine label="Note" value={form.note} />
      {isGift && (
        <div className="grid grid-cols-[4.75rem_1fr] gap-x-3 gap-y-0.5 text-xs">
          <span className="text-zinc-500 inline-flex items-center gap-1"><Gift size={10} /> Gift</span>
          <span className="text-zinc-200 break-words">{giftLine || 'Recipient details filled'}</span>
        </div>
      )}
    </div>
  );
}

function SessionCard({ row, items, badge, followUp, ready, photos, canConvert, missing, busy, onConvert }) {
  const waHref = followUpWhatsAppHref(row);
  const telHref = row.phone ? `tel:${String(row.phone).replace(/[^\d+]/g, '')}` : '';
  const isGift = row.form?.is_gift === true || row.form?.is_gift === 1 || row.form?.is_gift === '1';

  return (
    <article className={`rounded-xl border p-4 space-y-3 ${
      followUp
        ? 'border-amber-500/30 bg-amber-500/[0.04]'
        : ready
          ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
          : 'border-white/10 bg-black/30'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{row.name || 'Guest'}</p>
            {ready && !row.order_id && (
              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Ready
              </span>
            )}
            {followUp && (
              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                ফলোআপ
              </span>
            )}
            {isGift && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#ce112d]/10 border border-[#ce112d]/25 text-[#ce112d]">
                <Gift size={10} /> Gift
              </span>
            )}
          </div>
          {row.phone && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-zinc-300">{row.phone}</p>
              <div className="flex gap-1">
                {telHref && (
                  <a
                    href={telHref}
                    className="w-7 h-7 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/20 inline-flex items-center justify-center"
                    title="Call"
                  >
                    <Phone size={12} />
                  </a>
                )}
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-7 h-7 rounded-md bg-green-500/15 text-green-400 border border-green-500/20 inline-flex items-center justify-center"
                    title="WhatsApp"
                  >
                    <MessageSquare size={12} />
                  </a>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <p className="text-[11px] text-zinc-500">{formatWhen(row.last_seen_at)}</p>
          {badge && (
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
              {badge}
            </span>
          )}
        </div>
      </div>
      {items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <ItemRow key={`${item.id || item.name}-${index}`} item={item} photo={photos(item)} />
          ))}
        </div>
      )}
      <FormDetails form={row.form} />
      {(row.area || row.ip) && (
        <p className="text-[11px] text-zinc-500">
          {row.area ? `Near ${row.area}` : ''}
          {row.area && row.ip ? ' · ' : ''}
          {row.ip ? <span className="font-mono text-zinc-400">{row.ip}</span> : null}
        </p>
      )}
      {row.order_id ? (
        <p className="w-full h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-semibold inline-flex items-center justify-center gap-1.5">
          <CheckCircle2 size={14} />
          Converted to order #{String(row.order_id).slice(0, 8)}
        </p>
      ) : (
        <>
          <button
            type="button"
            disabled={busy || !canConvert}
            onClick={() => onConvert(row)}
            className="w-full h-9 rounded-lg bg-[#ce112d] text-white text-xs font-semibold hover:bg-[#b00e26] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Sending…' : 'Convert to order'}
          </button>
          {!canConvert && missing && (
            <p className="text-[11px] text-zinc-500 -mt-1">Needs {missing} before it can be sent to orders.</p>
          )}
        </>
      )}
    </article>
  );
}

function byRecent(a, b) {
  return new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0);
}

function Column({ title, hint, rows, empty, render, accent }) {
  return (
    <section className="space-y-3 min-w-0">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className={`text-base font-semibold ${accent || 'text-white'}`}>{title}</h3>
          <p className="text-xs text-zinc-500">{hint}</p>
        </div>
        <span className="text-[11px] font-semibold text-zinc-400 bg-white/5 border border-white/10 rounded-md px-2 py-1">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 py-8 text-center border border-white/10 rounded-xl">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map(render)}
        </div>
      )}
    </section>
  );
}

export default function AdminShoppers({ products = [], onConverted }) {
  const [shoppers, setShoppers] = useState({ today: { carts: 0, checkouts: 0, orders: 0 }, carts: [], checkouts: [], converted: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('ready'); // 'ready' | 'browsing' | 'followup' | 'all'

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

  const visibleReady = filter === 'browsing'
    ? []
    : filter === 'followup'
      ? readyRows.filter((entry) => entry.followUp)
      : readyRows;
  const visibleBrowsing = filter === 'ready'
    ? []
    : filter === 'followup'
      ? browsingRows.filter((entry) => entry.followUp)
      : browsingRows;

  const renderEntry = (entry) => (
    <SessionCard
      key={`${entry.kind}-${entry.row.id}`}
      row={entry.row}
      badge={entry.badge}
      followUp={entry.followUp}
      ready={entry.ready}
      items={entry.items}
      photos={photos}
      canConvert={entry.ready}
      missing={entry.missing.join(', ')}
      busy={busyId === entry.row.id}
      onConvert={convertToOrder}
    />
  );

  const filters = [
    { id: 'ready', label: 'Ready to convert', count: readyRows.length, active: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' },
    { id: 'browsing', label: 'Browsing', count: browsingRows.length, active: 'bg-white/10 border-white/20 text-white' },
    { id: 'followup', label: 'Follow-up', count: followUpCount, active: 'bg-amber-500/15 border-amber-500/35 text-amber-300' },
    { id: 'all', label: 'All', count: openSessions.length, active: 'bg-white/10 border-white/20 text-white' },
  ];

  return (
    <div className="max-w-6xl space-y-5 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Carts & <span className="text-[#ce112d]">Checkouts</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Convert-ready shoppers (name, phone, address) first. Gift recipient details carry into the order.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-9 px-3 rounded-lg border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ready to convert', value: readyRows.length },
          { label: 'Checkouts today', value: shoppers.today.checkouts },
          { label: 'Carts today', value: shoppers.today.carts },
          { label: 'Converted (30 days)', value: converted.length },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#121215] px-3 py-3">
            <p className="text-[10px] font-medium text-zinc-500">{card.label}</p>
            <p className="text-2xl font-semibold text-white mt-1">{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
              filter === chip.id
                ? chip.active
                : 'bg-transparent border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {chip.label}
            <span className={`min-w-[1.25rem] h-5 px-1.5 rounded-md inline-flex items-center justify-center text-[10px] font-bold ${
              filter === chip.id ? 'bg-black/30 text-current' : 'bg-white/5 text-zinc-500'
            }`}>
              {loading ? '…' : chip.count}
            </span>
          </button>
        ))}
        {filter === 'followup' && (
          <p className="text-[11px] text-zinc-500 ml-1">30+ min idle, no order yet</p>
        )}
      </div>

      {notice && (
        <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {(filter === 'ready' || filter === 'all' || filter === 'followup') && (
          <Column
            title="Ready to convert"
            hint="Full name, phone, and address — Convert is active. Gift fields included when filled."
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
        {(filter === 'browsing' || filter === 'all' || filter === 'followup') && (
          <Column
            title="Browsing / interest"
            hint="Partial info — track what they liked. Call/WhatsApp when a phone is present."
            rows={visibleBrowsing}
            empty={loading
              ? 'Loading…'
              : filter === 'followup'
                ? 'No browsing sessions need follow-up right now.'
                : 'No browsing carts in the last 30 days.'}
            render={renderEntry}
          />
        )}
      </div>

      {(filter === 'all' || filter === 'ready') && (
        <Column
          title="Converted to orders"
          hint="Carts and checkouts that were confirmed as orders in the last 30 days."
          rows={converted}
          empty={loading ? 'Loading…' : 'Nothing converted in the last 30 days.'}
          render={(row) => (
            <SessionCard
              key={`cv-${row.id}`}
              row={row}
              badge={row.checkout_source === 'buy_now' ? 'Buy Now' : row.checkout_source ? 'From cart' : ''}
              followUp={false}
              ready={false}
              items={sessionItems(row)}
              photos={photos}
              canConvert={false}
              missing=""
              busy={false}
              onConvert={() => {}}
            />
          )}
        />
      )}
    </div>
  );
}
