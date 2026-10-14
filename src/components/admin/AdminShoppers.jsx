import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, RefreshCw } from 'lucide-react';
import { API_URL, getToken } from '../../api/client';
import { getOptimizedUrl } from '../../utils/media';

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
  const hasAny = form.address || place || pay || form.sender_number || form.note;
  if (!hasAny) return null;
  return (
    <div className="space-y-1.5 border-t border-white/10 pt-3">
      <DetailLine label="Address" value={form.address} />
      <DetailLine label="Place" value={place} />
      <DetailLine label="Payment" value={pay} />
      <DetailLine label="Sender" value={form.sender_number} />
      <DetailLine label="Note" value={form.note} />
    </div>
  );
}

function SessionCard({ row, items, badge, photos, canConvert, missing, busy, onConvert }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{row.name || 'Guest'}</p>
          {row.phone && <p className="text-xs text-zinc-300 mt-0.5">{row.phone}</p>}
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
      {row.area && <p className="text-[11px] text-zinc-500">Near {row.area}</p>}
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
    </article>
  );
}

function byRecent(a, b) {
  return new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0);
}

function Column({ title, hint, rows, empty, render }) {
  return (
    <section className="space-y-3 min-w-0">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
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
  const [shoppers, setShoppers] = useState({ today: { carts: 0, checkouts: 0, orders: 0 }, carts: [], checkouts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

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
        });
      })
      .catch((err) => {
        setError(err.message || 'Could not load carts');
        setShoppers({ today: { carts: 0, checkouts: 0, orders: 0 }, carts: [], checkouts: [] });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const missingToOrder = (row, items) => {
    const missing = [];
    if (!String(row.name || '').trim()) missing.push('name');
    if (!String(row.phone || '').trim()) missing.push('phone');
    if (!String(row.form?.address || '').trim()) missing.push('address');
    if (!items.length) missing.push('a product');
    return missing.join(', ');
  };

  const convertToOrder = (row) => {
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
        if (!res.ok) throw new Error(json.error || 'Could not create the order');
        setNotice('Sent to orders.');
        if (onConverted) onConverted();
        load();
      })
      .catch((err) => setError(err.message || 'Could not create the order'))
      .finally(() => setBusyId(''));
  };

  const checkouts = [...shoppers.checkouts].sort(byRecent);
  const checkoutIds = new Set(checkouts.map((row) => row.id));
  const carts = shoppers.carts.filter((row) => !checkoutIds.has(row.id)).sort(byRecent);

  return (
    <div className="max-w-6xl space-y-5 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Carts & <span className="text-[#ce112d]">Checkouts</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">Name, phone, address, district, note, and payment fields they type before ordering.</p>
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

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Checkouts today', value: shoppers.today.checkouts },
          { label: 'Carts today', value: shoppers.today.carts },
          { label: 'Orders today', value: shoppers.today.orders },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#121215] px-3 py-3">
            <p className="text-[10px] font-medium text-zinc-500">{card.label}</p>
            <p className="text-2xl font-semibold text-white mt-1">{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      {notice && (
        <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Column
          title="Opened checkout"
          hint="Started checkout and has not ordered. Newest first."
          rows={checkouts}
          empty={loading ? 'Loading…' : 'No unfinished checkouts in the last 30 days.'}
          render={(row) => (
            <SessionCard
              key={`co-${row.id}`}
              row={row}
              badge={row.checkout_source === 'buy_now' ? 'Buy Now' : 'From cart'}
              items={(row.checkout_items && row.checkout_items.length) ? row.checkout_items : (row.cart || [])}
              photos={photos}
              canConvert={!missingToOrder(row, (row.checkout_items && row.checkout_items.length) ? row.checkout_items : (row.cart || []))}
              missing={missingToOrder(row, (row.checkout_items && row.checkout_items.length) ? row.checkout_items : (row.cart || []))}
              busy={busyId === row.id}
              onConvert={convertToOrder}
            />
          )}
        />
        <Column
          title="In the cart"
          hint="Still in the bag. Anyone who opened checkout is listed only there."
          rows={carts}
          empty={loading ? 'Loading…' : 'No open carts in the last 30 days.'}
          render={(row) => (
            <SessionCard
              key={row.id}
              row={row}
              items={row.cart || []}
              photos={photos}
              canConvert={!missingToOrder(row, row.cart || [])}
              missing={missingToOrder(row, row.cart || [])}
              busy={busyId === row.id}
              onConvert={convertToOrder}
            />
          )}
        />
      </div>
    </div>
  );
}
