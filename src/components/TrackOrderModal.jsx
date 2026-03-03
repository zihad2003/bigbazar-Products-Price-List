import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShoppingBag, Package, Truck, CheckCircle2, AlertCircle, Clock, CreditCard } from 'lucide-react';
import { supabase } from '../supabaseClient';

const TrackOrderModal = ({ isOpen, onClose }) => {
    const [phone, setPhone] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    if (!isOpen) return null;

    const handleTrack = async (e) => {
        if (e) e.preventDefault();
        if (!phone || phone.length < 10) {
            setError('সঠিক মোবাইল নম্বর দিন।');
            return;
        }

        setLoading(true);
        setError('');
        setSearched(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('orders')
                .select('*')
                .eq('customer_phone', phone)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setOrders(data || []);
        } catch (err) {
            console.error('Tracking error:', err);
            setError('তথ্য খুঁজে পেতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status, isAdvPaid) => {
        const statuses = {
            'Pending': { label: 'অপেক্ষমাণ', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: <Clock size={14} /> },
            'Shipped': { label: 'পাঠানো হয়েছে', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: <Truck size={14} /> },
            'Delivered': { label: 'হাতে পেয়েছেন', color: 'text-green-500', bg: 'bg-green-500/10', icon: <CheckCircle2 size={14} /> },
            'Canceled': { label: 'বাতিল করা হয়েছে', color: 'text-red-500', bg: 'bg-red-500/10', icon: <X size={14} /> },
            'Deleted': { label: 'বাতিল', color: 'text-red-500', bg: 'bg-red-500/10', icon: <X size={14} /> }
        };

        const info = statuses[status] || statuses['Pending'];
        return info;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] backdrop-blur-2xl flex items-center justify-center p-4"
                style={{ backgroundColor: 'var(--bg-overlay)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-xl border rounded-[32px] md:rounded-[40px] overflow-hidden flex flex-col max-h-[90vh]"
                    style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 0 80px rgba(0,0,0,0.3)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#ce112d] rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20">
                                <Search className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic uppercase leading-none" style={{ color: 'var(--text-primary)' }}>অর্ডার ট্র্যাক করুন</h2>
                                <p className="text-[#ce112d] text-[9px] font-black uppercase tracking-widest mt-1">Track Your Order Status</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition-all" style={{ color: 'var(--text-muted)' }}>
                            <X size={22} />
                        </button>
                    </div>

                    {/* Inquiry Form */}
                    <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <form onSubmit={handleTrack} className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="tel"
                                    placeholder="আপনার মোবাইল নম্বর লিখুন..."
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-black/20 border rounded-2xl py-4 px-6 text-sm font-bold focus:border-[#ce112d] outline-none transition-all pl-12"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#ce112d] text-white px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
                            >
                                {loading ? 'খোঁজা হচ্ছে...' : 'খুঁজুন'}
                            </button>
                        </form>
                        {error && <p className="text-red-500 text-[10px] font-bold mt-2 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                        {!searched ? (
                            <div className="py-20 text-center space-y-4 opacity-50">
                                <ShoppingBag size={48} className="mx-auto text-neutral-500" />
                                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>আপনার অর্ডারের অবস্থা জানতে মোবাইল নম্বর দিন।</p>
                            </div>
                        ) : loading ? (
                            <div className="py-20 flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-[#ce112d] border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-black uppercase tracking-widest text-[#ce112d]">অর্ডার খোঁজা হচ্ছে...</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-20 text-center space-y-4">
                                <Package size={48} className="mx-auto text-neutral-400" />
                                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>দুঃখিত! এই নম্বরে কোনো অর্ডার পাওয়া যায়নি।</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>অনুগ্রহ করে সঠিক নম্বরটি দিয়ে আবার চেষ্টা করুন।</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ce112d] px-1">আপনার সকল অর্ডার ({orders.length})</p>
                                {orders.map(order => {
                                    const statusInfo = getStatusInfo(order.status);
                                    return (
                                        <div
                                            key={order.id}
                                            className="border rounded-2xl p-5 space-y-4 transition-all hover:border-[#ce112d]/30 group"
                                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1 min-w-0">
                                                    <h4 className="font-black text-sm truncate" style={{ color: 'var(--text-primary)' }}>{order.product_name}</h4>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                                        <span>{new Date(order.created_at).toLocaleDateString('bn-BD')}</span>
                                                        <span className="opacity-30">•</span>
                                                        <span>ID: #{String(order.id).slice(0, 8).toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusInfo.bg} ${statusInfo.color}`} style={{ borderColor: 'currentColor' }}>
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 py-4 border-y" style={{ borderColor: 'var(--border-color)' }}>
                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>বিবরণ</p>
                                                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        {order.size ? `Size: ${order.size}` : ''}
                                                        {order.size && order.color ? ' | ' : ''}
                                                        {order.color ? `Color: ${order.color}` : ''}
                                                        {!order.size && !order.color ? 'অর্ডার ডিটেইলস' : ''}
                                                    </p>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--text-muted)' }}>মোট খরচ</p>
                                                    <p className="text-xs font-black text-[#ce112d]">৳{order.total_amount}</p>
                                                </div>
                                            </div>

                                            {/* Advance Payment Status */}
                                            {order.is_advance_paid ? (
                                                <div className="flex items-center gap-2.5 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                                                    <CheckCircle2 size={16} className="text-green-500" />
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-green-500 tracking-widest">পেমেন্ট নিশ্চিত হয়েছে ✅</p>
                                                        <p className="text-[9px] font-medium text-green-500/70">আপনার অগ্রিম পেমেন্ট আমরা পেয়েছি।</p>
                                                    </div>
                                                </div>
                                            ) : order.last_four_digits !== 'COD' && order.last_four_digits !== '' ? (
                                                <div className="flex items-center gap-2.5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                    <CreditCard size={16} className="text-blue-500" />
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">পেমেন্ট ভেরিফাই করা হচ্ছে...</p>
                                                        <p className="text-[9px] font-medium text-blue-500/70">এডমিন আপনার পেমেন্ট নম্বরটি যাচাই করছেন।</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2.5 p-3 bg-neutral-500/5 border border-white/5 rounded-xl opacity-60">
                                                    <Truck size={16} style={{ color: 'var(--text-muted)' }} />
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Cash on Delivery (COD)</p>
                                                        <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>পণ্য হাতে পেয়ে টাকা পরিশোধ করবেন।</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Note from Admin (optional if we ever add it, but can show status desc) */}
                                            <div className="pt-2">
                                                <p className="text-[10px] italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                                    {order.status === 'Pending' && 'অর্ডারটি বর্তমানে প্রসেসিংয়ে আছে। খুব শীঘ্রই আপনাকে কল দেওয়া হবে।'}
                                                    {order.status === 'Shipped' && 'আপনার পণ্যটি কুরিয়ারে পাঠানো হয়েছে। ১-৩ দিনের মধ্যে ইনশাআল্লাহ হাতে পাবেন।'}
                                                    {order.status === 'Delivered' && 'পণ্যটি সফলভাবে পৌঁছে দেওয়া হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ!'}
                                                    {order.status === 'Canceled' && 'দুঃখিত, কোনো বিশেষ কারণে অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-gradient-to-t from-black/20 to-transparent border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <button
                            onClick={onClose}
                            className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            বন্ধ করুন
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TrackOrderModal;
