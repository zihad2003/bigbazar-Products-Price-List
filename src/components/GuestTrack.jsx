import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle2, Truck, XCircle, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_URL } from '../api/client';
import { readGuestOrders, toAsciiDigits } from '../utils/guestOrders';

const STATUS = {
    Pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending', labelBn: 'অপেক্ষমান' },
    Confirmed: { icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Confirmed', labelBn: 'নিশ্চিত' },
    Shipped: { icon: Truck, color: 'text-violet-600', bg: 'bg-violet-50', label: 'Shipped', labelBn: 'পাঠানো হয়েছে' },
    Delivered: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Delivered', labelBn: 'পৌঁছেছে' },
    Cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Cancelled', labelBn: 'বাতিল' },
    Canceled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Cancelled', labelBn: 'বাতিল' },
};

function productLabel(name) {
    return String(name || '')
        .split(' + ')
        .map((part) => part.split('(')[0].trim())
        .filter(Boolean)
        .join(', ');
}

function apiBase() {
    return (!API_URL || API_URL === '/') ? '' : String(API_URL).replace(/\/$/, '');
}

export default function GuestTrack() {
    const { language } = useLanguage();
    const bn = language === 'bn';
    const [saved] = useState(() => readGuestOrders());
    const [phone, setPhone] = useState(saved[0]?.phone || '');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const lookup = async (phoneValue, codeValue) => {
        const cleanPhone = toAsciiDigits(phoneValue).replace(/[^\d+]/g, '');
        const cleanCode = toAsciiDigits(codeValue).trim();
        if (cleanPhone.replace(/\D/g, '').length < 10 || cleanCode.length < 6) {
            setResult(null);
            setError(bn ? 'মোবাইল নম্বর এবং কোড দুটোই দিন।' : 'Enter both the mobile number and the code.');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const params = new URLSearchParams({ phone: cleanPhone, code: cleanCode });
            const res = await fetch(`${apiBase()}/api/orders/track?${params}`, { cache: 'no-store' });
            const json = await res.json().catch(() => ({}));
            if (res.status === 429) {
                setError(bn ? 'অনেকবার চেষ্টা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।' : 'Too many tries. Please wait a minute.');
                return;
            }
            const row = Array.isArray(json.data) ? json.data[0] : null;
            if (!row) {
                setError(bn ? 'নম্বর আর কোড মিলছে না।' : 'That number and code do not match an order.');
                return;
            }
            setResult(row);
        } catch (_) {
            setError(bn ? 'এখন দেখা যাচ্ছে না। একটু পর আবার চেষ্টা করুন।' : 'Could not look that up. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = (event) => {
        event.preventDefault();
        lookup(phone, code);
    };

    const status = STATUS[result?.status] || {
        icon: Clock,
        color: 'text-zinc-600',
        bg: 'bg-zinc-100',
        label: result?.status || 'Pending',
        labelBn: result?.status || 'অপেক্ষমান',
    };
    const StatusIcon = status.icon;

    return (
        <div className="min-h-[60vh] px-4 py-10 md:py-14">
            <div className="w-full max-w-md mx-auto space-y-6">
                <div className="text-center space-y-2">
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
                </div>

                {saved.length > 0 && (
                    <div className="space-y-2">
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
                    </div>
                )}

                <form onSubmit={onSubmit} className="bg-surface-card border border-[var(--border-color)] rounded-2xl p-5 shadow-card space-y-4">
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
                        className="w-full h-12 rounded-xl bg-[#ce112d] hover:bg-[#b00e26] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        <Search size={18} />
                        {loading ? (bn ? 'খুঁজছি...' : 'Looking up...') : (bn ? 'অর্ডার দেখুন' : 'See order')}
                    </button>
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
                    )}
                </form>

                {result && (
                    <div className="bg-surface-card border border-[var(--border-color)] rounded-2xl p-5 shadow-card space-y-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${status.bg} ${status.color}`}>
                            <StatusIcon size={16} />
                            {bn ? status.labelBn : status.label}
                        </div>
                        <p className="text-base font-semibold text-content-primary">
                            {productLabel(result.product_name) || (bn ? 'অর্ডার' : 'Order')}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-content-secondary">{bn ? 'মোট' : 'Total'}</span>
                            <span className="font-bold text-content-primary">৳{Number(result.total_amount) || 0}</span>
                        </div>
                        {result.created_at && (
                            <p className="text-xs text-content-tertiary">
                                {new Date(result.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US', {
                                    day: 'numeric', month: 'short', year: 'numeric',
                                })}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-center gap-4 text-sm">
                    <Link to="/account" className="text-content-tertiary hover:text-content-primary">
                        {bn ? 'একাউন্টে সাইন ইন' : 'Sign in'}
                    </Link>
                    <Link to="/" className="text-content-tertiary hover:text-content-primary">
                        {bn ? 'কেনাকাটা চালিয়ে যান' : 'Continue shopping'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
