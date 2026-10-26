import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, MapPin, Phone, User, Receipt, ArrowRight, Copy, Check, Package, Share2, Clock, Truck, Gift } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../api/client';
import { rememberGuestOrder } from '../utils/guestOrders';
import { getOptimizedUrl, mediaSizes } from '../utils/media';

const STATUS_STEPS = [
    { key: 'Pending', icon: Clock, labelBn: 'অর্ডার পেয়েছি', labelEn: 'Order received' },
    { key: 'Confirmed', icon: CheckCircle2, labelBn: 'কনফার্ম হয়েছে', labelEn: 'Confirmed' },
    { key: 'Shipped', icon: Truck, labelBn: 'কুরিয়ারে পাঠানো', labelEn: 'On the way' },
    { key: 'Delivered', icon: Package, labelBn: 'ডেলিভারি হয়েছে', labelEn: 'Delivered' },
];

function apiBase() {
    if (!API_URL || API_URL === '/') return '';
    return String(API_URL).replace(/\/$/, '');
}

function itemImageFromCart(item) {
    if (!item || typeof item !== 'object') return null;
    if (item.selectedColor && Array.isArray(item.available_colors)) {
        const matched = item.available_colors.find((c) => {
            const name = typeof c === 'object' ? c.name : c;
            return name && String(name).trim().toLowerCase() === String(item.selectedColor).trim().toLowerCase();
        });
        if (matched && typeof matched === 'object' && (matched.image || matched.image_url)) {
            return matched.image || matched.image_url;
        }
    }
    return item.image_url || item.image || (Array.isArray(item.images) ? item.images[0] : null) || null;
}

function normalizeStatus(raw) {
    const s = String(raw || 'Pending').trim();
    if (s === 'Canceled' || s === 'Cancelled') return 'Cancelled';
    if (s === 'Deleted') return 'Cancelled';
    if (STATUS_STEPS.some((step) => step.key === s)) return s;
    return 'Pending';
}

function statusStepIndex(status) {
    const key = normalizeStatus(status);
    if (key === 'Cancelled') return -1;
    return Math.max(0, STATUS_STEPS.findIndex((step) => step.key === key));
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

function orderFromCheckoutState(details) {
    if (!details?.id || !Array.isArray(details.items)) return null;
    const subtotal = Number(details.subtotal) || 0;
    const deliveryCharge = Number(details.deliveryCharge) || 0;
    const finalTotal = Number(details.finalTotal) || subtotal + deliveryCharge;
    const ref = String(details.senderNumber || '').trim();
    return {
        id: details.id,
        items: details.items.map((item) => ({
            id: item.id || null,
            name: item.name,
            selectedSize: item.selectedSize || null,
            selectedColor: item.selectedColor || null,
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0,
            image: itemImageFromCart(item),
        })),
        name: details.name,
        phone: details.phone,
        address: details.address,
        upazila: details.upazila || '',
        district: details.district || '',
        subtotal,
        deliveryCharge,
        finalTotal,
        status: 'Pending',
        isAdvancePaid: false,
        isFullyPaid: false,
        paymentPendingVerify: Boolean(ref),
        paidAmount: 0,
        dueOnDelivery: finalTotal,
        lastFourDigits: ref ? `${details.paymentMethod === 'bkash' ? 'bKash' : 'Payment'}: ${ref}` : '',
        trackCode: String(details.trackCode || details.track_code || '').replace(/\D/g, '').slice(0, 6),
        isGift: Boolean(details.isGift || details.is_gift),
        recipientName: details.recipientName || details.recipient_name || '',
        recipientPhone: details.recipientPhone || details.recipient_phone || '',
    };
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

function mapDbOrder(dbOrder, imageMap = {}) {
    const addressParts = (dbOrder.customer_address || '').split(' | ');
    const address = addressParts[0] || '';
    const locationParts = addressParts[1] ? addressParts[1].split(', ') : [];
    const district = locationParts[locationParts.length - 1] || '';
    const upazila = locationParts.length > 1 ? locationParts[0] : '';

    const parsedItems = (dbOrder.product_name || '').split(' + ').map(parseOrderLine);
    if (parsedItems.length === 1) {
        parsedItems[0].price = (parseFloat(dbOrder.product_price) || 0) / (parsedItems[0].quantity || 1);
        if (!parsedItems[0].id && dbOrder.product_id) parsedItems[0].id = dbOrder.product_id;
    } else {
        const qtySum = parsedItems.reduce((acc, i) => acc + i.quantity, 0) || 1;
        parsedItems.forEach((item) => {
            item.price = (parseFloat(dbOrder.product_price) || 0) / qtySum;
        });
    }
    parsedItems.forEach((item) => {
        if (item.id && imageMap[item.id]) item.image = imageMap[item.id];
        else if (!item.image && dbOrder.product_id && imageMap[dbOrder.product_id]) item.image = imageMap[dbOrder.product_id];
    });

    const rawLastDigits = dbOrder.last_four_digits || '';
    const ref = String(rawLastDigits).trim();
    const hasPaymentRef = Boolean(ref) && !/^cod$/i.test(ref);
    const isFullyPaid = dbOrder.payment_status === 'Fully Paid';
    const isAdvancePaid = isFullyPaid || Boolean(dbOrder.is_advance_paid) || dbOrder.payment_status === 'Advance Paid';
    const paymentPendingVerify = hasPaymentRef && !isAdvancePaid && !isFullyPaid;
    const subtotalVal = parseFloat(dbOrder.product_price) || 0;
    const deliveryChargeVal = parseFloat(dbOrder.delivery_charge) || 0;
    const totalVal = parseFloat(dbOrder.total_amount) || (subtotalVal + deliveryChargeVal);
    const defaultAdv = dbOrder.is_exclusive_order ? 500 : (dbOrder.delivery_area === 'mirsarai' && deliveryChargeVal === 0 ? 100 : deliveryChargeVal);
    let matchedAdvance = defaultAdv;
    const advRegex = /Advance\s*৳?(\d+)/i.exec(rawLastDigits);
    if (advRegex) matchedAdvance = parseFloat(advRegex[1]) || defaultAdv;
    const paidAmount = isFullyPaid ? totalVal : (isAdvancePaid ? matchedAdvance : 0);

    return {
        id: dbOrder.id,
        items: parsedItems,
        name: dbOrder.customer_name,
        phone: dbOrder.customer_phone,
        address,
        upazila,
        district,
        subtotal: subtotalVal,
        deliveryCharge: deliveryChargeVal,
        finalTotal: totalVal,
        status: normalizeStatus(dbOrder.status),
        isAdvancePaid,
        isFullyPaid,
        paymentPendingVerify,
        paidAmount,
        dueOnDelivery: Math.max(0, totalVal - paidAmount),
        lastFourDigits: rawLastDigits,
        trackCode: String(dbOrder.track_code || '').replace(/\D/g, '').slice(0, 6),
        isGift: dbOrder.is_gift === true || dbOrder.is_gift === 1 || dbOrder.is_gift === '1',
        recipientName: dbOrder.recipient_name || '',
        recipientPhone: dbOrder.recipient_phone || '',
    };
}

export default function OrderConfirmation() {
    const { orderId } = useParams();
    const location = useLocation();
    const { t, language } = useLanguage();
    const hasCheckoutState = Boolean(location.state?.orderDetails?.id);
    const [order, setOrder] = useState(() => orderFromCheckoutState(location.state?.orderDetails));
    const [loading, setLoading] = useState(!!orderId && !hasCheckoutState);
    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [statusPulse, setStatusPulse] = useState(0);

    const loadOrder = useCallback(async (silent = false) => {
        if (!orderId) return;
        if (!silent) setLoading(true);
        try {
            const res = await fetch(
                `${apiBase()}/api/orders/track?query=${encodeURIComponent(orderId)}`,
                { cache: 'no-store' }
            );
            const json = await res.json().catch(() => ({}));
            const rows = Array.isArray(json.data) ? json.data : [];
            const dbOrder = rows.find((r) => r.id === orderId) || rows[0] || null;
            if (!dbOrder) return;

            const idHints = [];
            if (dbOrder.product_id) idHints.push(dbOrder.product_id);
            String(dbOrder.product_name || '').split(' + ').forEach((line) => {
                const m = line.match(/\((?:PID):\s*([^)]*)\)/i);
                if (m?.[1]) idHints.push(m[1].trim());
            });
            const imageMap = await fetchProductImageMap(idHints);
            const mapped = mapDbOrder(dbOrder, imageMap);

            setOrder((prev) => {
                if (!prev) return mapped;
                const mergedItems = (mapped.items || []).map((item, idx) => ({
                    ...item,
                    image: item.image || prev.items?.[idx]?.image || null,
                }));
                return { ...prev, ...mapped, items: mergedItems };
            });
        } catch (err) {
            console.error('Failed to fetch order confirmation details:', err);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        if (!orderId) return undefined;
        if (!hasCheckoutState) loadOrder(false);
        else setLoading(false);

        const poll = setInterval(() => loadOrder(true), 20000);
        return () => clearInterval(poll);
    }, [orderId, hasCheckoutState, loadOrder]);

    useEffect(() => {
        const tick = setInterval(() => setStatusPulse((n) => n + 1), 1600);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        if (!order?.id) return;
        rememberGuestOrder({
            id: order.id,
            phone: order.phone,
            code: order.trackCode || '',
            name: order.items?.[0]?.name || '',
            total: order.finalTotal,
        });
    }, [order]);

    const handleCopyId = () => {
        if (order?.id) {
            navigator.clipboard.writeText(order.id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyCode = () => {
        if (!order?.trackCode) return;
        navigator.clipboard.writeText(order.trackCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleShareCode = async () => {
        if (!order?.trackCode) return;
        const page = `${window.location.origin}/account?track=1`;
        const text = language === 'bn'
            ? `বিগ বাজার ট্র্যাক কোড: ${order.trackCode}\nমোবাইল: ${order.phone || ''}\nট্র্যাক: ${page}`
            : `Big Bazar track code: ${order.trackCode}\nPhone: ${order.phone || ''}\nTrack: ${page}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: language === 'bn' ? 'অর্ডার ট্র্যাক কোড' : 'Order track code', text });
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }
        try {
            await navigator.clipboard.writeText(text);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        } catch (_) {}
    };

    if (loading) {
        return (
            <div className="max-w-xl mx-auto px-4 py-28 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 animate-pulse">
                    {language === 'bn' ? 'অর্ডার বিবরণ লোড হচ্ছে...' : 'Loading order details...'}
                </p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
                <div className="w-16 h-16 bg-red-50 text-[#ce112d] rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                    <ShoppingBag size={28} />
                </div>
                <div className="space-y-1.5">
                    <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                        {language === 'bn' ? 'অর্ডারটি পাওয়া যায়নি' : 'Order Not Found'}
                    </h1>
                    <p className="text-zinc-500 text-xs leading-relaxed max-w-sm mx-auto">
                        {language === 'bn'
                            ? 'দুঃখিত, আমরা এই আইডি দিয়ে কোনো অর্ডার খুঁজে পাইনি। অনুগ্রহ করে সঠিক অর্ডার আইডি ব্যবহার করুন।'
                            : 'Sorry, we could not find any order with this ID. Please make sure the order ID is correct.'}
                    </p>
                </div>
                <div className="pt-2">
                    <Link to="/" className="inline-flex items-center gap-2 bg-[#ce112d] hover:bg-[#b00e26] text-white px-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm active:scale-95">
                        {language === 'bn' ? 'হোমে ফিরে যান' : 'Back to Home'}
                    </Link>
                </div>
            </div>
        );
    }

    const shortId = String(order.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const orderStatus = normalizeStatus(order.status);
    const currentStep = statusStepIndex(order.status);

    return (
        <div className="max-w-lg mx-auto px-4 py-7 sm:py-10">
            <div className="text-center mb-5">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 size={30} />
                </div>
                <h1 className="mt-3 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                    {language === 'bn' ? 'অর্ডার সফল হয়েছে' : 'Order placed'}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                    {language === 'bn' ? 'ধন্যবাদ। আমরা আপনার অর্ডার পেয়েছি।' : 'Thank you. We have received your order.'}
                </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Track code — the main thing customers need */}
                {order.trackCode ? (
                    <div className="px-4 pt-5 pb-4 text-center border-b border-zinc-100">
                        <p className="text-sm font-semibold text-zinc-500">
                            {language === 'bn' ? 'ট্র্যাক কোড' : 'Track code'}
                        </p>
                        <p className="mt-1.5 text-3xl font-bold tracking-[0.18em] text-zinc-900">
                            {order.trackCode}
                        </p>
                        <p className="mt-2 text-sm text-zinc-500 leading-snug">
                            {language === 'bn'
                                ? 'অর্ডার ট্র্যাক করতে এই কোড রাখুন।'
                                : 'Keep this code to track your order.'}
                        </p>
                        <div className="mt-3.5 flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={handleCopyCode}
                                className="h-10 px-4 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-sm font-semibold text-zinc-800 inline-flex items-center gap-2"
                            >
                                {copiedCode ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                                {copiedCode ? (language === 'bn' ? 'কপি হয়েছে' : 'Copied') : (language === 'bn' ? 'কপি' : 'Copy')}
                            </button>
                            <button
                                type="button"
                                onClick={handleShareCode}
                                className="h-10 px-4 rounded-xl bg-[#ce112d] hover:bg-[#b00e26] text-white text-sm font-semibold inline-flex items-center gap-2"
                            >
                                <Share2 size={15} />
                                {language === 'bn' ? 'শেয়ার' : 'Share'}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyId}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600"
                            title={order.id}
                        >
                            <Receipt size={12} />
                            <span>{language === 'bn' ? 'অর্ডার নং' : 'Order no.'} {shortId}</span>
                            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                    </div>
                ) : (
                    <div className="px-4 pt-5 pb-4 border-b border-zinc-100 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-zinc-500">
                                {language === 'bn' ? 'অর্ডার নম্বর' : 'Order number'}
                            </p>
                            <p className="mt-1 text-base font-bold text-zinc-900 tracking-wide">{shortId}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyId}
                            className="h-10 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-700 inline-flex items-center gap-1.5"
                        >
                            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                            {copied ? (language === 'bn' ? 'কপি' : 'Copied') : (language === 'bn' ? 'কপি' : 'Copy')}
                        </button>
                    </div>
                )}

                <div className="p-4 sm:p-5 space-y-5">
                    {/* Status */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-800">
                                {language === 'bn' ? 'অর্ডার স্ট্যাটাস' : 'Order status'}
                            </p>
                            {orderStatus !== 'Cancelled' && orderStatus !== 'Delivered' && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ce112d]">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ce112d]/45" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ce112d]" />
                                    </span>
                                    {language === 'bn' ? 'আমরা কাজ করছি' : 'In progress'}
                                </span>
                            )}
                        </div>

                        {orderStatus === 'Cancelled' ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">
                                {language === 'bn'
                                    ? 'এই অর্ডারটি বাতিল হয়েছে। নতুন অর্ডার করতে চাইলে শপিং চালিয়ে যান।'
                                    : 'This order was cancelled. Continue shopping to place a new one.'}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-2.5 py-3.5">
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
                                                                    : 'bg-white border-zinc-200 text-zinc-300'
                                                        }`}
                                                    >
                                                        {active && (
                                                            <span
                                                                key={statusPulse}
                                                                className="absolute inset-0 rounded-full border-2 border-[#ce112d]/35 animate-ping"
                                                            />
                                                        )}
                                                        {done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={13} strokeWidth={2.25} />}
                                                    </div>
                                                    <p className={`text-[10px] font-semibold leading-tight ${
                                                        done || active ? 'text-zinc-800' : 'text-zinc-400'
                                                    }`}>
                                                        {language === 'bn' ? step.labelBn : step.labelEn}
                                                    </p>
                                                </div>
                                                {idx < STATUS_STEPS.length - 1 && (
                                                    <div className="flex-1 max-w-7 sm:max-w-9 mt-4 h-0.5 rounded-full overflow-hidden bg-zinc-200 shrink-0">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ${
                                                                idx < currentStep ? 'w-full bg-emerald-500' : 'w-0'
                                                            }`}
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                                <p className="mt-2.5 text-xs text-zinc-500 text-center leading-snug">
                                    {language === 'bn'
                                        ? 'স্ট্যাটাস বদলালে এখানে আপডেট দেখাবে।'
                                        : 'This bar updates when your order status changes.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="space-y-2.5">
                        <p className="text-sm font-semibold text-zinc-800">
                            {language === 'bn' ? 'পণ্য' : 'Items'}
                        </p>
                        <div className="space-y-2.5">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5 min-w-0">
                                        <div className="w-14 h-16 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 shrink-0">
                                            {item.image ? (
                                                <img
                                                    src={getOptimizedUrl(item.image, mediaSizes.thumbnail)}
                                                    alt={item.name || ''}
                                                    className="w-full h-full object-cover object-top"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                                    <Package size={18} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <p className="text-sm font-semibold text-zinc-900 leading-snug">
                                                <span className="text-zinc-500 font-medium mr-1">{item.quantity}x</span>
                                                {item.name}
                                            </p>
                                            {(item.selectedSize || item.selectedColor) && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.selectedSize && (
                                                        <span className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                                                            {language === 'bn' ? 'সাইজ' : 'Size'}: {item.selectedSize}
                                                        </span>
                                                    )}
                                                    {item.selectedColor && (
                                                        <span className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                                                            {language === 'bn' ? 'রঙ' : 'Color'}: {item.selectedColor}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-zinc-900 whitespace-nowrap">
                                        ৳{(parseFloat(item.price || 0) * item.quantity).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact + Delivery */}
                    <div className="space-y-2.5 pt-1 border-t border-zinc-100">
                        {order.isGift && (
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ce112d] bg-[#ce112d]/5 border border-[#ce112d]/15 rounded-full px-2.5 py-1">
                                <Gift size={12} />
                                {language === 'bn' ? 'গিফট অর্ডার' : 'Gift order'}
                            </div>
                        )}
                        <p className="text-sm font-semibold text-zinc-800">
                            {order.isGift
                                ? (language === 'bn' ? 'যোগাযোগ (অর্ডারকারী)' : 'Contact (buyer)')
                                : (language === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery address')}
                        </p>
                        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3.5 py-3 space-y-2 text-sm text-zinc-700">
                            <div className="flex items-center gap-2.5">
                                <User size={15} className="text-zinc-400 shrink-0" />
                                <span className="font-semibold text-zinc-900">{order.name}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Phone size={15} className="text-zinc-400 shrink-0" />
                                <span>{order.phone}</span>
                            </div>
                            {!order.isGift && (
                                <div className="flex items-start gap-2.5">
                                    <MapPin size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                                    <span className="leading-snug text-zinc-600">
                                        {order.address}{order.district ? ` · ${order.upazila ? `${order.upazila}, ` : ''}${order.district}` : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                        {order.isGift && (
                            <>
                                <p className="text-sm font-semibold text-zinc-800 pt-1">
                                    {language === 'bn' ? 'প্রাপক ও ডেলিভারি' : 'Recipient & delivery'}
                                </p>
                                <div className="rounded-xl bg-[#ce112d]/[0.03] border border-[#ce112d]/15 px-3.5 py-3 space-y-2 text-sm text-zinc-700">
                                    <div className="flex items-center gap-2.5">
                                        <Gift size={15} className="text-[#ce112d] shrink-0" />
                                        <span className="font-semibold text-zinc-900">{order.recipientName || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <Phone size={15} className="text-zinc-400 shrink-0" />
                                        <span>{order.recipientPhone || '—'}</span>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <MapPin size={15} className="text-zinc-400 shrink-0 mt-0.5" />
                                        <span className="leading-snug text-zinc-600">
                                            {order.address}{order.district ? ` · ${order.upazila ? `${order.upazila}, ` : ''}${order.district}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bill */}
                    <div className="space-y-2 pt-1 border-t border-zinc-100 text-sm">
                        <div className="flex justify-between text-zinc-500">
                            <span>{t('subtotal')}</span>
                            <span className="font-semibold text-zinc-800">৳{order.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-zinc-500">
                            <span>{t('delivery_charge')}</span>
                            <span className="font-semibold text-zinc-800">৳{order.deliveryCharge}</span>
                        </div>

                        {order.paymentPendingVerify && (
                            <div className="flex justify-between items-center text-blue-700 bg-blue-50 border border-blue-200/70 rounded-xl px-3 py-2 text-sm font-semibold">
                                <span>{language === 'bn' ? 'পেমেন্ট চেক করা হচ্ছে' : 'Payment is being checked'}</span>
                            </div>
                        )}

                        {order.isAdvancePaid && !order.isFullyPaid && (
                            <div className="flex justify-between items-center text-orange-700 bg-orange-50 border border-orange-200/70 rounded-xl px-3 py-2 text-sm font-semibold">
                                <span>{language === 'bn' ? 'অগ্রিম পরিশোধিত' : 'Advance paid'}</span>
                                <span>-৳{order.paidAmount}</span>
                            </div>
                        )}

                        {order.isFullyPaid && (
                            <div className="flex justify-between items-center text-green-700 bg-green-50 border border-green-200/70 rounded-xl px-3 py-2 text-sm font-semibold">
                                <span>{language === 'bn' ? 'সম্পূর্ণ পরিশোধিত' : 'Fully paid'}</span>
                                <span>-৳{order.paidAmount}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-end border-t border-zinc-200 pt-3 mt-1">
                            <div>
                                <p className="text-sm font-bold text-zinc-900">
                                    {order.isAdvancePaid || order.isFullyPaid
                                        ? (language === 'bn' ? 'হাতে পেয়ে দিবেন' : 'Pay on delivery')
                                        : (language === 'bn' ? 'মোট' : 'Total due')}
                                </p>
                                {order.isAdvancePaid && !order.isFullyPaid && (
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        {language === 'bn' ? 'বাকি টাকা ডেলিভারির সময়' : 'Remaining amount on delivery'}
                                    </p>
                                )}
                            </div>
                            <span className="text-xl font-extrabold text-[#ce112d]">৳{order.dueOnDelivery}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5">
                <Link
                    to="/"
                    className="w-full bg-[#ce112d] hover:bg-[#b00e26] text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
                >
                    <span>{language === 'bn' ? 'শপিং চালিয়ে যান' : 'Continue shopping'}</span>
                    <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    );
}

