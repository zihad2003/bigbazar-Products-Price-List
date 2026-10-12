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

function SessionCard({ row, items, badge, photos }) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {row.name || row.phone || 'Guest'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {[row.phone && row.name ? row.phone : '', badge, row.area].filter(Boolean).join(' · ')}
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 shrink-0">{formatWhen(row.last_seen_at)}</p>
      </div>
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <ItemRow key={`${item.id || item.name}-${index}`} item={item} photo={photos(item)} />
        ))}
      </div>
    </article>
  );
}

export default function AdminShoppers({ products = [] }) {
  const [shoppers, setShoppers] = useState({ today: { carts: 0, checkouts: 0, orders: 0 }, carts: [], checkouts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="max-w-5xl space-y-5 pb-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            Carts & <span className="text-[#ce112d]">Checkouts</span>
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">People who added a product or opened checkout and have not ordered yet.</p>
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
          { label: 'Carts today', value: shoppers.today.carts },
          { label: 'Checkouts today', value: shoppers.today.checkouts },
          { label: 'Orders today', value: shoppers.today.orders },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-[#121215] px-3 py-3">
            <p className="text-[10px] font-medium text-zinc-500">{card.label}</p>
            <p className="text-2xl font-semibold text-white mt-1">{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
      )}

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-white">In the cart</h3>
          <p className="text-xs text-zinc-500">Added to the bag, order not placed.</p>
        </div>
        {shoppers.carts.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center border border-white/10 rounded-xl">
            {loading ? 'Loading…' : 'No open carts in the last 30 days.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {shoppers.carts.map((row) => (
              <SessionCard key={row.id} row={row} items={row.cart || []} photos={photos} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-white">Opened checkout</h3>
          <p className="text-xs text-zinc-500">Buy Now or bag checkout started, order not submitted.</p>
        </div>
        {shoppers.checkouts.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center border border-white/10 rounded-xl">
            {loading ? 'Loading…' : 'No unfinished checkouts in the last 30 days.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {shoppers.checkouts.map((row) => (
              <SessionCard
                key={`co-${row.id}`}
                row={row}
                badge={row.checkout_source === 'buy_now' ? 'Buy Now' : 'From cart'}
                items={(row.checkout_items && row.checkout_items.length) ? row.checkout_items : (row.cart || [])}
                photos={photos}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
