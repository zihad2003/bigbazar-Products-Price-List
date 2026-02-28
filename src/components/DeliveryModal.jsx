import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, MapPin, CreditCard, AlertCircle, CheckCircle2, ShoppingBag, User, Phone, Home, Copy, Check, Wallet, ChevronDown, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { allDistricts, chattogramUpazilas, CHATTOGRAM_DISTRICT, getDeliveryInfo } from '../data/bdLocations';

const DeliveryModal = ({ isOpen, onClose, product, contactInfo, selectedSize, selectedColor }) => {
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        district: '',
        upazila: '',
        senderNumber: '',
        note: '',
        paymentMethod: 'cod'
    });

    if (!isOpen) return null;

    const bKashNumber = "01857045449";

    // Only show upazila dropdown for Chattogram district
    const needsUpazila = formData.district === CHATTOGRAM_DISTRICT;
    const isLocationComplete = formData.district && (!needsUpazila || formData.upazila);

    // Auto-calculate delivery info
    const deliveryInfo = isLocationComplete
        ? getDeliveryInfo(formData.district, formData.upazila)
        : null;

    const deliveryCharge = deliveryInfo?.charge ?? 0;

    const calculateTotal = () => {
        if (!deliveryInfo) return Number(product.price);
        return Number(product.price) + deliveryInfo.charge;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'senderNumber') {
            setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9+]/g, '') }));
            return;
        }
        if (name === 'phone') {
            setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9+]/g, '') }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(bKashNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const validateBDNumber = (number) => {
        const cleanNumber = number.replace(/[+]/g, '');
        return /^(?:88)?01[3-9]\d{8}$/.test(cleanNumber);
    };

    const handleConfirmOrder = async () => {
        if (!formData.name || !formData.phone || !formData.address) {
            setError("অনুগ্রহ করে সব তথ্য পূরণ করুন (নাম, ফোন, ঠিকানা)।");
            return;
        }
        if (!validateBDNumber(formData.phone)) {
            setError("সঠিক মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)।");
            return;
        }
        if (!formData.district) {
            setError("⚠️ অনুগ্রহ করে আপনার জেলা নির্বাচন করুন।");
            return;
        }
        if (needsUpazila && !formData.upazila) {
            setError("⚠️ অনুগ্রহ করে আপনার উপজেলা নির্বাচন করুন।");
            return;
        }
        if (formData.paymentMethod === 'bkash' && !formData.senderNumber) {
            setError("যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি দিন।");
            return;
        }
        if (formData.paymentMethod === 'cod' && deliveryCharge > 0 && !formData.senderNumber) {
            setError(`ডেলিভারি চার্জ ৳${deliveryCharge} বিকাশে পাঠিয়ে প্রেরকের নম্বরটি দিন।`);
            return;
        }

        setIsSubmitting(true);
        setError('');

        const locationStr = formData.upazila
            ? `${formData.upazila}, ${formData.district}`
            : formData.district;

        try {
            const { error: insertError } = await supabase
                .from('orders')
                .insert([{
                    product_id: product.id,
                    product_name: product.name,
                    product_price: parseFloat(product.price),
                    customer_name: formData.name,
                    customer_phone: formData.phone,
                    customer_address: `${formData.address} | ${locationStr}`,
                    delivery_area: deliveryInfo.area,
                    delivery_charge: deliveryCharge,
                    total_amount: calculateTotal(),
                    last_four_digits: formData.senderNumber || (formData.paymentMethod === 'cod' ? 'COD' : ''),
                    status: 'Pending',
                    size: selectedSize || null,
                    color: selectedColor || null,
                    customer_note: formData.note || null
                }]);
            if (insertError) throw insertError;
            setIsSuccess(true);
        } catch (err) {
            setError("অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            console.error("Supabase Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const needsAdvancePayment = formData.paymentMethod === 'bkash' ||
        (formData.paymentMethod === 'cod' && deliveryInfo && deliveryCharge > 0);

    const handleSubmitReview = async () => {
        if (rating === 0) return;
        try {
            await supabase.from('reviews').insert([{
                rating,
                comment: reviewText || null,
                customer_name: formData.name || 'Anonymous',
                product_id: product.id || null,
                product_name: product.name || null
            }]);
        } catch (err) {
            console.error('Review submit error:', err);
        }
        setReviewSubmitted(true);
    };

    if (isSuccess) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[250] backdrop-blur-2xl flex items-center justify-center p-4"
                    style={{ backgroundColor: 'var(--bg-overlay)' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="border rounded-[32px] p-8 max-w-sm w-full text-center space-y-5"
                        style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)' }}
                    >
                        {/* Order confirmed header */}
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="text-green-500" size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black italic uppercase" style={{ color: 'var(--text-primary)' }}>Order Confirmed!</h2>
                            <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে।</p>
                        </div>

                        {/* Review section */}
                        {!reviewSubmitted ? (
                            <div className="rounded-2xl border p-4 space-y-4 text-left" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                <p className="text-xs font-bold text-center" style={{ color: 'var(--text-secondary)' }}>
                                    আপনার অভিজ্ঞতা কেমন ছিল? ⭐
                                </p>

                                {/* Star Rating */}
                                <div className="flex justify-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="transition-transform hover:scale-110 active:scale-95"
                                        >
                                            <Star
                                                size={32}
                                                className={`transition-colors ${star <= (hoverRating || rating)
                                                        ? 'text-yellow-400 fill-yellow-400'
                                                        : ''
                                                    }`}
                                                style={star > (hoverRating || rating) ? { color: 'var(--border-color)' } : {}}
                                            />
                                        </button>
                                    ))}
                                </div>

                                {/* Comment */}
                                {rating > 0 && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                        <textarea
                                            value={reviewText}
                                            onChange={(e) => setReviewText(e.target.value)}
                                            placeholder="আপনার মতামত লিখুন (ঐচ্ছিক)"
                                            rows="2"
                                            className="w-full border rounded-xl py-2.5 px-3 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                        />
                                    </motion.div>
                                )}

                                {/* Submit review */}
                                {rating > 0 && (
                                    <button
                                        onClick={handleSubmitReview}
                                        className="w-full py-2.5 bg-[#ce112d] text-white rounded-xl font-bold text-sm transition-all active:scale-95"
                                    >
                                        রিভিউ দিন ✨
                                    </button>
                                )}
                            </div>
                        ) : (
                            <motion.p
                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                className="text-sm font-bold text-green-500"
                            >
                                ধন্যবাদ আপনার রিভিউয়ের জন্য! 💚
                            </motion.p>
                        )}

                        <button onClick={onClose} className="w-full py-4 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_rgba(206,17,45,0.3)] transition-all active:scale-95">
                            Back To Shop
                        </button>

                        {!reviewSubmitted && rating === 0 && (
                            <button onClick={onClose} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                এড়িয়ে যান
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[250] backdrop-blur-2xl flex items-center justify-center p-3 md:p-6"
                style={{ backgroundColor: 'var(--bg-overlay)' }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 40 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-lg border rounded-[32px] md:rounded-[40px] overflow-hidden"
                    style={{ backgroundColor: 'var(--modal-bg)', borderColor: 'var(--border-color)', boxShadow: '0 0 80px rgba(0,0,0,0.2)' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-5 py-4 md:px-8 md:py-5 border-b flex items-center justify-between bg-gradient-to-r from-[#ce112d]/10 to-transparent" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#ce112d] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(206,17,45,0.4)]">
                                <ShoppingBag className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg md:text-xl font-black italic uppercase leading-none" style={{ color: 'var(--text-primary)' }}>
                                    অর্ডার ফর্ম
                                </h2>
                                <p className="text-[#ce112d] text-[9px] font-black uppercase tracking-[0.2em] mt-1">
                                    Quick Checkout
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full transition-all" style={{ color: 'var(--text-muted)' }}>
                            <X size={22} />
                        </button>
                    </div>

                    {/* Form Body */}
                    <div className="p-5 md:p-8 overflow-y-auto max-h-[75vh] md:max-h-[70vh] no-scrollbar space-y-5">

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="p-3.5 bg-[#ce112d]/10 border border-[#ce112d]/20 rounded-2xl flex items-center gap-3 text-[#ce112d] text-xs font-bold"
                                >
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ===== Customer Info ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                👤 আপনার তথ্য
                            </h4>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                <input type="text" name="name" placeholder="আপনার নাম" value={formData.name} onChange={handleInputChange}
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-muted)' }} />
                                <input type="tel" name="phone" placeholder="মোবাইল নাম্বার (01XXXXXXXXX)" value={formData.phone} onChange={handleInputChange}
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            </div>
                            <div className="relative">
                                <Home className="absolute left-3.5 top-3" size={16} style={{ color: 'var(--text-muted)' }} />
                                <textarea name="address" placeholder="বাড়ি/হোল্ডিং, রাস্তা, গ্রাম/এলাকা" value={formData.address} onChange={handleInputChange} rows="2"
                                    className="w-full border rounded-xl py-3 pl-10 pr-4 text-sm focus:border-[#ce112d] outline-none transition-all resize-none"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            </div>
                        </div>

                        {/* ===== Delivery Area Selection ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                📍 ডেলিভারি এরিয়া <span className="text-[#ce112d]">*</span>
                            </h4>

                            {/* District + Upazila in a row */}
                            <div className={`grid gap-2 ${needsUpazila ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {/* District */}
                                <div className="relative">
                                    <select
                                        value={formData.district}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, district: e.target.value, upazila: '' }));
                                            if (error) setError('');
                                        }}
                                        className="w-full border rounded-xl py-3 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: formData.district ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                    >
                                        <option value="">জেলা নির্বাচন করুন</option>
                                        {allDistricts.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                                </div>

                                {/* Upazila — only for Chattogram */}
                                {needsUpazila && (
                                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="relative">
                                        <select
                                            value={formData.upazila}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, upazila: e.target.value }));
                                                if (error) setError('');
                                            }}
                                            className="w-full border rounded-xl py-3 pl-4 pr-10 text-sm focus:border-[#ce112d] outline-none transition-all appearance-none cursor-pointer"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: formData.upazila ? 'var(--text-primary)' : 'var(--text-muted)' }}
                                        >
                                            <option value="">উপজেলা নির্বাচন করুন</option>
                                            {chattogramUpazilas.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                                    </motion.div>
                                )}
                            </div>

                            {/* Auto-detected delivery charge badge */}
                            {deliveryInfo && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl ${deliveryInfo.charge === 0
                                        ? 'bg-green-500/10 border border-green-500/20'
                                        : 'bg-[#ce112d]/5 border border-[#ce112d]/10'
                                        }`}
                                >
                                    <MapPin size={14} className={deliveryInfo.charge === 0 ? 'text-green-500' : 'text-[#ce112d]'} />
                                    <span className={`text-xs font-black ${deliveryInfo.charge === 0 ? 'text-green-500' : 'text-[#ce112d]'}`}>
                                        {deliveryInfo.label}
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        {/* ===== Note (Optional) ===== */}
                        <div>
                            <input type="text" name="note" placeholder="📝 বিশেষ নোট (Optional)" value={formData.note} onChange={handleInputChange}
                                className="w-full border rounded-xl py-3 px-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                        </div>

                        {/* ===== Order Summary ===== */}
                        <div className="rounded-2xl border p-4 space-y-2.5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                            {(selectedSize || selectedColor) && (
                                <div className="flex items-center gap-2 pb-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                    {selectedSize && <span className="px-2 py-1 bg-[#ce112d]/10 rounded-md text-[9px] font-black text-[#ce112d] uppercase">Size: {selectedSize}</span>}
                                    {selectedColor && <span className="px-2 py-1 border rounded-md text-[9px] font-black uppercase" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>Color: {selectedColor}</span>}
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>পণ্যের দাম</span>
                                <span className="font-black" style={{ color: 'var(--text-primary)' }}>৳{product.price}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>ডেলিভারি</span>
                                <span className="font-black" style={{ color: deliveryInfo?.charge === 0 ? '#22c55e' : 'var(--text-primary)' }}>
                                    {deliveryInfo ? (deliveryInfo.charge === 0 ? 'ফ্রি ✅' : `৳${deliveryInfo.charge}`) : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-2.5 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                <span className="text-sm font-black text-[#ce112d] italic">সর্বমোট</span>
                                <span className="text-xl font-black text-[#ce112d]">৳{calculateTotal()}</span>
                            </div>
                        </div>

                        {/* ===== Payment Method ===== */}
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--text-muted)' }}>
                                💳 পেমেন্ট
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'cod', label: 'Cash on Delivery', icon: <Truck size={16} /> },
                                    { id: 'bkash', label: 'bKash Payment', icon: <CreditCard size={16} /> }
                                ].map(m => (
                                    <button key={m.id} type="button"
                                        onClick={() => setFormData(p => ({ ...p, paymentMethod: m.id }))}
                                        className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${formData.paymentMethod === m.id ? 'border-[#ce112d] bg-[#ce112d]/10' : ''}`}
                                        style={formData.paymentMethod !== m.id ? { borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' } : {}}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.paymentMethod === m.id ? 'bg-[#ce112d] text-white' : ''}`}
                                            style={formData.paymentMethod !== m.id ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                            {m.icon}
                                        </div>
                                        <p className={`text-[10px] font-black uppercase ${formData.paymentMethod === m.id ? 'text-[#ce112d]' : ''}`}
                                            style={formData.paymentMethod !== m.id ? { color: 'var(--text-muted)' } : {}}>{m.label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ===== bKash / Advance Payment ===== */}
                        {needsAdvancePayment && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                                <div className="bg-[#ce112d]/5 border border-[#ce112d]/10 rounded-xl p-3 space-y-3">
                                    <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                                        {formData.paymentMethod === 'cod' && deliveryCharge > 0
                                            ? <>ডেলিভারি চার্জ <strong className="text-[#ce112d]">৳{deliveryCharge}</strong> বিকাশে সেন্ড মানি করুন। পণ্যের টাকা হাতে পেয়ে দিবেন।</>
                                            : <>সম্পূর্ণ টাকা <strong className="text-[#ce112d]">৳{calculateTotal()}</strong> বিকাশে সেন্ড মানি করুন।</>}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-[#ce112d] whitespace-nowrap">বিকাশ:</span>
                                        <span className="text-sm font-black tracking-wider" style={{ color: 'var(--text-primary)' }}>{bKashNumber}</span>
                                        <button onClick={handleCopyNumber}
                                            className={`p-1.5 rounded-lg transition-all ${copied ? 'bg-green-500/20 text-green-500' : ''}`}
                                            style={!copied ? { backgroundColor: 'var(--bg-badge)', color: 'var(--text-muted)' } : {}}>
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                    <input type="tel" name="senderNumber" placeholder="যে নম্বর থেকে টাকা পাঠিয়েছেন সেই নম্বরটি লিখুন"
                                        value={formData.senderNumber} onChange={handleInputChange}
                                        className="w-full border rounded-xl py-2.5 px-4 text-sm focus:border-[#ce112d] outline-none transition-all"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                </div>
                            </motion.div>
                        )}

                        {/* COD free delivery message */}
                        {formData.paymentMethod === 'cod' && deliveryInfo?.charge === 0 && (
                            <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                                <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    পণ্য হাতে পেয়ে পেমেন্ট করুন। কোনো অগ্রিম দরকার নেই! ✅
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 md:px-8 md:py-5 border-t" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                        <button onClick={handleConfirmOrder} disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-[#ce112d] text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] shadow-[0_10px_40px_rgba(206,17,45,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                            {isSubmitting ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    সাবমিট হচ্ছে...
                                </div>
                            ) : (
                                <>অর্ডার কনফার্ম করুন <ShoppingBag size={18} /></>
                            )}
                        </button>
                        <button onClick={onClose} className="w-full mt-3 font-black uppercase tracking-[0.3em] text-[10px] py-2" style={{ color: 'var(--text-muted)' }}>
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DeliveryModal;
