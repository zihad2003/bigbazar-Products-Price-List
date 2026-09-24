import {
  User, Phone, MessageSquare, MapPin, Copy, Trash2, X, Check, Image as ImageIcon, Truck, RefreshCw, ExternalLink,
} from 'lucide-react';
import { useState } from 'react';
import { getOptimizedUrl, mediaSizes } from '../../utils/media';
import { API_URL, getToken } from '../../api/client';

function parseOrderLine(str) {
  const res = { name: str, size: null, color: null, sku: null, qty: 1 };
  const colorMatch = str.match(/\((?:Color|রঙ):\s*([^)]*)\)/i);
  const sizeMatch = str.match(/\((?:Size|সাইজ):\s*([^)]*)\)/i);
  const skuMatch = str.match(/\((?:SKU):\s*([^)]*)\)/i);
  const qtyMatch = str.match(/\((?:Qty|পরিমাণ):\s*(\d+)\)/i);
  if (colorMatch) res.color = colorMatch[1].trim();
  if (sizeMatch) res.size = sizeMatch[1].trim();
  if (skuMatch) res.sku = skuMatch[1].trim();
  if (qtyMatch) res.qty = qtyMatch[1];
  res.name = str.split('(')[0].trim();
  return res;
}

function advanceAmount(order) {
  const confirmed =
    Boolean(order?.is_advance_paid) ||
    order?.payment_status === 'Advance Paid' ||
    order?.payment_status === 'Fully Paid';
  if (!confirmed) return 0;
  const charge = parseFloat(order.delivery_charge) || 0;
  if (order.is_exclusive_order) return 500;
  if (order.delivery_area === 'mirsarai' && charge === 0) return 100;
  return charge;
}

function balanceDue(order) {
  const total = typeof order.total_amount === 'string'
    ? Number(order.total_amount.replace(/[^0-9.]/g, ''))
    : Number(order.total_amount) || 0;
  if (order.payment_status === 'Fully Paid') return 0;
  return Math.max(0, total - advanceAmount(order));
}

function hasCustomerPaymentClaim(order) {
  const raw = String(order?.last_four_digits || '').trim();
  if (!raw || /^cod$/i.test(raw)) return false;
  const confirmed =
    Boolean(order?.is_advance_paid) ||
    order?.payment_status === 'Advance Paid' ||
    order?.payment_status === 'Fully Paid';
  return !confirmed;
}

function paymentRef(order) {
  const raw = order.last_four_digits || '';
  if (!raw || raw === 'COD') return { label: 'Payment', value: 'COD' };
  if (raw.includes(': ')) {
    const [method, ref] = raw.split(': ');
    return { label: `${method} ref`, value: ref };
  }
  return { label: 'Sender / ref', value: raw };
}

const STATUS_BTN = {
  Pending: 'bg-yellow-500 border-yellow-500 text-black',
  Shipped: 'bg-blue-500 border-blue-500 text-white',
  Delivered: 'bg-green-500 border-green-500 text-white',
  Canceled: 'bg-red-500 border-red-500 text-white',
};

/**
 * Compact proportional order details — used by Admin mobile modal + desktop panel.
 */
export default function OrderDetailsPanel({
  order,
  products = [],
  variant = 'panel', // 'panel' | 'modal'
  onClose,
  onCopyFull,
  onCopy,
  onDelete,
  onTogglePayment,
  onUpdateStatus,
  onEditNote,
  onOrderPatched,
}) {
  const [sfBusy, setSfBusy] = useState(false);
  const [sfMsg, setSfMsg] = useState('');

  if (!order) return null;

  const ref = order.id.toString().slice(-6).toUpperCase();
  const items = (order.product_name || '').split(' + ').map(parseOrderLine);
  const pay = paymentRef(order);
  const adv = advanceAmount(order);
  const due = balanceDue(order);
  const isModal = variant === 'modal';

  const bookSteadfast = async () => {
    if (!window.confirm(`Book Steadfast courier for #${ref}?\nCOD: ৳${due}`)) return;
    setSfBusy(true);
    setSfMsg('');
    try {
      const base = (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
      const res = await fetch(`${base}/api/orders/${order.id}/steadfast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSfMsg(data.error || 'Steadfast booking failed');
        return;
      }
      setSfMsg(`Booked · ${data.tracking_code || 'OK'}`);
      onOrderPatched?.({
        ...order,
        tracking_code: data.tracking_code,
        steadfast_consignment_id: data.consignment_id,
        steadfast_status: data.steadfast_status,
        status: order.status === 'Pending' ? 'Shipped' : order.status,
      });
    } catch (err) {
      setSfMsg(err.message || 'Network error');
    } finally {
      setSfBusy(false);
    }
  };

  const refreshSteadfast = async () => {
    setSfBusy(true);
    setSfMsg('');
    try {
      const base = (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
      const res = await fetch(`${base}/api/orders/${order.id}/steadfast`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSfMsg(data.error || 'Status check failed');
        return;
      }
      setSfMsg(`Status: ${data.steadfast_status || 'updated'}`);
      onOrderPatched?.({
        ...order,
        steadfast_status: data.steadfast_status || order.steadfast_status,
      });
    } catch (err) {
      setSfMsg(err.message || 'Network error');
    } finally {
      setSfBusy(false);
    }
  };

  const findProduct = (item, idx) =>
    products.find((p) => p.id == order.product_id && idx === 0) ||
    products.find((p) => item.sku && (p.platform_id == item.sku || p.serial_no == item.sku)) ||
    products.find((p) => p.name === item.name) ||
    products.find((p) => p.name && item.name && p.name.toLowerCase().includes(item.name.toLowerCase()));

  return (
    <div className={`flex flex-col bg-[#0a0a0c] ${isModal ? 'h-full max-h-[100dvh] md:max-h-[90vh]' : 'h-full'}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-white/10 bg-black/30">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">
            Order <span className="text-[#ce112d]">#{ref}</span>
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {new Date(order.created_at).toLocaleString()} · {order.status || '—'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onCopyFull?.(order)}
            className="h-9 px-3 rounded-lg text-[11px] font-medium bg-[#ce112d]/10 text-[#ce112d] border border-[#ce112d]/20 hover:bg-[#ce112d] hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Copy size={13} /> Copy
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(order.id)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-red-400/70 border border-red-500/15 hover:bg-red-500 hover:text-white transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
          {isModal && (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 border border-white/10 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
        {/* Customer + Delivery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <section className="rounded-lg border border-white/10 bg-black/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              <User size={12} className="text-[#ce112d]" /> Customer
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-0.5">Name</p>
              <p className="text-sm font-semibold text-white">{order.customer_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-0.5">Phone</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white flex-1">{order.customer_phone || '—'}</p>
                {order.customer_phone && (
                  <div className="flex gap-1">
                    <a href={`tel:${order.customer_phone}`} className="w-8 h-8 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center"><Phone size={12} /></a>
                    <a href={`https://wa.me/${String(order.customer_phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-md bg-green-500/15 text-green-400 border border-green-500/20 flex items-center justify-center"><MessageSquare size={12} /></a>
                  </div>
                )}
              </div>
            </div>
            {pay.value !== 'COD' && (
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">{pay.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#ce112d] flex-1 truncate">{pay.value}</p>
                  <button type="button" onClick={() => onCopy?.(pay.value, 'Payment ref')} className="w-8 h-8 rounded-md bg-[#ce112d]/10 text-[#ce112d] border border-[#ce112d]/20 flex items-center justify-center">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-black/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <MapPin size={12} /> Delivery
              </div>
              <button
                type="button"
                onClick={() => onCopy?.(order.customer_address, 'Address')}
                className="text-[10px] font-medium text-[#ce112d] hover:underline flex items-center gap-1"
              >
                <Copy size={11} /> Copy
              </button>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-0.5">Area</p>
              <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 uppercase">
                {order.delivery_area || '—'}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-0.5">Address</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{order.customer_address || '—'}</p>
            </div>
          </section>
        </div>

        {/* Items */}
        <section className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Items</p>
            <span className="text-[10px] font-semibold bg-[#ce112d] text-white px-2 py-0.5 rounded">{items.length}</span>
          </div>
          <div className="p-3 space-y-2.5">
            {items.map((item, idx) => {
              const p = findProduct(item, idx);
              const thumb = getOptimizedUrl(p?.image_url || p?.images?.[0], mediaSizes.thumbnail);
              return (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-14 h-[4.5rem] rounded-md overflow-hidden border border-white/10 bg-black shrink-0 flex items-center justify-center relative">
                    {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-zinc-700" />}
                    <span className="absolute top-0.5 left-0.5 text-[8px] font-bold bg-black/70 text-zinc-400 px-1 rounded">#{p?.serial_no || idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h4 className="text-sm font-semibold text-white leading-snug">{item.name}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                        Size: <strong className="text-white">{item.size || order.size || '—'}</strong>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                        Color: <strong className="text-white">{item.color || order.color || '—'}</strong>
                      </span>
                      {item.sku && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-zinc-400">
                          SKU: {item.sku}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">
                        ×{item.qty}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Money */}
        <section className="rounded-lg border border-white/10 bg-black/30 p-3.5 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Product', value: `৳${Number(order.product_price || 0).toLocaleString()}` },
              { label: 'Delivery', value: `৳${parseFloat(order.delivery_charge) || 0}` },
              { label: pay.label, value: pay.value, accent: true },
              { label: 'Advance', value: `৳${adv}`, accent: true },
            ].map((cell) => (
              <div key={cell.label} className={`rounded-md border p-2.5 ${cell.accent ? 'border-[#ce112d]/25 bg-[#ce112d]/5' : 'border-white/10 bg-black/20'}`}>
                <p className="text-[10px] text-zinc-500 mb-0.5 truncate">{cell.label}</p>
                <p className={`text-sm font-semibold truncate ${cell.accent ? 'text-[#ce112d]' : 'text-white'}`}>{cell.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-[#ce112d] px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Due on delivery</p>
              <p className="text-2xl font-bold text-white tracking-tight">৳{due.toLocaleString()}</p>
              {hasCustomerPaymentClaim(order) && (
                <p className="text-[10px] text-white/80 mt-1">
                  Customer sent payment ref — confirm below after verifying
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onTogglePayment?.(order, 'Advance Paid')}
                className={`h-9 px-4 rounded-md text-[11px] font-semibold transition-colors ${
                  order.is_advance_paid || order.payment_status === 'Advance Paid' || order.payment_status === 'Fully Paid'
                    ? 'bg-white text-[#ce112d]'
                    : 'bg-black/25 text-white/80 border border-white/15'
                }`}
              >
                {order.is_advance_paid || order.payment_status === 'Advance Paid' || order.payment_status === 'Fully Paid'
                  ? 'Advance paid'
                  : 'Mark advance'}
              </button>
              <button
                type="button"
                onClick={() => onTogglePayment?.(order, 'Fully Paid')}
                className={`h-9 px-4 rounded-md text-[11px] font-semibold transition-colors ${order.payment_status === 'Fully Paid' ? 'bg-white text-[#ce112d]' : 'bg-black/25 text-white/80 border border-white/15'}`}
              >
                {order.payment_status === 'Fully Paid' ? 'Fully paid' : 'Mark fully paid'}
              </button>
            </div>
          </div>
        </section>

        {/* Status + note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <section className="space-y-2">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['Pending', 'Shipped', 'Delivered', 'Canceled'].map((status) => {
                const active = order.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onUpdateStatus?.(order.id, status)}
                    className={`h-10 rounded-lg text-[11px] font-semibold border flex items-center justify-between px-3 transition-colors ${
                      active ? STATUS_BTN[status] : 'bg-black/30 border-white/10 text-zinc-500 hover:text-white hover:border-white/25'
                    }`}
                  >
                    {status}
                    {active && <Check size={12} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Note</p>
            <button
              type="button"
              onClick={() => onEditNote?.(order.id, order.customer_note)}
              className="w-full text-left rounded-lg border border-white/10 bg-black/30 p-3 min-h-[5.5rem] hover:border-[#ce112d]/30 transition-colors"
            >
              <p className={`text-sm leading-relaxed ${order.customer_note ? 'text-zinc-300' : 'text-zinc-600'}`}>
                {order.customer_note || 'Add an internal note…'}
              </p>
              <p className="text-[10px] text-[#ce112d] mt-2 font-medium">Edit note</p>
            </button>
          </section>
        </div>

        {/* Steadfast courier */}
        <section className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={12} className="text-emerald-400" />
              Steadfast Courier
            </p>
            {order.tracking_code && (
              <a
                href={`https://steadfast.com.bd/t/${order.tracking_code}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                Track <ExternalLink size={10} />
              </a>
            )}
          </div>

          {order.tracking_code ? (
            <div className="space-y-1.5 text-xs">
              <p className="text-white font-mono font-semibold tracking-wide">{order.tracking_code}</p>
              <p className="text-zinc-500">
                Consignment: {order.steadfast_consignment_id || '—'}
                {order.steadfast_status ? ` · ${order.steadfast_status}` : ''}
              </p>
              <button
                type="button"
                disabled={sfBusy}
                onClick={refreshSteadfast}
                className="h-9 px-3 rounded-md text-[11px] font-semibold bg-white/5 border border-white/10 text-zinc-300 hover:text-white inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={12} className={sfBusy ? 'animate-spin' : ''} />
                Refresh status
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={sfBusy || order.status === 'Canceled' || order.status === 'Deleted'}
              onClick={bookSteadfast}
              className="w-full h-10 rounded-lg text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Truck size={14} />
              {sfBusy ? 'Booking…' : `Book courier · COD ৳${due}`}
            </button>
          )}
          {sfMsg && <p className="text-[11px] text-zinc-400 leading-snug">{sfMsg}</p>}
        </section>
      </div>

      {isModal && (
        <div className="shrink-0 p-4 border-t border-white/10 bg-black/40 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-lg bg-[#ce112d] text-white text-sm font-semibold"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
