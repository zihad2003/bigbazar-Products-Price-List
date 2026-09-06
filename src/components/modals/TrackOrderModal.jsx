import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Package, Truck, CheckCircle2, AlertCircle, Clock, CreditCard, User, Phone, RefreshCw, LogIn } from 'lucide-react';
import { API_URL, getCustomerToken, bigBazarApi } from '../../api/client';
import { getOptimizedUrl, mediaSizes } from '../../utils/media';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const TrackOrderModal = ({ isOpen, onClose, onOpenAuth }) => {
    const { t, language } = useLanguage();
    const { user, isLoggedIn, loading: authLoading, updatePhone } = useAuth();
    const [orders, setOrders] = useState([]);
    const [productImages, setProductImages] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [phoneDraft, setPhoneDraft] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    const profilePhone = user?.phone || '';

    const loadOrders = useCallback(async () => {
        const token = getCustomerToken();
        if (!token) return;

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/account/orders?limit=50`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to load orders');

            const orderData = data.data || [];
            setOrders(orderData);

            if (orderData.length > 0) {
                const productIds = [...new Set(orderData.map(o => o.product_id).filter(Boolean))];
                if (productIds.length > 0) {
                    const { data: pData } = await bigBazarApi
                        .from('products')
                        .select('id, image_url, images, video_url')
                        .in('id', productIds);
                    if (pData) {
                        const imgMap = {};
                        pData.forEach(p => {
                            imgMap[p.id] = p.image_url || p.images?.[0] || null;
                        });
                        setProductImages(imgMap);
                    }
                }
            }
        } catch (err) {
            console.error('Tracking error:', err);
            setError(language === 'bn' ? 'অর্ডার লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Could not load orders. Please try again.');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setPhoneDraft(profilePhone || '');
        if (isLoggedIn && profilePhone) {
            loadOrders();
        } else {
            setOrders([]);
        }
    }, [isOpen, isLoggedIn, profilePhone, loadOrders]);

    const handleSavePhone = async (e) => {
        e?.preventDefault();
        const bnToEn = str => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
        const cleaned = bnToEn(phoneDraft).replace(/[^\d+]/g, '').trim();
        if (cleaned.replace(/\D/g, '').length < 11) {
            setError(language === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।' : 'Enter a valid 11-digit mobile number.');
            return;
        }
        setSavingPhone(true);
        setError('');
        const result = await updatePhone(cleaned);
        setSavingPhone(false);
        if (result.error) {
            setError(language === 'bn' ? 'নম্বর সেভ করা যায়নি।' : 'Could not save phone number.');
            return;
        }
        // loadOrders runs via useEffect when user.phone updates
    };

    const getStatusInfo = (status) => {
        const statuses = {
            'Pending': { label: language === 'bn' ? 'অপেক্ষমাণ' : 'Pending', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: <Clock size={14} /> },
            'Shipped': { label: language === 'bn' ? 'পাঠানো হয়েছে' : 'Shipped', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: <Truck size={14} /> },
            'Delivered': { label: language === 'bn' ? 'হাতে পেয়েছেন' : 'Delivered', color: 'text-green-500', bg: 'bg-green-500/10', icon: <CheckCircle2 size={14} /> },
            'Canceled': { label: language === 'bn' ? 'বাতিল করা হয়েছে' : 'Canceled', color: 'text-red-500', bg: 'bg-red-500/10', icon: <X size={14} /> },
            'Cancelled': { label: language === 'bn' ? 'বাতিল করা হয়েছে' : 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', icon: <X size={14} /> },
            'Deleted': { label: language === 'bn' ? 'বাতিল' : 'Deleted', color: 'text-red-500', bg: 'bg-red-500/10', icon: <X size={14} /> }
        };
        return statuses[status] || statuses['Pending'];
    };

    const cleanProductName = (name, order) => {
        if (!name) return '';
        let clean = name
            .replace(/\s*\((?:Color|রঙ):\s*[^)]*\)/gi, '')
            .replace(/\s*\((?:Size|সাইজ):\s*[^)]*\)/gi, '')
            .replace(/\s*\(SKU:\s*[^)]*\)/gi, '')
            .replace(/\s*\((?:Qty|পরিমাণ):\s*[^)]*\)/gi, '')
            .replace(/\s*\(PID:\s*[^)]*\)/gi, '')
            .replace(/\s+\d+\s*(?:piece|pc)\b/gi, '')
            .replace(/\s*(?:color|size|রঙ|সাইজ)\b/gi, '');
        if (order?.color) clean = clean.replace(new RegExp(`\\s*${order.color}\\s*`, 'gi'), ' ');
        if (order?.size) clean = clean.replace(new RegExp(`\\s*${order.size}\\s*`, 'gi'), ' ');
        return clean.replace(/\s+/g, ' ').trim();
    };

    if (!isOpen) return null;

    const needsAuth = !authLoading && !isLoggedIn;
    const needsPhone = isLoggedIn && !profilePhone;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[2500] flex items-center justify-center p-2 md:p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative z-10 w-full max-w-xl border rounded-[28px] md:rounded-[40px] overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
                    style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-5 py-4 md:px-6 md:py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-[#ce112d] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
                                <Package className="text-white" size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black italic uppercase leading-none" style={{ color: 'var(--text-primary)' }}>{t('track_order')}</h2>
                                <p className="text-[#ce112d] text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">
                                    {language === 'bn' ? 'প্রোফাইল নম্বর দিয়ে অর্ডার' : 'Orders via profile phone'}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-all text-neutral-400">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Auth / Phone / Status bar */}
                    <div className="p-4 md:p-6 border-b space-y-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        {authLoading ? (
                            <div className="flex items-center gap-2 text-xs font-bold opacity-60" style={{ color: 'var(--text-muted)' }}>
                                <div className="w-4 h-4 border-2 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                                {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
                            </div>
                        ) : needsAuth ? (
                            <div className="space-y-3">
                                <p className="text-xs font-bold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                    {language === 'bn'
                                        ? 'অর্ডার ট্র্যাক করতে সাইন ইন করুন। প্রোফাইলে মোবাইল নম্বর সেভ থাকলে আপনার অর্ডার লিস্ট দেখাবে।'
                                        : 'Sign in to track orders. We’ll show orders linked to the mobile number saved on your profile.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        if (onOpenAuth) onOpenAuth();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-[#ce112d] text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-red-900/20"
                                >
                                    <LogIn size={16} />
                                    {language === 'bn' ? 'সাইন ইন করুন' : 'Sign in'}
                                </button>
                            </div>
                        ) : needsPhone ? (
                            <form onSubmit={handleSavePhone} className="space-y-3">
                                <p className="text-xs font-bold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                    {language === 'bn'
                                        ? 'প্রোফাইলে মোবাইল নম্বর যোগ করুন — যে নম্বরে অর্ডার করেছেন।'
                                        : 'Add the mobile number you used when ordering.'}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder={language === 'bn' ? '01XXXXXXXXX' : '01XXXXXXXXX'}
                                            value={phoneDraft}
                                            onChange={(e) => setPhoneDraft(e.target.value)}
                                            className="w-full bg-black/20 border rounded-2xl py-3.5 px-10 text-sm font-bold focus:border-[#ce112d] outline-none transition-all"
                                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={savingPhone}
                                        className="bg-[#ce112d] text-white py-3.5 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                                    >
                                        {savingPhone
                                            ? (language === 'bn' ? 'সেভ...' : 'Saving...')
                                            : (language === 'bn' ? 'সেভ ও দেখুন' : 'Save & view')}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-[#ce112d]/10 text-[#ce112d] flex items-center justify-center shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>
                                            {language === 'bn' ? 'প্রোফাইল নম্বর' : 'Profile phone'}
                                        </p>
                                        <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>{profilePhone}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={loadOrders}
                                    disabled={loading}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider hover:border-[#ce112d]/40 transition-all disabled:opacity-50"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                >
                                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                    {language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
                                </button>
                            </div>
                        )}
                        {error && (
                            <p className="text-red-500 text-[10px] font-bold flex items-center gap-1">
                                <AlertCircle size={12} /> {error}
                            </p>
                        )}
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
                        {needsAuth || needsPhone ? (
                            <div className="py-16 md:py-20 text-center space-y-4 opacity-50">
                                <ShoppingBag size={40} className="mx-auto text-neutral-500" />
                                <p className="text-xs md:text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                                    {needsAuth
                                        ? (language === 'bn' ? 'সাইন ইন করলে অর্ডার দেখাবে' : 'Sign in to see your orders')
                                        : (language === 'bn' ? 'নম্বর সেভ করলে অর্ডার লিস্ট আসবে' : 'Save your phone to load orders')}
                                </p>
                            </div>
                        ) : loading ? (
                            <div className="py-20 flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-black uppercase tracking-widest text-[#ce112d]">{t('track_loading')}</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-16 md:py-20 text-center space-y-4">
                                <Package size={40} className="mx-auto text-neutral-400" />
                                <p className="text-xs md:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('no_order_found')}</p>
                                <p className="text-[10px] font-medium px-6" style={{ color: 'var(--text-muted)' }}>
                                    {language === 'bn'
                                        ? 'এই নম্বরে কোনো অর্ডার পাওয়া যায়নি। প্রোফাইলের নম্বরটি অর্ডারের নম্বরের সাথে মিলিয়ে নিন।'
                                        : 'No orders for this number. Make sure your profile phone matches the number used at checkout.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 md:space-y-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ce112d] px-1">{t('all_orders')} ({orders.length})</p>
                                {orders.map(order => {
                                    const statusInfo = getStatusInfo(order.status);
                                    return (
                                        <div
                                            key={order.id}
                                            className="border rounded-2xl p-4 md:p-5 space-y-3 md:space-y-4 transition-all hover:border-[#ce112d]/30 group"
                                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                {(() => {
                                                    const itemParts = (order.product_name || '').split(' + ');
                                                    const isMulti = itemParts.length > 1;
                                                    return (
                                                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                                            <div className="w-10 h-14 md:w-12 md:h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 flex flex-col items-center justify-center gap-0.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                                                {isMulti ? (
                                                                    <>
                                                                        <ShoppingBag size={14} style={{ color: 'var(--text-muted)' }} />
                                                                        <span className="text-[8px] font-black" style={{ color: 'var(--text-muted)' }}>{itemParts.length}x</span>
                                                                    </>
                                                                ) : productImages[order.product_id] ? (
                                                                    <img src={getOptimizedUrl(productImages[order.product_id], { w: 100, h: 140 })} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="" />
                                                                ) : (
                                                                    <ShoppingBag size={18} className="text-neutral-800" />
                                                                )}
                                                            </div>
                                                            <div className="space-y-0.5 md:space-y-1 min-w-0">
                                                                <h4 className="font-black text-xs md:text-sm leading-tight group-hover:text-[#ce112d] transition-colors" style={{ color: 'var(--text-primary)' }}>
                                                                    {isMulti
                                                                        ? (language === 'bn' ? `${itemParts.length}টি পণ্যের অর্ডার` : `${itemParts.length} Items Order`)
                                                                        : cleanProductName(order.product_name, order)}
                                                                </h4>
                                                                <div className="flex flex-col gap-0.5 text-[9px] md:text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{new Date(order.created_at).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                                        <span className="text-neutral-500">•</span>
                                                                        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    <span className="text-[#ce112d]">ID: #{String(order.id).slice(0, 8).toUpperCase()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div className={`shrink-0 flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest border ${statusInfo.bg} ${statusInfo.color}`} style={{ borderColor: 'currentColor' }}>
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </div>
                                            </div>

                                            <div className="py-3 border-y space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                                                <div className="rounded-xl p-3 md:p-4 space-y-2 border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                                                    <div className="flex justify-between text-[10px] md:text-[11px]">
                                                        <span className="font-bold opacity-70" style={{ color: 'var(--text-muted)' }}>
                                                            {language === 'bn' ? `আইটেম মূল্য (${(order.product_name || '').split(' + ').length} pcs)` : `Items (${(order.product_name || '').split(' + ').length} pcs)`}
                                                        </span>
                                                        <span className="font-black" style={{ color: 'var(--text-primary)' }}>৳{order.product_price || (order.total_amount - (order.delivery_charge || 0))}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] md:text-[11px]">
                                                        <span className="font-bold opacity-70" style={{ color: 'var(--text-muted)' }}>
                                                            {language === 'bn' ? `ডেলিভারি (${order.delivery_area || 'Outside'})` : `Delivery (${order.delivery_area || 'Outside'})`}
                                                        </span>
                                                        <span className="font-black" style={{ color: 'var(--text-primary)' }}>৳{order.delivery_charge || 0}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 mt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-70" style={{ color: 'var(--text-muted)' }}>{language === 'bn' ? 'সর্বমোট' : 'Total'}</span>
                                                        <span className="text-xs md:text-sm font-black text-[#ce112d] italic">৳{order.total_amount}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#ce112d]">{language === 'bn' ? 'ডেলিভারির সময় প্রদেয়' : 'Due on Delivery'}</span>
                                                        <span className="text-sm md:text-base font-black italic" style={{ color: 'var(--text-primary)' }}>
                                                        ৳{(() => {
                                                            if (order.payment_status === 'Fully Paid') return 0;
                                                            if (!order.is_advance_paid) return order.total_amount;
                                                            const charge = parseFloat(order.delivery_charge) || 0;
                                                            const advance = order.is_exclusive_order ? 500 : (order.delivery_area === 'mirsarai' && charge === 0 ? 100 : charge);
                                                            return order.total_amount - advance;
                                                        })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {order.is_advance_paid ? (
                                                <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                                                    <CheckCircle2 size={14} className="text-green-500" />
                                                    <div>
                                                        <p className="text-[9px] md:text-[10px] font-black uppercase text-green-500 tracking-tighter md:tracking-widest">{language === 'bn' ? 'পেমেন্ট নিশ্চিত হয়েছে' : 'Payment Confirmed'}</p>
                                                    </div>
                                                </div>
                                            ) : order.last_four_digits !== 'COD' && order.last_four_digits !== '' ? (
                                                <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                    <CreditCard size={14} className="text-blue-500" />
                                                    <p className="text-[9px] md:text-[10px] font-black uppercase text-blue-500">{language === 'bn' ? 'পেমেন্ট ভেরিফাই করা হচ্ছে...' : 'Verifying Payment...'}</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-2.5 bg-neutral-500/5 border border-white/5 rounded-xl opacity-60">
                                                    <Truck size={14} style={{ color: 'var(--text-muted)' }} />
                                                    <p className="text-[9px] md:text-[10px] font-black uppercase" style={{ color: 'var(--text-secondary)' }}>Cash on Delivery (COD)</p>
                                                </div>
                                            )}

                                            <div className="pt-1">
                                                <p className="text-[9px] md:text-[10px] italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                                    {order.status === 'Pending' && (language === 'bn' ? 'অর্ডারটি বর্তমানে প্রসেসিংয়ে আছে। খুব শীঘ্রই আপনাকে কল দেওয়া হবে।' : 'Your order is being processed. We will call you soon.')}
                                                    {order.status === 'Shipped' && (language === 'bn' ? 'আপনার পণ্যটি কুরিয়ারে পাঠানো হয়েছে। ১-৩ দিনের মধ্যে ইনশাআল্লাহ হাতে পাবেন।' : 'Product shipped via courier. Expect delivery within 1-3 days.')}
                                                    {order.status === 'Delivered' && (language === 'bn' ? 'পণ্যটি সফলভাবে পৌঁছে দেওয়া হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ!' : 'Product successfully delivered. Thanks for staying with us!')}
                                                    {(order.status === 'Canceled' || order.status === 'Cancelled') && (language === 'bn' ? 'দুঃখিত, কোনো বিশেষ কারণে অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।' : 'Sorry, your order was canceled. Please contact us for details.')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 md:p-6 bg-gradient-to-t from-black/20 to-transparent border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <button
                            onClick={onClose}
                            className="w-full py-3 md:py-4 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TrackOrderModal;
