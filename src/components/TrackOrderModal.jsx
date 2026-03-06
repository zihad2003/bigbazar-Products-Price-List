import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShoppingBag, Package, Truck, CheckCircle2, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getOptimizedUrl, mediaSizes } from '../utils/media';
import { useLanguage } from '../contexts/LanguageContext';

const TrackOrderModal = ({ isOpen, onClose }) => {
    const { t, language } = useLanguage();
    const [searchInput, setSearchInput] = useState('');
    const [orders, setOrders] = useState([]);
    const [productImages, setProductImages] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    if (!isOpen) return null;

    const handleTrack = async (e) => {
        if (e) e.preventDefault();

        // Convert Bengali digits to English digits
        const bnToEn = str => str.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d));
        const input = bnToEn(searchInput).trim();

        // cleanInput: alphanumeric for general matching
        const cleanInput = input.replace(/[^a-zA-Z0-9]/g, '');
        // phoneInput: keeps digits and + for exact phone matching
        const phoneInput = input.replace(/[^0-9+]/g, '');
        // safeInput: allows spaces but removes commas (commas break Supabase .or() syntax)
        const safeInput = input.replace(/,/g, ' ').trim();

        if (cleanInput.length < 4) {
            setError(language === 'bn' ? 'কমপক্ষে ৪টি অক্ষর বা সংখ্যা দিন।' : 'Enter at least 4 characters.');
            return;
        }

        setLoading(true);
        setError('');
        setSearched(true);

        try {
            const isDigitsOnly = /^[0-9]+$/.test(cleanInput);
            const searchPattern = `%${cleanInput}%`;

            let query = supabase.from('orders').select('*');

            // Construct safe OR conditions. 
            // Avoid 'id.ilike' on UUID columns as it throws 400 error.
            // But we can search name, phone, address, and note.
            const conditions = [
                `customer_phone.ilike.${searchPattern}`,
                `customer_name.ilike.${searchPattern}`,
                `customer_address.ilike.${searchPattern}`,
                `customer_note.ilike.${searchPattern}`
            ];

            // If it's a phone number or close to it, search for variants (with spaces, last 10, etc.)
            if (isDigitsOnly || (cleanInput.length >= 6 && /^\d+$/.test(cleanInput))) {
                // Handle case where phone is stored with spaces: 017 111 222 33
                const flexible = cleanInput.split('').join('%');
                conditions.push(`customer_phone.ilike.%${flexible}%`);

                // Also search for the last 10 digits as that is common for BD numbers
                if (cleanInput.length >= 10) {
                    const last10 = cleanInput.slice(-10);
                    conditions.push(`customer_phone.ilike.%${last10}%`);
                }
            }

            // If it's a valid full UUID, search specifically by 'id'
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(input)) {
                conditions.push(`id.eq.${input}`);
            }

            // Literal search for the phone number as entered (most reliable for "track by full number")
            if (phoneInput.length >= 8) {
                conditions.push(`customer_phone.eq.${phoneInput}`);
                // Also try without + if they entered it, or with it if they didn't
                const altPhone = phoneInput.startsWith('+') ? phoneInput.slice(1) : `+${phoneInput}`;
                conditions.push(`customer_phone.eq.${altPhone}`);
            }

            // Fallback: search by name/address using the safeInput (no commas)
            if (safeInput.length >= 3) {
                const pattern = `%${safeInput}%`;
                conditions.push(`customer_name.ilike.${pattern}`);
                conditions.push(`customer_address.ilike.${pattern}`);
                // Also search for the literal safeInput in case there are specific characters saved
                conditions.push(`customer_phone.ilike.%${safeInput}%`);
            }

            query = query.or(conditions.join(','));

            const { data: orderData, error: fetchError } = await query.order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setOrders(orderData || []);

            // Fetch product images for these orders
            if (orderData && orderData.length > 0) {
                const productIds = [...new Set(orderData.map(o => o.product_id))];
                const { data: pData } = await supabase
                    .from('products')
                    .select('id, image_url, images, video_url')
                    .in('id', productIds);

                if (pData) {
                    const imgMap = {};
                    pData.forEach(p => {
                        let thumb = p.image_url || p.images?.[0];
                        if (!thumb && p.video_url) {
                            const match = p.video_url.match(/\/(reels|reel|p|tv)\/([a-zA-Z0-9_-]+)/);
                            const id = match ? match[2] : null;
                            if (id) thumb = `https://images.weserv.nl/?url=instagram.com/p/${id}/media/?size=l`;
                        }
                        imgMap[p.id] = thumb;
                    });
                    setProductImages(imgMap);
                }
            }
        } catch (err) {
            console.error('Tracking error:', err);
            setError(language === 'bn' ? 'তথ্য খুঁজে পেতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status) => {
        const statuses = {
            'Pending': { label: language === 'bn' ? 'অপেক্ষমাণ' : 'Pending', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: <Clock size={14} /> },
            'Shipped': { label: language === 'bn' ? 'পাঠানো হয়েছে' : 'Shipped', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: <Truck size={14} /> },
            'Delivered': { label: language === 'bn' ? 'হাতে পেয়েছেন' : 'Delivered', color: 'text-green-500', bg: 'bg-green-500/10', icon: <CheckCircle2 size={14} /> },
            'Canceled': { label: language === 'bn' ? 'বাতিল করা হয়েছে' : 'Canceled', color: 'text-red-500', bg: 'bg-red-500/10', icon: <X size={14} /> },
            'Deleted': { label: language === 'bn' ? 'বাতিল' : 'Deleted', color: 'text-red-500', bg: 'bg-red-500/10', icon: <X size={14} /> }
        };

        return statuses[status] || statuses['Pending'];
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] backdrop-blur-2xl flex items-center justify-center p-2 md:p-4"
                style={{ backgroundColor: 'var(--bg-overlay)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-xl border rounded-[28px] md:rounded-[40px] overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
                    style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 0 80px rgba(0,0,0,0.3)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-5 py-4 md:px-6 md:py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-[#ce112d] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
                                <Search className="text-white" size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black italic uppercase leading-none" style={{ color: 'var(--text-primary)' }}>{t('track_order')}</h2>
                                <p className="text-[#ce112d] text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">Order Status Tracking</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-all text-neutral-400">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Inquiry Form */}
                    <div className="p-4 md:p-6 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    inputMode="text"
                                    placeholder={language === 'bn' ? 'মোবাইল নম্বর বা অর্ডার আইডি দিন' : 'Enter Phone or Order ID'}
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full bg-black/20 border rounded-2xl py-3.5 md:py-4 px-10 text-sm font-bold focus:border-[#ce112d] outline-none transition-all"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#ce112d] text-white py-3.5 md:py-0 md:px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
                            >
                                {loading ? (language === 'bn' ? 'খোঁজা হচ্ছে...' : 'Searching...') : t('search')}
                            </button>
                        </form>
                        {error && <p className="text-red-500 text-[10px] font-bold mt-2 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
                        {!searched ? (
                            <div className="py-16 md:py-20 text-center space-y-4 opacity-50">
                                <ShoppingBag size={40} className="mx-auto text-neutral-500" />
                                <p className="text-xs md:text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{t('track_status')}</p>
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
                                                            {/* Thumbnail: generic for multi-item, product image for single */}
                                                            <div className="w-10 h-14 md:w-12 md:h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/5 flex flex-col items-center justify-center gap-0.5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                                                {isMulti ? (
                                                                    <>
                                                                        <ShoppingBag size={14} style={{ color: 'var(--text-muted)' }} />
                                                                        <span className="text-[8px] font-black" style={{ color: 'var(--text-muted)' }}>{itemParts.length}x</span>
                                                                    </>
                                                                ) : productImages[order.product_id] ? (
                                                                    <img src={getOptimizedUrl(productImages[order.product_id], { w: 100, h: 140 })} className="w-full h-full object-cover" alt="" />
                                                                ) : (
                                                                    <ShoppingBag size={18} className="text-neutral-800" />
                                                                )}
                                                            </div>

                                                            <div className="space-y-0.5 md:space-y-1 min-w-0">
                                                                <h4 className="font-black text-xs md:text-sm leading-tight group-hover:text-[#ce112d] transition-colors" style={{ color: 'var(--text-primary)' }}>
                                                                    {isMulti
                                                                        ? (language === 'bn'
                                                                            ? `${itemParts.length}টি পণ্যের অর্ডার`
                                                                            : `${itemParts.length} Items Order`)
                                                                        : order.product_name}
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

                                            <div className="grid grid-cols-2 gap-3 py-3 border-y" style={{ borderColor: 'var(--border-color)' }}>
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>
                                                        {language === 'bn' ? 'বিবরণ' : 'Details'}
                                                    </p>

                                                    {(() => {
                                                        const itemParts = (order.product_name || '').split(' + ');
                                                        const isMulti = itemParts.length > 1;
                                                        if (isMulti) {
                                                            return (
                                                                <p className="text-[10px] md:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                                    {language === 'bn'
                                                                        ? `${itemParts.length}টি পণ্য অর্ডার করা হয়েছে`
                                                                        : `${itemParts.length} items ordered`}
                                                                </p>
                                                            );
                                                        }
                                                        return (
                                                            <p className="text-[10px] md:text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                                                {order.size ? `${language === 'bn' ? 'সাইজ' : 'Size'}: ${order.size}` : ''}
                                                                {order.size && order.color ? ' | ' : ''}
                                                                {order.color ? `${language === 'bn' ? 'রঙ' : 'Color'}: ${order.color}` : ''}
                                                                {!order.size && !order.color ? (language === 'bn' ? 'অর্ডার ডিটেইলস' : 'Order Details') : ''}
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="space-y-0.5 text-right">
                                                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>{language === 'bn' ? 'মোট খরচ' : 'Total Amount'}</p>
                                                    <p className="text-[10px] md:text-xs font-black text-[#ce112d]">৳{order.total_amount}</p>
                                                </div>
                                            </div>

                                            {/* Advance Payment Status */}
                                            {order.is_advance_paid ? (
                                                <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                                                    <CheckCircle2 size={14} className="text-green-500" />
                                                    <div>
                                                        <p className="text-[9px] md:text-[10px] font-black uppercase text-green-500 tracking-tighter md:tracking-widest">{language === 'bn' ? 'পেমেন্ট নিশ্চিত হয়েছে ✅' : 'Payment Confirmed ✅'}</p>
                                                        <p className="text-[8px] md:text-[9px] font-medium text-green-500/70">{language === 'bn' ? 'আপনার অগ্রিম পেমেন্ট আমরা পেয়েছি।' : 'We have received your advance payment.'}</p>
                                                    </div>
                                                </div>
                                            ) : order.last_four_digits !== 'COD' && order.last_four_digits !== '' ? (
                                                <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                    <CreditCard size={14} className="text-blue-500" />
                                                    <div>
                                                        <p className="text-[9px] md:text-[10px] font-black uppercase text-blue-500 tracking-tighter md:tracking-widest">{language === 'bn' ? 'পেমেন্ট ভেরিফাই করা হচ্ছে...' : 'Verifying Payment...'}</p>
                                                        <p className="text-[8px] md:text-[9px] font-medium text-blue-500/70">{language === 'bn' ? 'এডমিন আপনার পেমেন্ট নম্বরটি যাচাই করছেন।' : 'Admin is verifying your payment reference.'}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-2.5 bg-neutral-500/5 border border-white/5 rounded-xl opacity-60">
                                                    <Truck size={14} style={{ color: 'var(--text-muted)' }} />
                                                    <div>
                                                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-tighter md:tracking-widest" style={{ color: 'var(--text-secondary)' }}>Cash on Delivery (COD)</p>
                                                        <p className="text-[8px] md:text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{language === 'bn' ? 'পণ্য হাতে পেয়ে টাকা পরিশোধ করবেন।' : 'Pay when you receive the product.'}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Note from Admin */}
                                            <div className="pt-1">
                                                <p className="text-[9px] md:text-[10px] italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                                    {order.status === 'Pending' && (language === 'bn' ? 'অর্ডারটি বর্তমানে প্রসেসিংয়ে আছে। খুব শীঘ্রই আপনাকে কল দেওয়া হবে।' : 'Your order is being processed. We will call you soon.')}
                                                    {order.status === 'Shipped' && (language === 'bn' ? 'আপনার পণ্যটি কুরিয়ারে পাঠানো হয়েছে। ১-৩ দিনের মধ্যে ইনশাআল্লাহ হাতে পাবেন।' : 'Product shipped via courier. Expect delivery within 1-3 days.')}
                                                    {order.status === 'Delivered' && (language === 'bn' ? 'পণ্যটি সফলভাবে পৌঁছে দেওয়া হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ!' : 'Product successfully delivered. Thanks for staying with us!')}
                                                    {order.status === 'Canceled' && (language === 'bn' ? 'দুঃখিত, কোনো বিশেষ কারণে অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।' : 'Sorry, your order was canceled. Please contact us for details.')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
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
            </motion.div>
        </AnimatePresence>
    );
};

export default TrackOrderModal;
