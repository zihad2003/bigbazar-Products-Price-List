import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package, Clock, CheckCircle2, Truck, XCircle, Search,
    User, Phone, MapPin, Check, ShoppingBag,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../api/client';
import { readGuestOrders, toAsciiDigits } from '../utils/guestOrders';
import { getOptimizedUrl, mediaSizes } from '../utils/media';

const STATUS_STEPS = [
    { key: 'Pending', icon: Clock, labelBn: 'অর্ডার পেয়েছি', labelEn: 'Order received' },
    { key: 'Confirmed', icon: CheckCircle2, labelBn: 'কনফার্ম হয়েছে', labelEn: 'Confirmed' },
    { key: 'Shipped', icon: Truck, labelBn: 'কুরিয়ারে পাঠানো', labelEn: 'On the way' },
    { key: 'Delivered', icon: Package, labelBn: 'ডেলিভারি হয়েছে', labelEn: 'Delivered' },
];

function apiBase() {
    return (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
}

function normalizeStatus(raw) {
    const s = String(raw || 'Pending').trim();
    if (s === 'Canceled' || s === 'Cancelled' || s === 'Deleted') return 'Cancelled';
    if (STATUS_STEPS.some((step) => step.key === s)) return s;
    return 'Pending';
}

function statusStepIndex(status) {
    const key = normalizeStatus(status);
    if (key === 'Cancelled') return -1;
    return Math.max(0, STATUS_STEPS.findIndex((step) => step.key === key));
}

function parseOrderLine(str) {
    const resItem = { name: str, selectedSize: null, selectedColor: null, quantity: 1, price: 0, id: null, image: null };
    const colorMatch = str.match(/\((?:Color|রঙ):\s*([^)]*)\)/i);
    const sizeMatch = str.match(/\((?:Size|সাইজ):\s*([^)]*)\)/i);
    const qtyMatch = str.match(/\((?:Qty|পরিমাণ):\s*(\d+)\)/i);
    const pidMatch = str.match(/\((?:PID):\s*([^)]*)\)/i);
    if (colorMatch) resItem.selectedColor = colorMatch[1].trim();
    if (sizeMatch) resItem.selectedSize = sizeMatch[1].trim();
    if (qtyMatch) resItem.quantity = parseInt(qtyMatch[1], 10);
    if (pidMatch) resItem.id = pidMatch[1].trim();
    resItem.name = str.split('(')[0].trim();
    return resItem;
}

async function fetchProductImageMap(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (!unique.length) return {};
    try {
        const res = await fetch(
            `${apiBase()}/api/products?ids=${encodeURIComponent(unique.join(','))}&limit=${Math.min(unique.length, 50)}`,
            { cache: 'no-store' }
        );
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json.data) ? json.data : [];
        const map = {};
        for (const row of rows) {
            if (!row?.id) continue;
            let images = row.images;
            if (typeof images === 'string') {
                try { images = JSON.parse(images); } catch (_) { images = []; }
            }
            map[row.id] = row.image_url || (Array.isArray(images) ? images[0] : null) || null;
        }
        return map;
    } catch (_) {
        return {};
    }
}

function mapTrackOrder(row, imageMap = {}) {
    const addressParts = String(row.customer_address || '').split(' | ');
    const address = addressParts[0] || '';
    const locationParts = addressParts[1] ? addressParts[1].split(', ') : [];
    const district = locationParts[locationParts.length - 1] || '';
    const upazila = locationParts.length > 1 ? locationParts[0] : '';

    const parsedItems = String(row.product_name || '').split(' + ').filter(Boolean).map(parseOrderLine);
    if (parsedItems.length === 1) {
        parsedItems[0].price = (parseFloat(row.product_price) || 0) / (parsedItems[0].quantity || 1);
        if (!parsedItems[0].id && row.product_id) parsedItems[0].id = row.product_id;
    } else if (parsedItems.length > 1) {
        const qtySum = parsedItems.reduce((acc, i) => acc + i.quantity, 0) || 1;
        parsedItems.forEach((item) => {
            item.price = (parseFloat(row.product_price) || 0) / qtySum;
        });
    }
    parsedItems.forEach((item) => {
        if (item.id && imageMap[item.id]) item.image = imageMap[item.id];
        else if (!item.image && row.product_id && imageMap[row.product_id]) item.image = imageMap[row.product_id];
    });

    const rawLastDigits = row.last_four_digits || '';
    const ref = String(rawLastDigits).trim();
    const hasPaymentRef = Boolean(ref) && !/^cod$/i.test(ref);
    const isFullyPaid = row.payment_status === 'Fully Paid';
    const isAdvancePaid = isFullyPaid || Boolean(row.is_advance_paid) || row.payment_status === 'Advance Paid';
    const paymentPendingVerify = hasPaymentRef && !isAdvancePaid && !isFullyPaid;
    const subtotal = parseFloat(row.product_price) || 0;
    const deliveryCharge = parseFloat(row.delivery_charge) || 0;
    const finalTotal = parseFloat(row.total_amount) || (subtotal + deliveryCharge);
    const defaultAdv = row.is_exclusive_order
        ? 500
        : (row.delivery_area === 'mirsarai' && deliveryCharge === 0 ? 100 : deliveryCharge);
    let matchedAdvance = defaultAdv;
    const advRegex = /Advance\s*৳?(\d+)/i.exec(rawLastDigits);
    if (advRegex) matchedAdvance = parseFloat(advRegex[1]) || defaultAdv;
    const paidAmount = isFullyPaid ? finalTotal : (isAdvancePaid ? matchedAdvance : 0);

    return {
        id: row.id,
        trackCode: String(row.track_code || '').replace(/\D/g, '').slice(0, 6),
        status: normalizeStatus(row.status),
        items: parsedItems.length ? parsedItems : [{ name: row.product_name || 'Order', quantity: 1, price: subtotal, image: null }],
        name: row.customer_name || '',
        phone: row.customer_phone || '',
        address,
        upazila,
        district,
        subtotal,
        deliveryCharge,
        finalTotal,
        isAdvancePaid,
        isFullyPaid,
        paymentPendingVerify,
        paidAmount,
        dueOnDelivery: Math.max(0, finalTotal - paidAmount),
        createdAt: row.created_at || null,
    };
}

function StatusTimeline({ status, language, pulseKey }) {
    const orderStatus = normalizeStatus(status);
    const currentStep = statusStepIndex(orderStatus);
    const bn = language === 'bn';

    if (orderStatus === 'Cancelled') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 flex items-center gap-2"
            >
                <XCircle size={16} />
                {bn
                    ? 'এই অর্ডারটি বাতিল হয়েছে। নতুন অর্ডার করতে চাইলে শপিং চালিয়ে যান।'
                    : 'This order was cancelled. Continue shopping to place a new one.'}
            </motion.div>
        );
    }

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-content-primary">
                    {bn ? 'অর্ডার স্ট্যাটাস' : 'Order status'}
                </p>
                {orderStatus !== 'Delivered' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ce112d]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ce112d]/45" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ce112d]" />
                        </span>
                        {bn ? 'আমরা কাজ করছি' : 'In progress'}
                    </span>
                )}
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-surface-input/60 px-2.5 py-3.5">
                <div className="flex items-start justify-between gap-1">
                    {STATUS_STEPS.map((step, idx) => {
                        const done = idx < currentStep;
                        const active = idx === currentStep;
                        const Icon = step.icon;
                        return (
                            <React.Fragment key={step.key}>
                                <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 text-center">
                                    <div
                                        className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${
                                            done
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : active
                                                    ? 'bg-[#ce112d] border-[#ce112d] text-white shadow-[0_0_0_3px_rgba(206,17,45,0.14)]'
                                                    : 'bg-surface-card border-[var(--border-color)] text-content-tertiary'
                                        }`}
                                    >
                                        {active && (
                                            <span
                                                key={pulseKey}
                                                className="absolute inset-0 rounded-full border-2 border-[#ce112d]/35 animate-ping"
                                            />
                                        )}
                                        {done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={13} strokeWidth={2.25} />}
                                    </div>
                                    <p className={`text-[10px] font-semibold leading-tight ${
                                        done || active ? 'text-content-primary' : 'text-content-tertiary'
                                    }`}>
                                        {bn ? step.labelBn : step.labelEn}
                                    </p>
                                </div>
                                {idx < STATUS_STEPS.length - 1 && (
                                    <div className="flex-1 max-w-7 sm:max-w-9 mt-4 h-0.5 rounded-full overflow-hidden bg-[var(--border-color)] shrink-0">
                                        <motion.div
                                            initial={false}
                                            animate={{ width: idx < currentStep ? '100%' : '0%' }}
                                            transition={{ duration: 0.7, ease: 'easeOut' }}
                                            className="h-full rounded-full bg-emerald-500"
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
                <p className="mt-2.5 text-xs text-content-tertiary text-center leading-snug">
                    {bn
                        ? 'স্ট্যাটাস বদলালে এখানে আপডেট দেখাবে।'
                        : 'This bar updates when your order status changes.'}
                </p>
            </div>
        </div>
    );
}

export default function GuestTrack() {
    const { language } = useLanguage();
    const bn = language === 'bn';
    const [saved] = useState(() => readGuestOrders());
    const [phone, setPhone] = useState(saved[0]?.phone || '');
    const [code, setCode] = useState(saved[0]?.code || saved[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [order, setOrder] = useState(null);
    const [statusPulse, setStatusPulse] = useState(0);

    useEffect(() => {
        if (!order || order.status === 'Cancelled' || order.status === 'Delivered') return undefined;
        const timer = setInterval(() => setStatusPulse((n) => n + 1), 2800);
        return () => clearInterval(timer);
    }, [order?.id, order?.status]);

    const lookup = useCallback(async (phoneValue, codeValue, opts = {}) => {
        const silent = Boolean(opts.silent);
        const cleanPhone = toAsciiDigits(phoneValue).replace(/[^\d+]/g, '');
        const cleanCode = toAsciiDigits(codeValue).trim();
        if (cleanPhone.replace(/\D/g, '').length < 10 || cleanCode.length < 6) {
            if (!silent) {
                setOrder(null);
                setError(bn ? 'মোবাইল নম্বর এবং কোড দুটোই দিন।' : 'Enter both the mobile number and the code.');
            }
            return;
        }
        if (!silent) {
            setLoading(true);
            setError('');
            setOrder(null);
        } else {
            setLoading(true);
        }
        try {
            const params = new URLSearchParams({ phone: cleanPhone, code: cleanCode });
            const res = await fetch(`${apiBase()}/api/orders/track?${params}`, { cache: 'no-store' });
            const json = await res.json().catch(() => ({}));
            if (res.status === 429) {
                if (!silent) {
                    setError(bn ? 'অনেকবার চেষ্টা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।' : 'Too many tries. Please wait a minute.');
                }
                return;
            }
            const row = Array.isArray(json.data) ? json.data[0] : null;
            if (!row) {
                if (!silent) {
                    setError(bn ? 'নম্বর আর কোড মিলছে না।' : 'That number and code do not match an order.');
                }
                return;
            }

            const idHints = [];
            if (row.product_id) idHints.push(row.product_id);
            String(row.product_name || '').split(' + ').forEach((line) => {
                const m = line.match(/\((?:PID):\s*([^)]*)\)/i);
                if (m?.[1]) idHints.push(m[1].trim());
            });
            const imageMap = await fetchProductImageMap(idHints);
            setOrder(mapTrackOrder(row, imageMap));
            setStatusPulse((n) => n + 1);
            setError('');
        } catch (_) {
            if (!silent) {
                setError(bn ? 'এখন দেখা যাচ্ছে না। একটু পর আবার চেষ্টা করুন।' : 'Could not look that up. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }, [bn]);

    // Open page → immediately load the saved order details + animated status
    useEffect(() => {
        const first = saved[0];
        if (!first?.phone) return undefined;
        const track = first.code || first.id || '';
        if (!track) return undefined;
        lookup(first.phone, track, { silent: true });
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount for first saved order
    }, []);

    const onSubmit = (event) => {
        event.preventDefault();
        lookup(phone, code);
    };

    const shortId = order?.id ? String(order.id).slice(0, 8).toUpperCase() : '';

    return (
        <div className="min-h-[60vh] px-4 py-10 md:py-14">
            <div className="w-full max-w-md mx-auto space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="text-center space-y-2"
                >
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-[#ce112d]/10 text-[#ce112d] flex items-center justify-center">
                        <Package size={28} />
                    </div>
                    <h1 className="text-2xl font-bold text-content-primary">
                        {bn ? 'অর্ডার ট্র্যাক করুন' : 'Track your order'}
                    </h1>
                    <p className="text-sm text-content-secondary leading-relaxed">
                        {bn
                            ? 'অর্ডারের মোবাইল নম্বর আর ৬ সংখ্যার কোড দিন।'
                            : 'Enter the mobile number from the order and the 6-digit code.'}
                    </p>
                </motion.div>

                {saved.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.3 }}
                        className="space-y-2"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                            {bn ? 'এই ফোনের অর্ডার' : 'On this phone'}
                        </p>
                        <div className="space-y-2">
                            {saved.map((row) => (
                                <button
                                    key={row.id}
                                    type="button"
                                    onClick={() => {
                                        setPhone(row.phone || '');
                                        setCode(row.code || row.id || '');
                                        lookup(row.phone || '', row.code || row.id || '');
                                    }}
                                    className="w-full text-left bg-surface-card border border-[var(--border-color)] rounded-2xl px-4 py-3 shadow-card hover:border-[#ce112d]/40 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-lg font-bold tracking-[0.18em] text-content-primary">
                                            {row.code || '••••••'}
                                        </span>
                                        <span className="text-xs font-semibold text-[#ce112d]">
                                            {bn ? 'স্ট্যাটাস' : 'Status'}
                                        </span>
                                    </div>
                                    {row.name && (
                                        <p className="mt-1 text-sm text-content-secondary truncate">{row.name}</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    onSubmit={onSubmit}
                    className="bg-surface-card border border-[var(--border-color)] rounded-2xl p-5 shadow-card space-y-4"
                >
                    <label className="block text-left">
                        <span className="block text-sm font-medium text-content-primary mb-1.5">
                            {bn ? 'মোবাইল নম্বর' : 'Mobile number'}
                        </span>
                        <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={phone}
                            onChange={(e) => setPhone(toAsciiDigits(e.target.value).replace(/[^\d+]/g, '').slice(0, 14))}
                            placeholder="01XXXXXXXXX"
                            className="w-full h-12 px-3 rounded-xl border border-[var(--border-color)] bg-surface-input text-content-primary text-base"
                        />
                    </label>
                    <label className="block text-left">
                        <span className="block text-sm font-medium text-content-primary mb-1.5">
                            {bn ? 'ট্র্যাক কোড বা অর্ডার আইডি' : 'Track code or order id'}
                        </span>
                        <input
                            type="text"
                            inputMode="text"
                            autoComplete="off"
                            value={code}
                            onChange={(e) => setCode(toAsciiDigits(e.target.value).slice(0, 80))}
                            placeholder={bn ? '৬ সংখ্যা, অথবা পুরো অর্ডার আইডি' : '6 digits, or the full order id'}
                            className="w-full h-12 px-3 rounded-xl border border-[var(--border-color)] bg-surface-input text-content-primary text-base"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-[#ce112d] hover:bg-[#b00e26] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] transition-transform"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Search size={18} />
                        )}
                        {loading ? (bn ? 'খুঁজছি...' : 'Looking up...') : (bn ? 'অর্ডার দেখুন' : 'See order')}
                    </button>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2"
                        >
                            {error}
                        </motion.p>
                    )}
                </motion.form>

                <AnimatePresence mode="wait">
                    {order && (
                        <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 18, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="bg-surface-card border border-[var(--border-color)] rounded-2xl shadow-card overflow-hidden"
                        >
                            <div className="px-4 pt-4 pb-3 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                                        {bn ? 'অর্ডার নম্বর' : 'Order number'}
                                    </p>
                                    <p className="mt-0.5 text-base font-bold text-content-primary tracking-wide">{shortId}</p>
                                </div>
                                {order.trackCode && (
                                    <div className="text-right">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-content-tertiary">
                                            {bn ? 'ট্র্যাক কোড' : 'Track code'}
                                        </p>
                                        <p className="mt-0.5 text-lg font-bold tracking-[0.14em] text-content-primary">
                                            {order.trackCode}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 space-y-5">
                                <StatusTimeline status={order.status} language={language} pulseKey={statusPulse} />

                                <div className="space-y-2.5">
                                    <p className="text-sm font-semibold text-content-primary">
                                        {bn ? 'পণ্য' : 'Items'}
                                    </p>
                                    <div className="space-y-2.5">
                                        {order.items.map((item, idx) => (
                                            <motion.div
                                                key={`${item.id || item.name}-${idx}`}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.08 + idx * 0.05 }}
                                                className="flex items-start justify-between gap-3"
                                            >
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <div className="w-14 h-16 rounded-lg overflow-hidden border border-[var(--border-color)] bg-surface-input shrink-0">
                                                        {item.image ? (
                                                            <img
                                                                src={getOptimizedUrl(item.image, mediaSizes.thumbnail)}
                                                                alt={item.name || ''}
                                                                className="w-full h-full object-cover object-top"
                                                                loading="lazy"
                                                                decoding="async"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-content-tertiary">
                                                                <ShoppingBag size={18} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 space-y-1">
                                                        <p className="text-sm font-semibold text-content-primary leading-snug">
                                                            <span className="text-content-secondary font-medium mr-1">{item.quantity}x</span>
                                                            {item.name}
                                                        </p>
                                                        {(item.selectedSize || item.selectedColor) && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {item.selectedSize && (
                                                                    <span className="text-xs text-content-secondary bg-surface-input border border-[var(--border-color)] px-2 py-0.5 rounded-md">
                                                                        {bn ? 'সাইজ' : 'Size'}: {item.selectedSize}
                                                                    </span>
                                                                )}
                                                                {item.selectedColor && (
                                                                    <span className="text-xs text-content-secondary bg-surface-input border border-[var(--border-color)] px-2 py-0.5 rounded-md">
                                                                        {bn ? 'রঙ' : 'Color'}: {item.selectedColor}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-content-primary whitespace-nowrap">
                                                    ৳{(parseFloat(item.price || 0) * item.quantity).toLocaleString()}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {(order.name || order.phone || order.address) && (
                                    <div className="space-y-2.5 pt-1 border-t border-[var(--border-color)]">
                                        <p className="text-sm font-semibold text-content-primary">
                                            {bn ? 'ডেলিভারি ঠিকানা' : 'Delivery address'}
                                        </p>
                                        <div className="rounded-xl bg-surface-input/60 border border-[var(--border-color)] px-3.5 py-3 space-y-2 text-sm text-content-secondary">
                                            {order.name && (
                                                <div className="flex items-center gap-2.5">
                                                    <User size={15} className="text-content-tertiary shrink-0" />
                                                    <span className="font-semibold text-content-primary">{order.name}</span>
                                                </div>
                                            )}
                                            {order.phone && (
                                                <div className="flex items-center gap-2.5">
                                                    <Phone size={15} className="text-content-tertiary shrink-0" />
                                                    <span>{order.phone}</span>
                                                </div>
                                            )}
                                            {order.address && (
                                                <div className="flex items-start gap-2.5">
                                                    <MapPin size={15} className="text-content-tertiary shrink-0 mt-0.5" />
                                                    <span className="leading-snug">
                                                        {order.address}
                                                        {order.district
                                                            ? ` · ${order.upazila ? `${order.upazila}, ` : ''}${order.district}`
                                                            : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 pt-1 border-t border-[var(--border-color)] text-sm">
                                    <div className="flex justify-between text-content-secondary">
                                        <span>{bn ? 'সাবটোটাল' : 'Subtotal'}</span>
                                        <span className="font-semibold text-content-primary">৳{order.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between text-content-secondary">
                                        <span>{bn ? 'ডেলিভারি চার্জ' : 'Delivery charge'}</span>
                                        <span className="font-semibold text-content-primary">৳{order.deliveryCharge}</span>
                                    </div>

                                    {order.paymentPendingVerify && (
                                        <div className="flex justify-between items-center text-blue-700 bg-blue-50 border border-blue-200/70 rounded-xl px-3 py-2 text-sm font-semibold">
                                            <span>{bn ? 'পেমেন্ট চেক করা হচ্ছে' : 'Payment is being checked'}</span>
                                        </div>
                                    )}

                                    {order.isAdvancePaid && !order.isFullyPaid && (
                                        <div className="flex justify-between items-center text-orange-700 bg-orange-50 border border-orange-200/70 rounded-xl px-3 py-2 text-sm font-semibold">
                                            <span>{bn ? 'অগ্রিম পরিশোধিত' : 'Advance paid'}</span>
                                            <span>-৳{order.paidAmount}</span>
                                        </div>
                                    )}

                                    {order.isFullyPaid && (
                                        <div className="flex justify-between items-center text-green-700 bg-green-50 border border-green-200/70 rounded-xl px-3 py-2 text-sm font-semibold">
                                            <span>{bn ? 'সম্পূর্ণ পরিশোধিত' : 'Fully paid'}</span>
                                            <span>-৳{order.paidAmount}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end border-t border-[var(--border-color)] pt-3 mt-1">
                                        <div>
                                            <p className="text-sm font-bold text-content-primary">
                                                {order.isAdvancePaid || order.isFullyPaid
                                                    ? (bn ? 'হাতে পেয়ে দিবেন' : 'Pay on delivery')
                                                    : (bn ? 'মোট' : 'Total due')}
                                            </p>
                                            {order.createdAt && (
                                                <p className="text-xs text-content-tertiary mt-0.5">
                                                    {new Date(order.createdAt).toLocaleDateString(bn ? 'bn-BD' : 'en-US', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                    })}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xl font-extrabold text-[#ce112d]">৳{order.dueOnDelivery}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-2.5 pt-1">
                    <Link
                        to="/"
                        className="w-full h-12 rounded-xl bg-[#ce112d] hover:bg-[#b00e26] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-transform"
                    >
                        {bn ? 'হোমে ফিরে কেনাকাটা করুন' : 'Back to shop'}
                    </Link>
                    <Link
                        to="/account"
                        className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-surface-card text-content-primary font-semibold text-sm flex items-center justify-center hover:border-[#ce112d]/40 transition-colors"
                    >
                        {bn ? 'অ্যাকাউন্টে লগ ইন করুন' : 'Log in to your account'}
                    </Link>
                    <p className="text-center text-xs text-content-tertiary leading-relaxed px-2">
                        {bn
                            ? 'লগ ইন করলে আপনার সব অর্ডার এক জায়গায় দেখা যাবে।'
                            : 'Log in to see all your orders in one place.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
